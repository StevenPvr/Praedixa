import type {
  RedisRateLimitConfig,
  RateLimitOptions,
  RateLimitResult,
} from "./types";
import { RespConnection, toNumber, toStringValue } from "./resp";
import {
  AuthRateLimitRequirementError,
  getConfiguredRedisUrl,
  isWeakLocalRateLimitModeAllowed,
} from "./policy";

const REDIS_FAILURE_LOG_INTERVAL_MS = 60_000;
let nextRedisFailureLogAt = 0;

const REDIS_RATE_LIMIT_SCRIPT = [
  "local current = redis.call('INCR', KEYS[1])",
  "if current == 1 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "if ttl < 0 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "  ttl = tonumber(ARGV[1])",
  "end",
  "return {current, ttl}",
].join("\n");

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseRedisConfig(): RedisRateLimitConfig | null {
  const rawUrl = getConfiguredRedisUrl();
  if (!rawUrl) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    if (isWeakLocalRateLimitModeAllowed()) {
      return null;
    }
    throw new AuthRateLimitRequirementError(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must be a valid redis:// or rediss:// URL outside development",
    );
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    if (isWeakLocalRateLimitModeAllowed()) {
      return null;
    }
    throw new AuthRateLimitRequirementError(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must use redis:// or rediss:// outside development",
    );
  }

  if (!parsed.hostname) {
    if (isWeakLocalRateLimitModeAllowed()) {
      return null;
    }
    throw new AuthRateLimitRequirementError(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must include a hostname outside development",
    );
  }

  const tls = parsed.protocol === "rediss:";
  const port = Number.parseInt(parsed.port, 10) || (tls ? 6380 : 6379);

  const dbPath = parsed.pathname.replace(/^\//, "").trim();
  const db = dbPath ? Number.parseInt(dbPath, 10) : 0;
  if (!Number.isFinite(db) || db < 0) {
    if (isWeakLocalRateLimitModeAllowed()) {
      return null;
    }
    throw new AuthRateLimitRequirementError(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must reference a valid Redis database index outside development",
    );
  }

  return {
    host: parsed.hostname,
    port,
    tls,
    username: parsed.username ? decodeURIComponent(parsed.username) : null,
    password: parsed.password ? decodeURIComponent(parsed.password) : null,
    db,
    connectTimeoutMs: parsePositiveInteger(
      process.env.AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS,
      300,
    ),
    commandTimeoutMs: parsePositiveInteger(
      process.env.AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS,
      300,
    ),
    keyPrefix: process.env.AUTH_RATE_LIMIT_KEY_PREFIX?.trim() || "prx:auth:rl",
  };
}

async function openRedisConnection(
  config: RedisRateLimitConfig,
): Promise<RespConnection> {
  const netModule = await import("node:net");
  const tlsModule = await import("node:tls");

  return new Promise<RespConnection>((resolve, reject) => {
    const socket = config.tls
      ? tlsModule.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        })
      : netModule.createConnection({
          host: config.host,
          port: config.port,
        });

    socket.setNoDelay?.(true);

    const timeoutId = setTimeout(() => {
      socket.destroy();
      reject(new Error("Redis connection timeout"));
    }, config.connectTimeoutMs);

    socket.once("error", (error) => {
      clearTimeout(timeoutId);
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    socket.once("connect", () => {
      clearTimeout(timeoutId);
      resolve(new RespConnection(socket));
    });
  });
}

function buildResult(
  count: number,
  ttlMs: number,
  max: number,
  nowMs: number,
): RateLimitResult {
  const normalizedTtlMs = Math.max(1, ttlMs);
  const retryAfterSeconds = Math.max(1, Math.ceil(normalizedTtlMs / 1000));

  if (count > max) {
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil((nowMs + normalizedTtlMs) / 1000),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, max - count),
    resetAtEpochSeconds: Math.ceil((nowMs + normalizedTtlMs) / 1000),
  };
}

export async function executeRedisRateLimit(
  config: RedisRateLimitConfig,
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const connection = await openRedisConnection(config);
  try {
    if (config.password) {
      const authArgs = config.username
        ? ["AUTH", config.username, config.password]
        : ["AUTH", config.password];
      const authReply = await connection.command(
        authArgs,
        config.commandTimeoutMs,
      );
      const authStatus = toStringValue(authReply);
      if (authStatus !== "OK") {
        throw new Error("Redis AUTH failed");
      }
    }

    if (config.db > 0) {
      const selectReply = await connection.command(
        ["SELECT", config.db],
        config.commandTimeoutMs,
      );
      const selectStatus = toStringValue(selectReply);
      if (selectStatus !== "OK") {
        throw new Error("Redis SELECT failed");
      }
    }

    const reply = await connection.command(
      ["EVAL", REDIS_RATE_LIMIT_SCRIPT, 1, key, options.windowMs],
      config.commandTimeoutMs,
    );

    if (!Array.isArray(reply) || reply.length < 2) {
      throw new Error("Unexpected Redis rate limit response");
    }

    const count = toNumber(reply[0]);
    const ttlMs = toNumber(reply[1]);

    if (count == null || ttlMs == null) {
      throw new Error("Redis rate limit response contains invalid numbers");
    }

    const effectiveTtlMs = ttlMs < 0 ? options.windowMs : ttlMs;
    return buildResult(count, effectiveTtlMs, options.max, Date.now());
  } finally {
    connection.close();
  }
}

export function logRedisFailure(error: unknown): void {
  const now = Date.now();
  if (now < nextRedisFailureLogAt) {
    return;
  }

  nextRedisFailureLogAt = now + REDIS_FAILURE_LOG_INTERVAL_MS;

  const message =
    error instanceof Error ? error.message : "Unknown Redis rate limit error";
  const prefix = "[auth-rate-limit]";

  if (isWeakLocalRateLimitModeAllowed()) {
    // eslint-disable-next-line no-console
    console.warn(
      `${prefix} Redis unavailable, local in-memory limiter remains active (${message})`,
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.error(
    `${prefix} Redis unavailable; blocking auth rate-limited routes instead of degrading locally (${message})`,
  );
}

export function resetRedisRateLimitState(): void {
  nextRedisFailureLogAt = 0;
}
