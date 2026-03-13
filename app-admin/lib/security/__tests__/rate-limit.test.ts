import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetRateLimitStateForTests, consumeRateLimit } from "../rate-limit";

type MockRequest = Parameters<typeof consumeRateLimit>[0];

function createRequest(headers: Record<string, string> = {}): MockRequest {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as MockRequest;
}

describe("admin auth rate limiting", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    __resetRateLimitStateForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetRateLimitStateForTests();
  });

  it("keeps the local in-memory limiter in development", async () => {
    const request = createRequest({
      "user-agent": "admin-agent",
    });

    const first = await consumeRateLimit(request, {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });
    const second = await consumeRateLimit(request, {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.reason).toBeUndefined();
    expect(first.mode).toBe("development-local");
  });

  it("fails closed outside development when the Redis config is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_RATE_LIMIT_KEY_SALT", "admin-auth-rate-limit-salt");

    const rate = await consumeRateLimit(createRequest(), {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });

    expect(rate.allowed).toBe(false);
    expect(rate.reason).toBe("misconfigured");
    expect(rate.mode).toBe("distributed-required");
  });

  it("fails closed outside development when the explicit salt is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_RATE_LIMIT_REDIS_URL", "redis://127.0.0.1:6379/0");

    const rate = await consumeRateLimit(createRequest(), {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });

    expect(rate.allowed).toBe(false);
    expect(rate.reason).toBe("misconfigured");
    expect(rate.mode).toBe("distributed-required");
  });

  it("fails closed outside development when Redis is unreachable", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_RATE_LIMIT_KEY_SALT", "admin-auth-rate-limit-salt");
    vi.stubEnv("AUTH_RATE_LIMIT_REDIS_URL", "redis://127.0.0.1:1/0");
    vi.stubEnv("AUTH_RATE_LIMIT_REDIS_CONNECT_TIMEOUT_MS", "10");
    vi.stubEnv("AUTH_RATE_LIMIT_REDIS_COMMAND_TIMEOUT_MS", "10");

    const rate = await consumeRateLimit(createRequest(), {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });

    expect(rate.allowed).toBe(false);
    expect(rate.reason).toBe("unavailable");
    expect(rate.mode).toBe("distributed-required");
  });
});
