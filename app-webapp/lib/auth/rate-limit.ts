import type { NextRequest } from "next/server";
import {
  getRawClientKey,
  hashFallbackIdentifier,
  hashIdentifier,
  resetFingerprintRateLimitState,
} from "./rate-limit/fingerprint";
import {
  consumeRateLimitInMemory,
  resetInMemoryRateLimitState,
} from "./rate-limit/memory";
import {
  executeRedisRateLimit,
  logRedisFailure,
  parseRedisConfig,
  resetRedisRateLimitState,
} from "./rate-limit/redis";
import type { RateLimitOptions, RateLimitResult } from "./rate-limit/types";

export type { RateLimitResult };

function getScopedRateLimitKey(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<string> {
  const overrideIdentifier = options.identifier?.trim();
  const rawClientKey =
    overrideIdentifier && overrideIdentifier.length > 0
      ? overrideIdentifier
      : getRawClientKey(request);

  return hashIdentifier(rawClientKey)
    .catch(() => `h-${hashFallbackIdentifier(rawClientKey)}`)
    .then((hashedClientKey) => `${options.scope}:${hashedClientKey}`);
}

export async function consumeRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const scopedKey = await getScopedRateLimitKey(request, options);
  const redisConfig = parseRedisConfig();

  if (redisConfig) {
    const redisKey = `${redisConfig.keyPrefix}:${scopedKey}`;
    try {
      return await executeRedisRateLimit(redisConfig, redisKey, options);
    } catch (error) {
      logRedisFailure(error);
    }
  }

  return consumeRateLimitInMemory(scopedKey, options);
}

export function __resetRateLimitStateForTests(): void {
  resetInMemoryRateLimitState();
  resetRedisRateLimitState();
  resetFingerprintRateLimitState();
}
