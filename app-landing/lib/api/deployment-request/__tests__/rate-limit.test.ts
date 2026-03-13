import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp } from "../rate-limit";

describe("getClientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores forwarded headers by default", () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("https://www.praedixa.com/api/contact", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("unknown");
  });

  it("ignores x-forwarded-for in production unless explicitly trusted", () => {
    vi.stubEnv("NODE_ENV", "production");

    const request = new Request("https://www.praedixa.com/api/contact", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("unknown");
  });

  it("trusts proxy headers only when explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LANDING_TRUST_PROXY_IP_HEADERS", "1");

    const request = new Request("https://www.praedixa.com/api/contact", {
      headers: {
        "cf-connecting-ip": "203.0.113.15",
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("203.0.113.15");
  });

  it("prefers x-forwarded-for over x-real-ip when proxy trust is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LANDING_TRUST_PROXY_IP_HEADERS", "1");

    const request = new Request("https://www.praedixa.com/api/contact", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
        "x-real-ip": "203.0.113.44",
      },
    });

    expect(getClientIp(request)).toBe("198.51.100.7");
  });
});
