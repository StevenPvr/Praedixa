import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getTrustedOidcEndpoints,
  hasRequiredAdminMfa,
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
  it("accepts canonical top-level claims and explicit permissions", () => {
    const token = makeToken({
      sub: "u-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      organization_id: "global-super-admin",
      permissions: ["ADMIN:CONSOLE:ACCESS", "admin:console:access"],
    });

    expect(userFromAccessToken(token, "admin-client")).toEqual({
      id: "u-1",
      email: "admin@praedixa.com",
      role: "super_admin",
      permissions: expect.arrayContaining([
        "admin:console:access",
        "admin:monitoring:read",
        "admin:org:read",
      ]),
      organizationId: "global-super-admin",
      siteId: null,
    });
  });

  it("keeps permissions empty when the token omits them", () => {
    const token = makeToken({
      sub: "u-2",
      email: "viewer@praedixa.com",
      role: "viewer",
      organization_id: "org-1",
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-2",
      role: "viewer",
      permissions: [],
    });
  });

  it("rejects non-canonical role aliases", () => {
    const token = makeToken({
      sub: "u-3",
      email: "admin@praedixa.com",
      role: "super-admin",
      permissions: ["admin:console:access"],
    });

    expect(userFromAccessToken(token, "admin-client")).toBeNull();
  });

  it("rejects role derivation through roles, groups, realm_access, and resource_access", () => {
    const token = makeToken({
      sub: "u-4",
      email: "admin@praedixa.com",
      roles: ["ROLE_SUPER_ADMIN"],
      groups: ["/super_admin"],
      realm_access: {
        roles: ["super_admin"],
      },
      resource_access: {
        "admin-client": {
          roles: ["super_admin"],
        },
      },
      permissions: ["admin:console:access"],
    });

    expect(userFromAccessToken(token, "admin-client")).toBeNull();
  });

  it("rejects app_metadata and preferred_username fallbacks", () => {
    const token = makeToken({
      sub: "u-5",
      preferred_username: "admin@praedixa.com",
      app_metadata: {
        role: "super_admin",
        organization_id: "org-1",
        site_id: "site-1",
        permissions: ["admin:console:access"],
      },
    });

    expect(userFromAccessToken(token, "admin-client")).toBeNull();
  });

  it("does not derive permissions from profiles when explicit permissions are absent", () => {
    const token = makeToken({
      sub: "u-6",
      email: "compliance@praedixa.com",
      role: "viewer",
      organization_id: "org-1",
      profile: "admin_compliance",
      profiles: ["admin_ops"],
    });

    expect(userFromAccessToken(token, "admin-client")).toMatchObject({
      id: "u-6",
      role: "viewer",
      permissions: [],
    });
  });

  it("treats malformed JWT payloads as expired instead of throwing", () => {
    expect(isTokenExpired("header.%not-base64%.sig")).toBe(true);
  });

  it("rejects tokens from a different issuer", () => {
    const token = makeToken({
      sub: "u-7",
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
      sub: "u-8",
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
      sub: "u-9",
      email: "admin@praedixa.com",
      iss: "https://auth.praedixa.com/realms/praedixa",
      exp: Math.floor(Date.now() / 1000) + 600,
      resource_access: {
        "admin-client": {
          roles: ["viewer"],
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

  it("requires explicit MFA evidence in production when AUTH_ADMIN_REQUIRED_AMR is configured", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_ADMIN_REQUIRED_AMR = "otp,webauthn";

    const token = makeToken({
      sub: "u-10",
      email: "admin@praedixa.com",
      amr: ["pwd", "otp"],
    });

    expect(hasRequiredAdminMfa(token)).toBe(true);
  });

  it("rejects admin tokens without the configured MFA evidence", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_ADMIN_REQUIRED_AMR = "otp";

    const token = makeToken({
      sub: "u-11",
      email: "admin@praedixa.com",
      amr: ["pwd"],
    });

    expect(hasRequiredAdminMfa(token)).toBe(false);
  });

  it("throws in production when AUTH_ADMIN_REQUIRED_AMR is not configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_ADMIN_REQUIRED_AMR;

    const token = makeToken({
      sub: "u-12",
      email: "admin@praedixa.com",
      amr: ["otp"],
    });

    expect(() => hasRequiredAdminMfa(token)).toThrow(/AUTH_ADMIN_REQUIRED_AMR/);
  });

  it("surfaces discovery status and payload details when the issuer rejects discovery", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Realm does not exist" }), {
          status: 404,
          statusText: "Not Found",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ),
    );

    await expect(
      getTrustedOidcEndpoints("https://auth.praedixa.com/realms/praedixa"),
    ).rejects.toThrow(
      /OIDC discovery request failed \(404 Not Found: Realm does not exist\)/,
    );
  });

  it("accepts localhost http discovery origins outside production", async () => {
    process.env.NODE_ENV = "test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            issuer: "http://localhost:8081/realms/praedixa",
            authorization_endpoint:
              "http://localhost:8081/realms/praedixa/protocol/openid-connect/auth",
            token_endpoint:
              "http://localhost:8081/realms/praedixa/protocol/openid-connect/token",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      ),
    );

    await expect(
      getTrustedOidcEndpoints("http://localhost:8081/realms/praedixa"),
    ).resolves.toMatchObject({
      authorizationEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/auth",
      tokenEndpoint:
        "http://localhost:8081/realms/praedixa/protocol/openid-connect/token",
    });
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

  it("uses AUTH_APP_ORIGIN when configured to a public non-local origin", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_APP_ORIGIN = "https://admin.praedixa.com";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("https://admin.praedixa.com");
  });

  it("throws in production when no public auth origin is configured even if the request is already https", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(
        makeRequest("https://admin.praedixa.com", {
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
        }),
      ),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("throws in production when no public auth origin is configured behind internal http", () => {
    process.env.NODE_ENV = "production";

    expect(() =>
      resolveAuthAppOrigin(makeRequest("http://internal-admin:3002")),
    ).toThrow(/Missing AUTH_APP_ORIGIN/);
  });

  it("prefers the request origin for private-network hosts in development", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(makeRequest("http://10.188.106.147:3002")),
    ).toBe("http://10.188.106.147:3002");
  });

  it("keeps localhost config from forcing a host switch in development", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_APP_ORIGIN = "http://localhost:3002";

    expect(
      resolveAuthAppOrigin(
        makeRequest("http://10.188.106.147:3002", {
          "x-forwarded-host": "10.188.106.147:3002",
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe("http://10.188.106.147:3002");
  });

  it("falls back to localhost for non-local dev hosts", () => {
    process.env.NODE_ENV = "development";

    expect(
      resolveAuthAppOrigin(makeRequest("http://internal-admin:3002")),
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
