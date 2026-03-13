export interface SecurityRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
  resetAtEpochSeconds: number;
}
