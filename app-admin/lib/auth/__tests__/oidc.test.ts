import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  isAccessTokenCompatible,
  isTokenExpired,
  resolveAuthAppOrigin,
  secureCookie,
  userFromAccessToken,
} from "../oidc";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.sig`;
}

describe("admin OIDC role parsing", () => {
  it("accepts super-admin alias from role claim", () => {
    const token = makeToken({
      sub: "u-1",
      email: "admin@praedixa.com",
      role: "super-admin",
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: expect.arrayContaining(["admin:console:access"]),
    });
  });

  it("accepts ROLE_SUPER_ADMIN in top-level roles claim", () => {
    const token = makeToken({
      sub: "u-2",
      email: "admin@praedixa.com",
      roles: ["ROLE_SUPER_ADMIN"],
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-2",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: expect.arrayContaining(["admin:console:access"]),
    });
  });

  it("accepts /super_admin role from groups claim", () => {
    const token = makeToken({
      sub: "u-3",
      email: "admin@praedixa.com",
      groups: ["/super_admin", "/ops"],
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-3",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: expect.arrayContaining(["admin:console:access"]),
    });
  });

  it("falls back to profile permissions when explicit permissions are absent", () => {
    const token = makeToken({
      sub: "u-4",
      email: "compliance@praedixa.com",
      role: "viewer",
      profile: "admin_compliance",
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-4",
      role: "viewer",
      permissions: expect.arrayContaining(["admin:audit:read"]),
    });
  });

  it("treats malformed JWT payloads as expired instead of throwing", () => {
    expect(isTokenExpired("header.%not-base64%.sig")).toBe(true);
  });

  it("rejects tokens from a different issuer", () => {
    const token = makeToken({
      sub: "u-5",
      email: "admin@praedixa.com",
      iss: "https://evil.example/realms/praedixa",
      azp: "admin-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    expect(
      isAccessTokenCompatible(token, {
        issuerUrl: "https://auth.praedixa.com/realms/praedixa",
        clientId: "admin-client",
      }),
    ).toBe(false);
  });

  it("rejects tokens that are not bound to the admin client", () => {
    const token = makeToken({
      sub: "u-6",
      email: "admin@praedixa.com",
      iss: "https://auth.praedixa.com/realms/praedixa",
      azp: "other-client",
      exp: Math.floor(Date.now() / 1000) + 600,
    });

    expect(
      isAccessTokenCompatible(token, {
        issuerUrl: "https://auth.praedixa.com/realms/praedixa",
        clientId: "admin-client",
      }),
    ).toBe(false);
  });

  it("accepts tokens bound through resource_access when azp is absent", () => {
    const token = makeToken({
      sub: "u-7",
      email: "admin@praedixa.com",
      iss: "https://auth.praedixa.com/realms/praedixa",
      exp: Math.floor(Date.now() / 1000) + 600,
      resource_access: {
        "admin-client": {
          roles: ["admin"],
        },
      },
    });

    expect(
      isAccessTokenCompatible(token, {
        issuerUrl: "https://auth.praedixa.com/realms/praedixa",
        clientId: "admin-client",
      }),
    ).toBe(true);
  });
});

describe("admin OIDC app origin resolution", () => {
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
  });

  function makeRequest(
    origin: string,
    headers: Record<string, string | undefined> = {},
  ): Parameters<typeof resolveAuthAppOrigin>[0] {
    const parsed = new URL(origin);
    return {
      nextUrl: { origin: parsed.origin, protocol: parsed.protocol },
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
    } as Parameters<typeof resolveAuthAppOrigin>[0];
  }

  it("uses AUTH_APP_ORIGIN when configured", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_APP_ORIGIN = "https://admin.praedixa.com";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("https://admin.praedixa.com");
  });

  it("uses request origin when the production request is already https", () => {
    process.env.NODE_ENV = "production";

    expect(
      resolveAuthAppOrigin(
        makeRequest("https://admin.praedixa.com", {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe("https://admin.praedixa.com");
  });

  it("throws in production when no public auth origin is configured behind internal http", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("http://internal-admin:3002")),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("defaults to localhost origin in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("http://localhost:3002");
  });

  it("ignores forwarded host/proto in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(
        makeRequest("http://internal-admin:3002", {
          "x-forwarded-host": "10.188.106.147:3002",
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe("http://localhost:3002");
  });

  it("marks auth cookies as secure when x-forwarded-proto is https", () => {
    process.env.NODE_ENV = "production";

    expect(
      secureCookie(
        makeRequest("http://internal-admin:3002", {
          "x-forwarded-proto": "https",
        }),
      ),
    ).toBe(true);
  });

  it("marks auth cookies as secure when AUTH_APP_ORIGIN is https", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_APP_ORIGIN = "https://admin.praedixa.com";

    expect(secureCookie(makeRequest("http://internal-admin:3002"))).toBe(true);
  });
});
