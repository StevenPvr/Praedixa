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

describe("auth rate limiting", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
    __resetRateLimitStateForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    __resetRateLimitStateForTests();
  });

  it("prioritizes cf-connecting-ip over forwarded headers", async () => {
    vi.stubEnv("AUTH_TRUST_X_FORWARDED_FOR", "1");
    const request = createRequest({
      "cf-connecting-ip": "198.51.100.10",
      "x-forwarded-for": "203.0.113.33",
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
  });

  it("ignores x-forwarded-for by default when proxy trust is disabled", async () => {
    const first = await consumeRateLimit(
      createRequest({
        "x-forwarded-for": "203.0.113.10",
        "user-agent": "agent-a",
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );
    const second = await consumeRateLimit(
      createRequest({
        "x-forwarded-for": "203.0.113.11",
        "user-agent": "agent-a",
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("ignores x-real-ip by default when proxy trust is disabled", async () => {
    const first = await consumeRateLimit(
      createRequest({
        "x-real-ip": "203.0.113.10",
        "user-agent": "agent-b",
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );
    const second = await consumeRateLimit(
      createRequest({
        "x-real-ip": "203.0.113.11",
        "user-agent": "agent-b",
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
  });

  it("trusts x-forwarded-for when explicitly enabled", async () => {
    vi.stubEnv("AUTH_TRUST_X_FORWARDED_FOR", "1");

    const first = await consumeRateLimit(
      createRequest({ "x-forwarded-for": "203.0.113.10" }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );
    const second = await consumeRateLimit(
      createRequest({ "x-forwarded-for": "203.0.113.11" }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("trusts x-real-ip when explicitly enabled", async () => {
    vi.stubEnv("AUTH_TRUST_X_FORWARDED_FOR", "1");

    const first = await consumeRateLimit(
      createRequest({ "x-real-ip": "203.0.113.10" }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );
    const second = await consumeRateLimit(
      createRequest({ "x-real-ip": "203.0.113.11" }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("uses explicit identifier when provided", async () => {
    const request = createRequest({
      "user-agent": "same-agent",
    });

    const sessionAFirst = await consumeRateLimit(request, {
      scope: "auth:session",
      max: 1,
      windowMs: 60_000,
      identifier: "session-a",
    });
    const sessionBFirst = await consumeRateLimit(request, {
      scope: "auth:session",
      max: 1,
      windowMs: 60_000,
      identifier: "session-b",
    });
    const sessionASecond = await consumeRateLimit(request, {
      scope: "auth:session",
      max: 1,
      windowMs: 60_000,
      identifier: "session-a",
    });

    expect(sessionAFirst.allowed).toBe(true);
    expect(sessionBFirst.allowed).toBe(true);
    expect(sessionASecond.allowed).toBe(false);
  });

  it("uses a richer fallback fingerprint than user-agent alone when proxy trust is disabled", async () => {
    const first = await consumeRateLimit(
      createRequest({
        "user-agent": "same-agent",
        "accept-language": "fr-FR,fr;q=0.9",
        accept: "application/json",
        "sec-ch-ua": '"Chromium";v="122"',
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );
    const second = await consumeRateLimit(
      createRequest({
        "user-agent": "same-agent",
        "accept-language": "en-US,en;q=0.9",
        accept: "application/json",
        "sec-ch-ua": '"Chromium";v="122"',
      }),
      {
        scope: "auth:login",
        max: 1,
        windowMs: 60_000,
      },
    );

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("fails closed outside development when the distributed Redis config is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_RATE_LIMIT_KEY_SALT", "prod-auth-rate-limit-salt");

    const rate = await consumeRateLimit(createRequest(), {
      scope: "auth:login",
      max: 1,
      windowMs: 60_000,
    });

    expect(rate.allowed).toBe(false);
    expect(rate.reason).toBe("misconfigured");
    expect(rate.mode).toBe("distributed-required");
  });

  it("fails closed outside development when the explicit key salt is missing", async () => {
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
    vi.stubEnv("AUTH_RATE_LIMIT_KEY_SALT", "prod-auth-rate-limit-salt");
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
