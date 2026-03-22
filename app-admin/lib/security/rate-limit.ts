import type { NextRequest } from "next/server";

interface RateLimitOptions {
  scope: string;
  max: number;
  windowMs: number;
  identifier?: string | null;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RedisRateLimitConfig {
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

interface PendingCommand {
  resolve: (value: RespValue) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  resetAtEpochSeconds: number;
  reason?: "rate_limited" | "misconfigured" | "unavailable";
  mode?: "development-local" | "distributed-required";
}

type RateLimitMode = NonNullable<RateLimitResult["mode"]>;

type RespValue = string | number | null | RespValue[] | Error;

const buckets = new Map<string, RateLimitBucket>();
let nextSweepAt = 0;
const MAX_RATE_LIMIT_BUCKETS = 20_000;

const REDIS_FAILURE_LOG_INTERVAL_MS = 60_000;
let nextRedisFailureLogAt = 0;
const REQUIREMENT_FAILURE_LOG_INTERVAL_MS = 60_000;
let nextRequirementFailureLogAt = 0;

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

class RespConnection {
  private readonly socket: {
    write: (chunk: Buffer, cb: (error?: Error | null) => void) => void;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
    once: (event: string, listener: (...args: unknown[]) => void) => void;
    setNoDelay?: (noDelay?: boolean) => void;
    end: () => void;
    destroy: () => void;
  };

  private buffer = Buffer.alloc(0);
  private pending: PendingCommand[] = [];

  constructor(socket: RespConnection["socket"]) {
    this.socket = socket;

    this.socket.on("data", (chunk: unknown) => {
      if (!Buffer.isBuffer(chunk) || chunk.length === 0) {
        return;
      }
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.flush();
    });

    this.socket.on("error", (error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      this.failAll(err);
    });

    this.socket.on("close", () => {
      if (this.pending.length > 0) {
        this.failAll(new Error("Redis connection closed"));
      }
    });
  }

  async command(
    args: Array<string | number>,
    timeoutMs: number,
  ): Promise<RespValue> {
    return await new Promise<RespValue>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removePending(resolve, reject);
        reject(new Error("Redis command timeout"));
      }, timeoutMs);

      this.pending.push({ resolve, reject, timeoutId });

      const payload = encodeRespArray(args);
      this.socket.write(payload, (error?: Error | null) => {
        if (!error) return;

        clearTimeout(timeoutId);
        this.removePending(resolve, reject);
        reject(error);
      });
    });
  }

  close(): void {
    try {
      this.socket.end();
    } finally {
      this.socket.destroy();
    }
  }

  private removePending(
    resolve: PendingCommand["resolve"],
    reject: PendingCommand["reject"],
  ): void {
    this.pending = this.pending.filter(
      (item) => item.resolve !== resolve || item.reject !== reject,
    );
  }

  private flush(): void {
    while (this.pending.length > 0) {
      const parsed = parseRespValue(this.buffer, 0);
      if (!parsed) {
        return;
      }

      this.buffer = this.buffer.subarray(parsed.nextOffset);
      const next = this.pending.shift();
      if (!next) {
        return;
      }

      clearTimeout(next.timeoutId);
      if (parsed.value instanceof Error) {
        next.reject(parsed.value);
      } else {
        next.resolve(parsed.value);
      }
    }
  }

  private failAll(error: Error): void {
    while (this.pending.length > 0) {
      const next = this.pending.shift();
      if (!next) continue;
      clearTimeout(next.timeoutId);
      next.reject(error);
    }
  }
}

function shouldTrustProxyIpHeaders(): boolean {
  return process.env["AUTH_TRUST_X_FORWARDED_FOR"] === "1";
}

class RateLimitRequirementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitRequirementError";
  }
}

function isWeakLocalRateLimitModeAllowed(): boolean {
  return process.env.NODE_ENV === "development";
}

function buildClosedRateLimitResult(
  options: RateLimitOptions,
): RateLimitResult {
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(options.windowMs / 1000)),
    remaining: 0,
    resetAtEpochSeconds: Math.ceil((Date.now() + options.windowMs) / 1000),
    reason: "unavailable",
    mode: isWeakLocalRateLimitModeAllowed()
      ? "development-local"
      : "distributed-required",
  };
}

