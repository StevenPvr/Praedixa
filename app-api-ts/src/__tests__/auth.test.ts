import { describe, expect, it } from "vitest";

import { decodeJwtPayload, parseBearerToken } from "../auth.js";

function makeToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64url")
    .replace(/=/g, "");
  const body = Buffer.from(JSON.stringify(payload))
    .toString("base64url")
    .replace(/=/g, "");
  return `${header}.${body}.sig`;
}

describe("parseBearerToken", () => {
  it("returns null for malformed header", () => {
    expect(parseBearerToken("Basic abc")).toBeNull();
  });

  it("extracts token for Bearer header", () => {
    expect(parseBearerToken("Bearer token-value")).toBe("token-value");
  });
});

describe("decodeJwtPayload", () => {
  it("maps claims to normalized payload", () => {
    const token = makeToken({
      sub: "user-1",
      email: "ops@praedixa.com",
      org_id: "org-1",
      role: "org_admin",
      site_ids: ["site-1"],
      permissions: ["read:alerts"],
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-1",
      email: "ops@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-1"],
      permissions: ["read:alerts"],
    });
  });

  it("returns null when required claims are missing", () => {
    const token = makeToken({ sub: "user-1" });
    expect(decodeJwtPayload(token)).toBeNull();
  });

  it("accepts OIDC fallback claims from realm_access and preferred_username", () => {
    const token = makeToken({
      sub: "user-2",
      preferred_username: "ops.client@praedixa.com",
      organizationId: "org-1",
      realm_access: {
        roles: ["org_admin"],
      },
      siteId: "site-lyon",
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-2",
      email: "ops.client@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-lyon"],
      permissions: [],
    });
  });

  it("accepts organization and role fallbacks from app_metadata and resource_access", () => {
    const token = makeToken({
      sub: "user-3",
      email: "manager@praedixa.com",
      app_metadata: {
        org_id: "org-3",
      },
      resource_access: {
        webapp: { roles: ["viewer", "manager"] },
      },
      siteIds: ["site-1", "site-2"],
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-3",
      email: "manager@praedixa.com",
      organizationId: "org-3",
      role: "manager",
      siteIds: ["site-1", "site-2"],
      permissions: [],
    });
  });

  it("falls back to viewer when role is unknown", () => {
    const token = makeToken({
      sub: "user-4",
      email: "ops.client@praedixa.com",
      organization_id: "org-4",
      role: "ops_client",
      site_id: "site-lyon",
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-4",
      email: "ops.client@praedixa.com",
      organizationId: "org-4",
      role: "viewer",
      siteIds: ["site-lyon"],
      permissions: [],
    });
  });

  it("accepts role aliases and top-level roles/groups claims", () => {
    const aliasRoleToken = makeToken({
      sub: "user-5",
      email: "admin.alias@praedixa.com",
      org_id: "org-5",
      role: "super-admin",
    });

    expect(decodeJwtPayload(aliasRoleToken)).toEqual({
      userId: "user-5",
      email: "admin.alias@praedixa.com",
      organizationId: "org-5",
      role: "super_admin",
      siteIds: [],
      permissions: [],
    });

    const rolesArrayToken = makeToken({
      sub: "user-6",
      email: "admin.roles@praedixa.com",
      org_id: "org-6",
      roles: ["ROLE_SUPER_ADMIN"],
    });

    expect(decodeJwtPayload(rolesArrayToken)).toEqual({
      userId: "user-6",
      email: "admin.roles@praedixa.com",
      organizationId: "org-6",
      role: "super_admin",
      siteIds: [],
      permissions: [],
    });

    const groupsToken = makeToken({
      sub: "user-7",
      email: "admin.groups@praedixa.com",
      org_id: "org-7",
      groups: ["/super_admin"],
    });

    expect(decodeJwtPayload(groupsToken)).toEqual({
      userId: "user-7",
      email: "admin.groups@praedixa.com",
      organizationId: "org-7",
      role: "super_admin",
      siteIds: [],
      permissions: [],
    });
  });

  it("falls back to default organization when org claims are missing", () => {
    const token = makeToken({
      sub: "user-8",
      email: "no-org@praedixa.com",
      role: "org_admin",
    });

    expect(decodeJwtPayload(token)).toEqual({
      userId: "user-8",
      email: "no-org@praedixa.com",
      organizationId: "11111111-1111-1111-1111-111111111111",
      role: "org_admin",
      siteIds: [],
      permissions: [],
    });
  });
});
