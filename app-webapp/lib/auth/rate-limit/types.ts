export interface RateLimitOptions {
  scope: string;
  max: number;
  windowMs: number;
  identifier?: string | null;
}

export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RedisRateLimitConfig {
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

export interface PendingCommand {
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

export type RespValue = string | number | null | RespValue[] | Error;