function buildMisconfiguredRateLimitResult(
  options: RateLimitOptions,
): RateLimitResult {
  return {
    ...buildClosedRateLimitResult(options),
    reason: "misconfigured",
  };
}

function getConfiguredRedisUrl(): string | null {
  const rawUrl =
    process.env["AUTH_RATE_LIMIT_REDIS_URL"]?.trim() ??
    process.env["RATE_LIMIT_STORAGE_URI"]?.trim() ??
    "";

  if (rawUrl) {
    return rawUrl;
  }

  if (isWeakLocalRateLimitModeAllowed()) {
    return null;
  }

  throw new RateLimitRequirementError(
    "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI is required outside development",
  );
}

function requireRateLimitKeySalt(): string {
  const explicitSalt = process.env["AUTH_RATE_LIMIT_KEY_SALT"]?.trim();
  if (explicitSalt) {
    return explicitSalt;
  }

  if (isWeakLocalRateLimitModeAllowed()) {
    return process.env["AUTH_SESSION_SECRET"]?.trim() || "prx-rate-limit-dev";
  }

  throw new RateLimitRequirementError(
    "AUTH_RATE_LIMIT_KEY_SALT is required outside development",
  );
}

function logRequirementFailure(error: unknown): void {
  const now = Date.now();
  if (now < nextRequirementFailureLogAt) {
    return;
  }

  nextRequirementFailureLogAt = now + REQUIREMENT_FAILURE_LOG_INTERVAL_MS;
  const message =
    error instanceof Error
      ? error.message
      : "Unknown admin auth rate limit configuration error";

  if (isWeakLocalRateLimitModeAllowed()) {
    process.emitWarning(`[admin-auth-rate-limit] ${message}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`[admin-auth-rate-limit] ${message}`);
}

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

interface RespParseResult {
  value: RespValue;
  nextOffset: number;
}

function buildRespParseResult(
  value: RespValue,
  nextOffset: number,
): RespParseResult {
  return { value, nextOffset };
}

function parseRespPrefix(
  buffer: Buffer,
  offset: number,
): { prefix: string; lineEnd: number } | null {
  if (offset >= buffer.length) {
    return null;
  }

  const prefixByte = buffer[offset];
  if (prefixByte === undefined) {
    return null;
  }

  const lineEnd = findCrlf(buffer, offset + 1);
  if (lineEnd === -1) {
    return null;
  }

  return {
    prefix: String.fromCodePoint(prefixByte),
    lineEnd,
  };
}

function parseRespSimpleString(
  buffer: Buffer,
  offset: number,
  lineEnd: number,
): RespParseResult {
  return buildRespParseResult(
    buffer.subarray(offset + 1, lineEnd).toString("utf8"),
    lineEnd + 2,
  );
}

function parseRespError(
  buffer: Buffer,
  offset: number,
  lineEnd: number,
): RespParseResult {
  return buildRespParseResult(
    new Error(buffer.subarray(offset + 1, lineEnd).toString("utf8")),
    lineEnd + 2,
  );
}

function parseRespIntegerValue(
  buffer: Buffer,
  offset: number,
  lineEnd: number,
): RespParseResult {
  const raw = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return buildRespParseResult(
      new Error(`Invalid Redis integer response: ${raw}`),
      lineEnd + 2,
    );
  }

  return buildRespParseResult(parsed, lineEnd + 2);
}

function parseRespBulkString(
  buffer: Buffer,
  offset: number,
  lineEnd: number,
): RespParseResult | null {
  const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const byteLength = Number.parseInt(rawLength, 10);
  if (!Number.isFinite(byteLength)) {
    return buildRespParseResult(
      new Error(`Invalid Redis bulk length: ${rawLength}`),
      lineEnd + 2,
    );
  }

  if (byteLength === -1) {
    return buildRespParseResult(null, lineEnd + 2);
  }

  const valueStart = lineEnd + 2;
  const valueEnd = valueStart + byteLength;
  if (valueEnd + 2 > buffer.length) {
    return null;
  }

  return buildRespParseResult(
    buffer.subarray(valueStart, valueEnd).toString("utf8"),
    valueEnd + 2,
  );
}

function parseRespArray(
  buffer: Buffer,
  offset: number,
  lineEnd: number,
): RespParseResult | null {
  const rawLength = buffer.subarray(offset + 1, lineEnd).toString("utf8");
  const elementCount = Number.parseInt(rawLength, 10);
  if (!Number.isFinite(elementCount)) {
    return buildRespParseResult(
      new Error(`Invalid Redis array length: ${rawLength}`),
      lineEnd + 2,
    );
  }

  if (elementCount === -1) {
    return buildRespParseResult(null, lineEnd + 2);
  }

  let cursor = lineEnd + 2;
  const result: RespValue[] = [];
  for (let index = 0; index < elementCount; index += 1) {
    const nested = parseRespValue(buffer, cursor);
    if (!nested) {
      return null;
    }
    result.push(nested.value);
    cursor = nested.nextOffset;
  }

  return buildRespParseResult(result, cursor);
}

function parseRespValue(
  buffer: Buffer,
  offset: number,
): RespParseResult | null {
  const parsedPrefix = parseRespPrefix(buffer, offset);
  if (!parsedPrefix) {
    return null;
  }

  const { prefix, lineEnd } = parsedPrefix;

  switch (prefix) {
    case "+":
      return parseRespSimpleString(buffer, offset, lineEnd);
    case "-":
      return parseRespError(buffer, offset, lineEnd);
    case ":":
      return parseRespIntegerValue(buffer, offset, lineEnd);
    case "$":
      return parseRespBulkString(buffer, offset, lineEnd);
    case "*":
      return parseRespArray(buffer, offset, lineEnd);
    default:
      return buildRespParseResult(
        new Error(`Unsupported Redis response prefix: ${prefix}`),
        lineEnd + 2,
      );
  }
}

function findCrlf(buffer: Buffer, start: number): number {
  for (let index = start; index < buffer.length - 1; index += 1) {
    if (buffer[index] === 13 && buffer[index + 1] === 10) {
      return index;
    }
  }
  return -1;
}

function encodeRespArray(args: Array<string | number>): Buffer {
  const parts: string[] = [`*${args.length}\r\n`];

  for (const arg of args) {
    const value = String(arg);
    parts.push(`$${Buffer.byteLength(value, "utf8")}\r\n${value}\r\n`);
  }

  return Buffer.from(parts.join(""), "utf8");
}

function rejectInvalidRedisConfig(message: string): null {
  if (isWeakLocalRateLimitModeAllowed()) {
    return null;
  }

  throw new RateLimitRequirementError(message);
}

function parseRedisUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return rejectInvalidRedisConfig(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must be a valid redis:// or rediss:// URL outside development",
    );
  }
}

function validateRedisUrl(parsed: URL): URL | null {
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    return rejectInvalidRedisConfig(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must use redis:// or rediss:// outside development",
    );
  }

  if (!parsed.hostname) {
    return rejectInvalidRedisConfig(
      "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must include a hostname outside development",
    );
  }

  return parsed;
}

function parseRedisDbIndex(parsed: URL): number | null {
  const dbPath = parsed.pathname.replaceAll(/^\//g, "").trim();
  const db = dbPath ? Number.parseInt(dbPath, 10) : 0;
  if (Number.isFinite(db) && db >= 0) {
    return db;
  }

  return rejectInvalidRedisConfig(
    "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI must reference a valid Redis database index outside development",
  );
}

function buildRedisRateLimitConfig(
  parsed: URL,
  db: number,
): RedisRateLimitConfig {
  const tls = parsed.protocol === "rediss:";

  return {
    host: parsed.hostname,
    port: Number.parseInt(parsed.port, 10) || (tls ? 6380 : 6379),
    tls,
    username: parsed.username ? decodeURIComponent(parsed.username) : null,
    password: parsed.password ? decodeURIComponent(parsed.password) : null,
    db,
    connectTimeoutMs: parsePositiveInteger(
      process.env["AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS"],
      300,
    ),
    commandTimeoutMs: parsePositiveInteger(
      process.env["AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS"],
      300,
    ),
    keyPrefix:
      process.env["AUTH_RATE_LIMIT_KEY_PREFIX"]?.trim() || "prx:auth:rl",
  };
}

function parseRedisConfig(): RedisRateLimitConfig | null {
  const rawUrl = getConfiguredRedisUrl();
  if (!rawUrl) {
    return null;
  }

  const parsed = parseRedisUrl(rawUrl);
  if (!parsed) {
    return null;
  }

  const validated = validateRedisUrl(parsed);
  if (!validated) {
    return null;
  }

  const db = parseRedisDbIndex(validated);
  if (db === null) {
    return null;
  }

  return buildRedisRateLimitConfig(validated, db);
}

async function openRedisConnection(
  config: RedisRateLimitConfig,
): Promise<RespConnection> {
  const netModule = await import("node:net");
  const tlsModule = await import("node:tls");

  return await new Promise<RespConnection>((resolve, reject) => {
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

function toNumber(value: RespValue): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: RespValue): string | null {
  return typeof value === "string" ? value : null;
}

function buildResult(
  count: number,
  ttlMs: number,
  max: number,
  nowMs: number,
  mode?: RateLimitMode,
): RateLimitResult {
  const normalizedTtlMs = Math.max(1, ttlMs);
  const retryAfterSeconds = Math.max(1, Math.ceil(normalizedTtlMs / 1000));

  if (count > max) {
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil((nowMs + normalizedTtlMs) / 1000),
      ...(mode ? { mode } : {}),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, max - count),
    resetAtEpochSeconds: Math.ceil((nowMs + normalizedTtlMs) / 1000),
    ...(mode ? { mode } : {}),
  };
}

function hashString(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ (value.codePointAt(index) ?? 0);
  }
  return (hash >>> 0).toString(36);
}

async function hashIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${requireRateLimitKeySalt()}:${value}`),
  );

  const bytes = new Uint8Array(digest);
  let hex = "";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }

  return hex.slice(0, 32);
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replaceAll(/^"+|"+$/g, "");
  if (!trimmed || trimmed.length > 64) return null;

  let candidate = trimmed;
  if (candidate.includes(".") && candidate.includes(":")) {
    const [host, port] = candidate.split(":");
    if (host && port && /^\d+$/.test(port)) {
      candidate = host;
    }
  }

  if (!/^[0-9A-Fa-f:.]+$/.test(candidate)) {
    return null;
  }

  return candidate.toLowerCase();
}

