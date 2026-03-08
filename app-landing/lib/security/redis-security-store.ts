import {
  RespConnection,
  openRedisConnection,
  toNumber,
  toStringValue,
} from "./redis-protocol";
import type { SecurityRateLimitResult } from "./security-store";

const DEFAULT_REDIS_CONNECT_TIMEOUT_MS = 300;
const DEFAULT_REDIS_COMMAND_TIMEOUT_MS = 300;
const DEFAULT_REDIS_KEY_PREFIX = "prx:landing:sec";

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

export interface RedisSecurityConfig {
  host: string;
  port: number;
  tls: boolean;
  username: string | null;
  password: string | null;
  db: number;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
  keyPrefix: string;
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function readRedisSecurityConfig(): RedisSecurityConfig | null {
  const rawUrl = process.env.RATE_LIMIT_STORAGE_URI?.trim() ?? "";
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    return null;
  }

  if (!parsed.hostname) {
    return null;
  }

  const tls = parsed.protocol === "rediss:";
  const port = Number.parseInt(parsed.port, 10) || (tls ? 6380 : 6379);
  const dbPath = parsed.pathname.replace(/^\//, "").trim();
  const db = dbPath ? Number.parseInt(dbPath, 10) : 0;
  if (!Number.isFinite(db) || db < 0) {
    return null;
  }

  return {
    host: parsed.hostname,
    port,
    tls,
    username: parsed.username ? decodeURIComponent(parsed.username) : null,
    password: parsed.password ? decodeURIComponent(parsed.password) : null,
    db,
    connectTimeoutMs: parsePositiveInteger(
      process.env.LANDING_SECURITY_REDIS_CONNECT_TIMEOUT_MS,
      DEFAULT_REDIS_CONNECT_TIMEOUT_MS,
    ),
    commandTimeoutMs: parsePositiveInteger(
      process.env.LANDING_SECURITY_REDIS_COMMAND_TIMEOUT_MS,
      DEFAULT_REDIS_COMMAND_TIMEOUT_MS,
    ),
    keyPrefix:
      process.env.LANDING_SECURITY_KEY_PREFIX?.trim() || DEFAULT_REDIS_KEY_PREFIX,
  };
}

async function authenticateConnection(
  connection: RespConnection,
  config: RedisSecurityConfig,
): Promise<void> {
  if (config.password) {
    const authArgs = config.username
      ? ["AUTH", config.username, config.password]
      : ["AUTH", config.password];
    const authReply = await connection.command(authArgs, config.commandTimeoutMs);
    if (toStringValue(authReply) !== "OK") {
      throw new Error("Redis AUTH failed");
    }
  }

  if (config.db <= 0) {
    return;
  }

  const selectReply = await connection.command(
    ["SELECT", config.db],
    config.commandTimeoutMs,
  );
  if (toStringValue(selectReply) !== "OK") {
    throw new Error("Redis SELECT failed");
  }
}

function buildRateLimitResult(
  count: number,
  ttlMs: number,
  max: number,
): SecurityRateLimitResult {
  const normalizedTtlMs = Math.max(1, ttlMs);
  const retryAfterSeconds = Math.max(1, Math.ceil(normalizedTtlMs / 1000));
  const resetAtEpochSeconds = Math.ceil((Date.now() + normalizedTtlMs) / 1000);

  if (count > max) {
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      resetAtEpochSeconds,
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, max - count),
    resetAtEpochSeconds,
  };
}

async function withRedisConnection<T>(
  config: RedisSecurityConfig,
  run: (connection: RespConnection) => Promise<T>,
): Promise<T> {
  const connection = await openRedisConnection(config);
  try {
    await authenticateConnection(connection, config);
    return await run(connection);
  } finally {
    connection.close();
  }
}

export class RedisSecurityStore {
  constructor(private readonly config: RedisSecurityConfig) {}

  async consumeRateLimit(input: {
    key: string;
    max: number;
    windowMs: number;
  }): Promise<SecurityRateLimitResult> {
    return withRedisConnection(this.config, async (connection) => {
      const reply = await connection.command(
        [
          "EVAL",
          REDIS_RATE_LIMIT_SCRIPT,
          1,
          `${this.config.keyPrefix}:rl:${input.key}`,
          input.windowMs,
        ],
        this.config.commandTimeoutMs,
      );

      if (!Array.isArray(reply) || reply.length < 2) {
        throw new Error("Unexpected Redis rate limit response");
      }

      const count = toNumber(reply[0] ?? null);
      const ttlMs = toNumber(reply[1] ?? null);
      if (count == null || ttlMs == null) {
        throw new Error("Redis rate limit response contains invalid numbers");
      }

      return buildRateLimitResult(
        count,
        ttlMs < 0 ? input.windowMs : ttlMs,
        input.max,
      );
    });
  }

  async claimOneTimeKey(input: {
    key: string;
    ttlMs: number;
  }): Promise<boolean> {
    return withRedisConnection(this.config, async (connection) => {
      const reply = await connection.command(
        [
          "SET",
          `${this.config.keyPrefix}:once:${input.key}`,
          "1",
          "PX",
          input.ttlMs,
          "NX",
        ],
        this.config.commandTimeoutMs,
      );

      return toStringValue(reply) === "OK";
    });
  }
}
