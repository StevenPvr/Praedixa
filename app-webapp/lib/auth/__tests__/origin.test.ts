import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { secureCookie } from "../oidc";
import { isAllowedSameOriginRequest, resolveAuthAppOrigin } from "../origin";
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

    expect(
      resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001")),
    ).toBe("https://app.praedixa.com");
  });

  it("uses NEXT_PUBLIC_APP_ORIGIN when AUTH_APP_ORIGIN is absent", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_APP_ORIGIN = "https://app-public.praedixa.com";

    expect(
      resolveAuthAppOrigin(makeRequest("https://internal-webapp:3001")),
    ).toBe("https://app-public.praedixa.com");
  });

  it("throws in production when no explicit public origin is configured", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("https://app.praedixa.com")),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("throws in production when only an internal http origin is available", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001")),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("throws when AUTH_APP_ORIGIN includes a path", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com/login";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("https://app.praedixa.com")),
    ).toThrow(/Invalid AUTH_APP_ORIGIN/);
  });

  it("throws when AUTH_APP_ORIGIN and NEXT_PUBLIC_APP_ORIGIN differ", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app-a.praedixa.com";
    process.env.NEXT_PUBLIC_APP_ORIGIN = "https://app-b.praedixa.com";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("https://app.praedixa.com")),
    ).toThrow(/must match/);
  });

  it("defaults to localhost in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(makeRequest("http://internal-webapp:3001")),
    ).toBe("http://localhost:3001");
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

  it("fails closed in production when the public app origin is missing", () => {
    process.env.NODE_ENV = "production";

    expect(
      isSameOriginBrowserRequest(
        makeRequest("https://app.praedixa.com", {
          origin: "https://app.praedixa.com",
        }),
      ),
    ).toBe(false);
  });

  it("fails closed when the explicit public origin config is invalid", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com/callback";

    expect(
      isSameOriginBrowserRequest(
        makeRequest("https://app.praedixa.com", {
          origin: "https://app.praedixa.com",
        }),
      ),
    ).toBe(false);
  });

  it("rejects sec-fetch-site none by default on JSON handlers", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(
      isSameOriginBrowserRequest(
        makeRequest("https://app.praedixa.com", {
          "sec-fetch-site": "none",
        }),
      ),
    ).toBe(false);
  });

  it("allows sec-fetch-site none only when the route opts into navigation mode", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(
      isAllowedSameOriginRequest(
        makeRequest("https://app.praedixa.com", {
          "sec-fetch-site": "none",
        }),
        "https://app.praedixa.com",
        { allowNavigate: true },
      ),
    ).toBe(true);
  });

  it("allows referer fallback only when navigation mode is enabled", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    const request = makeRequest("https://app.praedixa.com", {
      referer: "https://app.praedixa.com/settings",
    });

    expect(
      isAllowedSameOriginRequest(request, "https://app.praedixa.com"),
    ).toBe(false);
    expect(
      isAllowedSameOriginRequest(request, "https://app.praedixa.com", {
        allowNavigate: true,
      }),
    ).toBe(true);
  });

  it("rejects headerless browser requests when origin metadata is absent", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://app.praedixa.com";

    expect(
      isSameOriginBrowserRequest(makeRequest("https://app.praedixa.com")),
    ).toBe(false);
  });
});
