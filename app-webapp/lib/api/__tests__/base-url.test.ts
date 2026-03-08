import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveApiBaseUrl } from "../base-url";

describe("resolveApiBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a trimmed base URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.praedixa.com/");

    expect(resolveApiBaseUrl()).toBe("https://api.praedixa.com");
  });

  it("allows loopback http URLs in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000/");

    expect(resolveApiBaseUrl()).toBe("http://localhost:8000");
  });

  it("rejects non-loopback http URLs in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.praedixa.com");

    expect(() => resolveApiBaseUrl()).toThrow(
      'NEXT_PUBLIC_API_URL must use https or a loopback http URL in development, received "http://api.praedixa.com".',
    );
  });

  it("requires https in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");

    expect(() => resolveApiBaseUrl()).toThrow(
      'NEXT_PUBLIC_API_URL must use https in production, received "http://localhost:8000".',
    );
  });

  it("falls back to the local test base URL only when allowed", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");

    expect(resolveApiBaseUrl({ allowTestFallback: true })).toBe(
      "http://localhost:8000",
    );
    expect(() => resolveApiBaseUrl()).toThrow(
      "NEXT_PUBLIC_API_URL is required outside test runtime and must be an absolute http(s) URL.",
    );
  });
});
