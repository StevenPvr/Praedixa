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
  AuthRateLimitRequirementError,
  buildClosedRateLimitResult,
  isWeakLocalRateLimitModeAllowed,
  logRateLimitRequirementFailure,
  resetRateLimitPolicyState,
} from "./rate-limit/policy";
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
    .catch((error) => {
      if (
        isWeakLocalRateLimitModeAllowed() &&
        !(error instanceof AuthRateLimitRequirementError)
      ) {
        return `h-${hashFallbackIdentifier(rawClientKey)}`;
      }
      throw error;
    })
    .then((hashedClientKey) => `${options.scope}:${hashedClientKey}`);
}

export async function consumeRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  let scopedKey: string;
  try {
    scopedKey = await getScopedRateLimitKey(request, options);
  } catch (error) {
    logRateLimitRequirementFailure(error);
    return buildClosedRateLimitResult(options, "misconfigured");
  }

  let redisConfig: ReturnType<typeof parseRedisConfig>;
  try {
    redisConfig = parseRedisConfig();
  } catch (error) {
    logRateLimitRequirementFailure(error);
    return buildClosedRateLimitResult(options, "misconfigured");
  }

  if (redisConfig) {
    const redisKey = `${redisConfig.keyPrefix}:${scopedKey}`;
    try {
      return await executeRedisRateLimit(redisConfig, redisKey, options);
    } catch (error) {
      logRedisFailure(error);
      if (!isWeakLocalRateLimitModeAllowed()) {
        return buildClosedRateLimitResult(options, "unavailable");
      }
    }
  }

  if (!isWeakLocalRateLimitModeAllowed()) {
    logRateLimitRequirementFailure(
      new AuthRateLimitRequirementError(
        "Distributed auth rate limit is required outside development",
      ),
    );
    return buildClosedRateLimitResult(options, "misconfigured");
  }

  return consumeRateLimitInMemory(scopedKey, options);
}

export function __resetRateLimitStateForTests(): void {
  resetInMemoryRateLimitState();
  resetRedisRateLimitState();
  resetFingerprintRateLimitState();
  resetRateLimitPolicyState();
}