function getForwardedForClientIp(forwardedFor: string | null): string | null {
  if (!forwardedFor) {
    return null;
  }

  for (const entry of forwardedFor.split(",")) {
    const parsed = normalizeIp(entry);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function getTrustedProxyClientIp(
  headers: NextRequest["headers"],
): string | null {
  if (shouldTrustProxyIpHeaders() === false) {
    return null;
  }

  const cfIp = normalizeIp(headers.get("cf-connecting-ip"));
  if (cfIp) {
    return cfIp;
  }

  const realIp = normalizeIp(headers.get("x-real-ip"));
  if (realIp) {
    return realIp;
  }

  return getForwardedForClientIp(headers.get("x-forwarded-for"));
}

function buildUserAgentClientKey(headers: NextRequest["headers"]): string {
  const userAgent = headers.get("user-agent") ?? "unknown";
  return `ua:${hashString(userAgent)}`;
}

function getRawClientKey(request: NextRequest): string {
  const headers = request.headers;
  if (typeof headers.get !== "function") {
    return "unknown";
  }

  const trustedProxyIp = getTrustedProxyClientIp(headers);
  if (trustedProxyIp) {
    return trustedProxyIp;
  }

  return buildUserAgentClientKey(headers);
}

function sweepExpiredBuckets(now: number): void {
  if (now < nextSweepAt) return;

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  nextSweepAt = now + 60_000;
}

function pruneBucketsIfNeeded(): void {
  if (buckets.size <= MAX_RATE_LIMIT_BUCKETS) return;

  const toDrop =
    buckets.size -
    MAX_RATE_LIMIT_BUCKETS +
    Math.ceil(MAX_RATE_LIMIT_BUCKETS * 0.05);
  const entries = [...buckets.entries()].sort(
    (left, right) => left[1].resetAt - right[1].resetAt,
  );

  for (let index = 0; index < toDrop && index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) {
      continue;
    }
    buckets.delete(entry[0]);
  }
}

function consumeRateLimitInMemory(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  sweepExpiredBuckets(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, {
      count: 1,
      resetAt,
    });
    pruneBucketsIfNeeded();

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, options.max - 1),
      resetAtEpochSeconds: Math.ceil(resetAt / 1000),
      mode: "development-local",
    };
  }

  if (existing.count >= options.max) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
      remaining: 0,
      resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
      mode: "development-local",
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, options.max - existing.count),
    resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
    mode: "development-local",
  };
}

