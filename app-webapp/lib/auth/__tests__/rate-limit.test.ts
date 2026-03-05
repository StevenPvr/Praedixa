import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetRateLimitStateForTests,
  consumeRateLimit,
} from "../rate-limit";

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
});
