import type { RateLimitOptions, RateLimitResult } from "./types";

const REQUIREMENT_FAILURE_LOG_INTERVAL_MS = 60_000;
let nextRequirementFailureLogAt = 0;

export class AuthRateLimitRequirementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthRateLimitRequirementError";
  }
}

export function isWeakLocalRateLimitModeAllowed(): boolean {
  return (
    process.env["NODE_ENV"] === "development" ||
    process.env["NODE_ENV"] === "test"
  );
}

export function buildClosedRateLimitResult(
  options: Pick<RateLimitOptions, "windowMs">,
  reason: Extract<RateLimitResult["reason"], "misconfigured" | "unavailable">,
): RateLimitResult {
  const retryAfterSeconds = Math.max(1, Math.ceil(options.windowMs / 1000));

  return {
    allowed: false,
    retryAfterSeconds,
    remaining: 0,
    resetAtEpochSeconds: Math.ceil((Date.now() + options.windowMs) / 1000),
    mode: isWeakLocalRateLimitModeAllowed()
      ? "development-local"
      : "distributed-required",
    reason,
  };
}

export function requireRateLimitKeySalt(): string {
  const explicitSalt = process.env["AUTH_RATE_LIMIT_KEY_SALT"]?.trim();
  if (explicitSalt) {
    return explicitSalt;
  }

  if (isWeakLocalRateLimitModeAllowed()) {
    return process.env["AUTH_SESSION_SECRET"]?.trim() || "prx-rate-limit-dev";
  }

  throw new AuthRateLimitRequirementError(
    "AUTH_RATE_LIMIT_KEY_SALT is required outside development/test",
  );
}

export function getConfiguredRedisUrl(): string | null {
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

  throw new AuthRateLimitRequirementError(
    "AUTH_RATE_LIMIT_REDIS_URL or RATE_LIMIT_STORAGE_URI is required outside development/test",
  );
}

export function logRateLimitRequirementFailure(error: unknown): void {
  const now = Date.now();
  if (now < nextRequirementFailureLogAt) {
    return;
  }

  nextRequirementFailureLogAt = now + REQUIREMENT_FAILURE_LOG_INTERVAL_MS;
  const message =
    error instanceof Error
      ? error.message
      : "Unknown auth rate limit configuration error";
  const prefix = "[auth-rate-limit]";

  if (isWeakLocalRateLimitModeAllowed()) {
    // eslint-disable-next-line no-console
    console.warn(`${prefix} ${message}`);
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`${prefix} ${message}`);
}

export function resetRateLimitPolicyState(): void {
  nextRequirementFailureLogAt = 0;
}
