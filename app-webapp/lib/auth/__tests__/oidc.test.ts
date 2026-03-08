import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildSessionData,
  doesSessionMatchAccessToken,
  doesSessionMatchRefreshToken,
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

  it("prefers client-specific resource role over global super_admin realm role", () => {
    const token = makeToken({
      sub: "u-1",
      email: "client@praedixa.com",
      realm_access: {
        roles: ["super_admin"],
      },
      resource_access: {
        "web-client": {
          roles: ["org_admin"],
        },
      },
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      id: "u-1",
      email: "client@praedixa.com",
      role: "org_admin",
    });
  });

  it("falls back to realm role when no client-specific resource role exists", () => {
    const token = makeToken({
      sub: "u-2",
      email: "admin@praedixa.com",
      realm_access: {
        roles: ["super_admin"],
      },
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      id: "u-2",
      email: "admin@praedixa.com",
      role: "super_admin",
    });
  });

  it("reads top-level org_id and siteId-compatible claims", () => {
    const token = makeToken({
      sub: "u-3",
      email: "ops@praedixa.com",
      role: "manager",
      org_id: "org-1",
      siteId: "site-lyon",
      aud: ["account", "praedixa-api"],
    });

    expect(userFromAccessToken(token, "web-client")).toMatchObject({
      id: "u-3",
      organizationId: "org-1",
      siteId: "site-lyon",
    });
    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBeNull();
  });

  it("flags tokens that are missing the API audience", () => {
    const token = makeToken({
      sub: "u-4",
      email: "ops@praedixa.com",
      role: "org_admin",
      org_id: "org-1",
      aud: ["account"],
    });

    expect(getApiAccessTokenCompatibilityReason(token, "web-client")).toBe(
      "missing_api_audience",
    );
  });

  it("flags tokens that are missing tenant claims", () => {
    const token = makeToken({
      sub: "u-5",
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
    vi.stubEnv("AUTH_OIDC_ISSUER_URL", "https://auth.praedixa.com/realms/praedixa");
    vi.stubEnv("AUTH_OIDC_CLIENT_ID", "praedixa-webapp");
    vi.stubEnv("AUTH_SESSION_SECRET", "change-me-long-random-session-secret");

    expect(() => getOidcEnv()).toThrow(/AUTH_SESSION_SECRET/);
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
