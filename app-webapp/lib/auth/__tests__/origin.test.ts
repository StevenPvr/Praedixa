import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { secureCookie } from "../oidc";
import { resolveAuthAppOrigin } from "../origin";
import { isSameOriginBrowserRequest } from "@/lib/security/same-origin";

function makeRequest(
  origin: string,
  headers: Record<string, string | undefined> = {},
): Parameters<typeof resolveAuthAppOrigin>[0] {
  const parsed = new URL(origin);
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    nextUrl: {
      origin: parsed.origin,
      protocol: parsed.protocol,
    },
    headers: {
      get: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
    },
  } as Parameters<typeof resolveAuthAppOrigin>[0];
}

describe("webapp auth origin resolution", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAuthAppOrigin = process.env.AUTH_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;

  beforeEach(() => {
    delete process.env.AUTH_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAuthAppOrigin === undefined) {
      delete process.env.AUTH_APP_ORIGIN;
    } else {
      process.env.AUTH_APP_ORIGIN = originalAuthAppOrigin;
    }
    if (originalNextPublicAppOrigin === undefined) {
      delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    } else {
      process.env.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
    }
    vi.unstubAllEnvs();
  });

  it("uses AUTH_APP_ORIGIN when configured", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001"))).toBe(
      "https://app.praedixa.com",
    );
  });

  it("uses the https request origin in production when no explicit origin is configured", () => {
    process.env.NODE_ENV = "production";

    expect(resolveAuthAppOrigin(makeRequest("https://app.praedixa.com"))).toBe(
      "https://app.praedixa.com",
    );
  });

  it("throws in production when only an internal http origin is available", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001")),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("defaults to localhost in development", () => {
    process.env.NODE_ENV = "development";

    expect(resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001"))).toBe(
      "http://localhost:3001",
    );
  });

  it("marks auth cookies as secure when AUTH_APP_ORIGIN is https", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(secureCookie(makeRequest("http://internal-webapp:3001"))).toBe(true);
  });

  it("validates same-origin requests against AUTH_APP_ORIGIN instead of the raw request host", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(
      isSameOriginBrowserRequest(
        makeRequest("http://internal-webapp:3001", {
          origin: "https://app.praedixa.com",
        }),
      ),
    ).toBe(true);
    expect(
      isSameOriginBrowserRequest(
        makeRequest("http://internal-webapp:3001", {
          origin: "https://evil.example",
        }),
      ),
    ).toBe(false);
  });

  it("allows direct browser requests when sec-fetch-site is none", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(
      isSameOriginBrowserRequest(
        makeRequest("https://app.praedixa.com", {
          "sec-fetch-site": "none",
        }),
      ),
    ).toBe(true);
  });
});
