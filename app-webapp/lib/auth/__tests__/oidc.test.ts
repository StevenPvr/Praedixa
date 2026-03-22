import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildSessionData,
  doesSessionMatchAccessToken,
  doesSessionMatchRefreshToken,
  getAccessTokenClaimsIssue,
  getTrustedOidcEndpoints,
  getOidcEnv,
  getApiAccessTokenCompatibilityReason,
  sanitizeNextPath,
  signSession,
  timingSafeEqual,
  userFromAccessToken,
  verifySession,
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

describe("webapp OIDC helpers", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("accepts canonical top-level claims", () => {
    const token = makeToken({
      sub: "u-1",
      email: "client@praedixa.com",
      role: "org_admin",
      organization_id: "org-1",
      site_id: "site-1",
      aud: ["account", "praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toEqual({
      id: "u-1",
      email: "client@praedixa.com",
      role: "org_admin",
      organizationId: "org-1",
      siteId: "site-1",
    });
    expect(
      getApiAccessTokenCompatibilityReason(token, "web-client"),
    ).toBeNull();
  });

  it("rejects legacy role derivation through realm_access and resource_access", () => {
    const token = makeToken({
      sub: "u-2",
      email: "admin@praedixa.com",
      realm_access: {
        roles: ["super_admin"],
      },
      resource_access: {
        "web-client": {
          roles: ["org_admin"],
        },
      },
      aud: ["praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toBeNull();
    expect(getAccessTokenClaimsIssue(token)).toBe("missing_role");
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "invalid_claims",
    );
  });

  it("rejects non-canonical role aliases", () => {
    const token = makeToken({
      sub: "u-3",
      email: "admin@praedixa.com",
      role: "super-admin",
      organization_id: "org-1",
      aud: ["praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toBeNull();
    expect(getAccessTokenClaimsIssue(token)).toBe("invalid_role");
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "invalid_claims",
    );
  });

  it("rejects legacy organization, site, and email aliases", () => {
    const token = makeToken({
      sub: "u-4",
      preferred_username: "ops@praedixa.com",
      role: "manager",
      org_id: "org-1",
      organizationId: "org-1",
      siteId: "site-lyon",
      site_ids: ["site-lyon"],
      app_metadata: {
        organization_id: "org-1",
        site_id: "site-lyon",
      },
      aud: ["praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toBeNull();
    expect(getAccessTokenClaimsIssue(token)).toBe("missing_email");
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "invalid_claims",
    );
  });

  it("flags tokens that are missing the API audience", () => {
    const token = makeToken({
      sub: "u-5",
      email: "ops@praedixa.com",
      role: "org_admin",
      organization_id: "org-1",
      aud: ["account"],
    });

    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "missing_api_audience",
    );
  });

  it("flags tokens that are missing tenant claims", () => {
    const token = makeToken({
      sub: "u-6",
      email: "ops@praedixa.com",
      role: "org_admin",
      aud: ["praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      organizationId: null,
    });
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "missing_organization_id",
    );
  });

  it("flags manager tokens that are missing site_id", () => {
    const token = makeToken({
      sub: "u-7",
      email: "manager@praedixa.com",
      role: "manager",
      organization_id: "org-1",
      aud: ["praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      siteId: null,
    });
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "missing_site_id",
    );
  });

  it("sanitizes unsafe next paths", () => {
    expect(sanitizeNextPath("/dashboard?tab=alerts", "/dashboard")).toBe(
      "/dashboard?tab=alerts",
    );
    expect(sanitizeNextPath("//evil.example", "/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/\\evil", "/dashboard")).toBe("/dashboard");
    expect(sanitizeNextPath("/dashboard\r\nx:1", "/dashboard")).toBe(
      "/dashboard",
    );
  });

  it("compares security tokens without leaking equality through helpers", () => {
    expect(timingSafeEqual("state-123", "state-123")).toBe(true);
    expect(timingSafeEqual("state-123", "state-124")).toBe(false);
  });

  it("rejects weak or placeholder session secrets", () => {
    vi.stubEnv(
      "AUTH_OIDC_ISSUER_URL",
      "https://auth.praedixa.com/realms/praedixa",
    );
    vi.stubEnv("AUTH_OIDC_CLIENT_ID", "praedixa-webapp");
    vi.stubEnv("AUTH_SESSION_SECRET", "change-me-long-random-session-secret");

    expect(() => getOidcEnv()).toThrow(/AUTH_SESSION_SECRET/);
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

  it("binds the signed session to the current access and refresh tokens", async () => {
    const session = await buildSessionData(
      {
        id: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
      Math.floor(Date.now() / 1000) + 900,
      "access-token-a",
      "refresh-token-a",
      7200,
    );

    await expect(
      doesSessionMatchAccessToken(session, "access-token-a"),
    ).resolves.toBe(true);
    await expect(
      doesSessionMatchAccessToken(session, "tampered-access-token"),
    ).resolves.toBe(false);
    await expect(
      doesSessionMatchRefreshToken(session, "refresh-token-a"),
    ).resolves.toBe(true);
    await expect(
      doesSessionMatchRefreshToken(session, "tampered-refresh-token"),
    ).resolves.toBe(false);
  });

  it("rejects signed sessions that are expired server-side", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

    const session = await buildSessionData(
      {
        id: "user-1",
        email: "ops@praedixa.com",
        role: "org_admin",
        organizationId: "org-1",
        siteId: "site-1",
      },
      Math.floor(Date.now() / 1000) + 900,
      "access-token-a",
      "refresh-token-a",
      7200,
    );

    const token = await signSession(
      {
        ...session,
        sessionExpiresAt: Math.floor(Date.now() / 1000) - 60,
      },
      "a-very-long-session-secret-used-for-tests-1234567890",
    );

    await expect(
      verifySession(
        token,
        "a-very-long-session-secret-used-for-tests-1234567890",
      ),
    ).resolves.toBeNull();
  });
});