function logRedisFailure(error: unknown): void {
  const now = Date.now();
  if (now < nextRedisFailureLogAt) {
    return;
  }

  nextRedisFailureLogAt = now + REDIS_FAILURE_LOG_INTERVAL_MS;

  const message =
    error instanceof Error ? error.message : "Unknown Redis rate limit error";

  if (isWeakLocalRateLimitModeAllowed()) {
    process.emitWarning(
      `[admin-auth-rate-limit] Redis unavailable, local in-memory limiter remains active (${message})`,
    );
    return;
  }

  // eslint-disable-next-line no-console
  console.error(
    `[admin-auth-rate-limit] Redis unavailable; blocking auth rate-limited routes instead of degrading locally (${message})`,
  );
}

async function executeRedisRateLimit(
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

    const countValue = reply[0];
    const ttlValue = reply[1];
    if (countValue === undefined || ttlValue === undefined) {
      throw new Error("Unexpected Redis rate limit response");
    }

    const count = toNumber(countValue);
    const ttlMs = toNumber(ttlValue);

    if (count == null || ttlMs == null) {
      throw new Error("Redis rate limit response contains invalid numbers");
    }

    const effectiveTtlMs = ttlMs < 0 ? options.windowMs : ttlMs;
    return buildResult(
      count,
      effectiveTtlMs,
      options.max,
      Date.now(),
      "distributed-required",
    );
  } finally {
    connection.close();
  }
}

