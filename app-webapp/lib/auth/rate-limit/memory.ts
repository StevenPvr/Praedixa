import type {
  RateLimitBucket,
  RateLimitOptions,
  RateLimitResult,
} from "./types";

const buckets = new Map<string, RateLimitBucket>();
let nextSweepAt = 0;
const MAX_RATE_LIMIT_BUCKETS = 20_000;

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
    (a, b) => a[1].resetAt - b[1].resetAt,
  );

  for (let i = 0; i < toDrop && i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry) {
      continue;
    }
    buckets.delete(entry[0]);
  }
}

export function consumeRateLimitInMemory(
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
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, options.max - existing.count),
    resetAtEpochSeconds: Math.ceil(existing.resetAt / 1000),
  };
}

export function resetInMemoryRateLimitState(): void {
  buckets.clear();
  nextSweepAt = 0;
}
