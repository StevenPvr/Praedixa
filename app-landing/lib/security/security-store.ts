import { createHash } from "node:crypto";
import { getClientIp } from "../api/pilot-application/rate-limit";
import {
  RedisSecurityStore,
  readRedisSecurityConfig,
} from "./redis-security-store";

interface ConsumeRateLimitInput {
  key: string;
  max: number;
  windowMs: number;
}

interface ClaimOneTimeKeyInput {
  key: string;
  ttlMs: number;
}

interface RateLimitBucket {
  count: number;
  expiresAt: number;
}

interface SecurityStore {
  consumeRateLimit(
    input: ConsumeRateLimitInput,
  ): Promise<SecurityRateLimitResult>;
  claimOneTimeKey(input: ClaimOneTimeKeyInput): Promise<boolean>;
}

export interface SecurityRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  resetAtEpochSeconds: number;
}

export class SecurityStoreUnavailableError extends Error {
  constructor() {
    super("Shared security store is not configured");
    this.name = "SecurityStoreUnavailableError";
  }
}

const memoryRateLimitBuckets = new Map<string, RateLimitBucket>();
const memoryOneTimeKeys = new Map<string, number>();
let nextRedisFailureLogAt = 0;

const REDIS_FAILURE_LOG_INTERVAL_MS = 60_000;

function hashKey(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function cleanupExpiredMemoryEntries(now: number): void {
  for (const [key, entry] of memoryRateLimitBuckets.entries()) {
    if (entry.expiresAt <= now) {
      memoryRateLimitBuckets.delete(key);
    }
  }

  for (const [key, expiresAt] of memoryOneTimeKeys.entries()) {
    if (expiresAt <= now) {
      memoryOneTimeKeys.delete(key);
    }
  }
}

function buildRateLimitResult(
  count: number,
  expiresAt: number,
  max: number,
  now: number,
): SecurityRateLimitResult {
  const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));

  if (count > max) {
    return {
      allowed: false,
      retryAfterSeconds,
      remaining: 0,
      resetAtEpochSeconds: Math.ceil(expiresAt / 1000),
    };
  }

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, max - count),
    resetAtEpochSeconds: Math.ceil(expiresAt / 1000),
  };
}

function logRedisFailure(error: unknown): void {
  const now = Date.now();
  if (now < nextRedisFailureLogAt) {
    return;
  }

  nextRedisFailureLogAt = now + REDIS_FAILURE_LOG_INTERVAL_MS;
  const message =
    error instanceof Error ? error.message : "Unknown Redis security store error";

  // eslint-disable-next-line no-console
  console.warn(`[landing-security] redis_unavailable ${message}`);
}

class MemorySecurityStore implements SecurityStore {
  async consumeRateLimit({
    key,
    max,
    windowMs,
  }: ConsumeRateLimitInput): Promise<SecurityRateLimitResult> {
    const now = Date.now();
    cleanupExpiredMemoryEntries(now);

    const existing = memoryRateLimitBuckets.get(key);
    if (!existing || existing.expiresAt <= now) {
      const expiresAt = now + windowMs;
      memoryRateLimitBuckets.set(key, { count: 1, expiresAt });
      return buildRateLimitResult(1, expiresAt, max, now);
    }

    existing.count += 1;
    memoryRateLimitBuckets.set(key, existing);
    return buildRateLimitResult(existing.count, existing.expiresAt, max, now);
  }

  async claimOneTimeKey({ key, ttlMs }: ClaimOneTimeKeyInput): Promise<boolean> {
    const now = Date.now();
    cleanupExpiredMemoryEntries(now);

    const existing = memoryOneTimeKeys.get(key);
    if (existing && existing > now) {
      return false;
    }

    memoryOneTimeKeys.set(key, now + ttlMs);
    return true;
  }
}

const memorySecurityStore = new MemorySecurityStore();

function canUseMemoryFallback(): boolean {
  return process.env.NODE_ENV !== "production";
}

function resolveClientIdentifier(
  request: Request,
  explicitIdentifier?: string | null,
): string {
  const safeIdentifier = explicitIdentifier?.trim();
  if (safeIdentifier) {
    return safeIdentifier;
  }

  const ip = getClientIp(request);
  if (ip !== "unknown") {
    return `ip:${ip}`;
  }

  const userAgent = request.headers.get("user-agent")?.trim().slice(0, 200);
  return `ua:${userAgent || "unknown"}`;
}

function resolveSecurityStore(): SecurityStore {
  const redisConfig = readRedisSecurityConfig();
  if (redisConfig) {
    return new RedisSecurityStore(redisConfig);
  }

  if (canUseMemoryFallback()) {
    return memorySecurityStore;
  }

  throw new SecurityStoreUnavailableError();
}

async function runSecurityStoreAction<T>(
  action: (store: SecurityStore) => Promise<T>,
): Promise<T> {
  try {
    return await action(resolveSecurityStore());
  } catch (error) {
    if (error instanceof SecurityStoreUnavailableError) {
      throw error;
    }

    logRedisFailure(error);
    throw new SecurityStoreUnavailableError();
  }
}

export async function consumeSecurityRateLimit(
  request: Request,
  {
    scope,
    max,
    windowMs,
    identifier,
  }: {
    scope: string;
    max: number;
    windowMs: number;
    identifier?: string | null;
  },
): Promise<SecurityRateLimitResult> {
  const key = hashKey(`${scope}:${resolveClientIdentifier(request, identifier)}`);

  return runSecurityStoreAction((store) =>
    store.consumeRateLimit({ key, max, windowMs }),
  );
}

export async function claimSingleUseToken(
  namespace: string,
  token: string,
  ttlMs: number,
): Promise<boolean> {
  const key = hashKey(`${namespace}:${token}`);

  return runSecurityStoreAction((store) =>
    store.claimOneTimeKey({ key, ttlMs }),
  );
}

export function __resetSecurityStoreStateForTests(): void {
  memoryRateLimitBuckets.clear();
  memoryOneTimeKeys.clear();
  nextRedisFailureLogAt = 0;
}