export async function consumeRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const overrideIdentifier = options.identifier?.trim();
  const rawClientKey =
    overrideIdentifier && overrideIdentifier.length > 0
      ? overrideIdentifier
      : getRawClientKey(request);

  try {
    const hashedClientKey = await hashIdentifier(rawClientKey);
    const scopedKey = `${options.scope}:${hashedClientKey}`;
    const redisConfig = parseRedisConfig();

    if (redisConfig) {
      const redisKey = `${redisConfig.keyPrefix}:${scopedKey}`;
      try {
        return await executeRedisRateLimit(redisConfig, redisKey, options);
      } catch (error) {
        logRedisFailure(error);
        if (!isWeakLocalRateLimitModeAllowed()) {
          return buildClosedRateLimitResult(options);
        }
      }
    }

    if (!isWeakLocalRateLimitModeAllowed()) {
      logRequirementFailure(
        new RateLimitRequirementError(
          "Distributed auth rate limit is required outside development",
        ),
      );
      return buildMisconfiguredRateLimitResult(options);
    }

    return consumeRateLimitInMemory(scopedKey, options);
  } catch (error) {
    if (isWeakLocalRateLimitModeAllowed()) {
      const scopedKey = `${options.scope}:h-${hashString(rawClientKey)}`;
      if (!(error instanceof RateLimitRequirementError)) {
        return consumeRateLimitInMemory(scopedKey, options);
      }
    }

    logRequirementFailure(error);
    return buildMisconfiguredRateLimitResult(options);
  }
}

export function __resetRateLimitStateForTests(): void {
  buckets.clear();
  nextSweepAt = 0;
  nextRedisFailureLogAt = 0;
  nextRequirementFailureLogAt = 0;
}
