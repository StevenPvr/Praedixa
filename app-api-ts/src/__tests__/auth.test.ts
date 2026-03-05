import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateRemoteJWKSet = vi.fn();
const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import { decodeJwtPayload, normalizeJwtClaims, parseBearerToken } from "../auth.js";

const JWT_CONFIG = {
  issuerUrl: "https://auth.praedixa.com/realms/praedixa",
  audience: "praedixa-api",
  jwksUrl: "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
  algorithms: ["RS256"],
} as const;

describe("parseBearerToken", () => {
  it("returns null for malformed header", () => {
    expect(parseBearerToken("Basic abc")).toBeNull();
  });

  it("extracts token for Bearer header", () => {
    expect(parseBearerToken("Bearer token-value")).toBe("token-value");
  });
});

describe("normalizeJwtClaims", () => {
  it("maps claims to normalized payload", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-1",
        email: "ops@praedixa.com",
        org_id: "org-1",
        role: "org_admin",
        site_ids: ["site-1"],
        permissions: ["read:alerts"],
      }),
    ).toEqual({
      userId: "user-1",
      email: "ops@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-1"],
      permissions: ["read:alerts"],
    });
  });

  it("returns null when required claims are missing", () => {
    expect(normalizeJwtClaims({ sub: "user-1" })).toBeNull();
  });

  it("accepts OIDC fallback claims from realm_access and preferred_username", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-2",
        preferred_username: "ops.client@praedixa.com",
        organizationId: "org-1",
        realm_access: {
          roles: ["org_admin"],
        },
        siteId: "site-lyon",
      }),
    ).toEqual({
      userId: "user-2",
      email: "ops.client@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-lyon"],
      permissions: [],
    });
  });

  it("accepts organization and role fallbacks from app_metadata and resource_access", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-3",
        email: "manager@praedixa.com",
        app_metadata: {
          org_id: "org-3",
        },
        resource_access: {
          webapp: { roles: ["viewer", "manager"] },
        },
        siteIds: ["site-1", "site-2"],
      }),
    ).toEqual({
      userId: "user-3",
      email: "manager@praedixa.com",
      organizationId: "org-3",
      role: "manager",
      siteIds: ["site-1", "site-2"],
      permissions: [],
    });
  });

  it("falls back to viewer when role is unknown", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-4",
        email: "ops.client@praedixa.com",
        organization_id: "org-4",
        role: "ops_client",
        site_id: "site-lyon",
      }),
    ).toEqual({
      userId: "user-4",
      email: "ops.client@praedixa.com",
      organizationId: "org-4",
      role: "viewer",
      siteIds: ["site-lyon"],
      permissions: [],
    });
  });

  it("accepts role aliases and top-level roles/groups claims", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-5",
        email: "admin.alias@praedixa.com",
        org_id: "org-5",
        role: "super-admin",
      }),
    ).toEqual({
      userId: "user-5",
      email: "admin.alias@praedixa.com",
      organizationId: "org-5",
      role: "super_admin",
      siteIds: [],
      permissions: expect.arrayContaining([
        "admin:console:access",
        "admin:integrations:read",
        "admin:integrations:write",
      ]),
    });

    expect(
      normalizeJwtClaims({
        sub: "user-6",
        email: "admin.roles@praedixa.com",
        org_id: "org-6",
        roles: ["ROLE_SUPER_ADMIN"],
      }),
    ).toEqual({
      userId: "user-6",
      email: "admin.roles@praedixa.com",
      organizationId: "org-6",
      role: "super_admin",
      siteIds: [],
      permissions: expect.arrayContaining([
        "admin:console:access",
        "admin:integrations:read",
      ]),
    });

    expect(
      normalizeJwtClaims({
        sub: "user-7",
        email: "admin.groups@praedixa.com",
        org_id: "org-7",
        groups: ["/super_admin"],
      }),
    ).toEqual({
      userId: "user-7",
      email: "admin.groups@praedixa.com",
      organizationId: "org-7",
      role: "super_admin",
      siteIds: [],
      permissions: expect.arrayContaining([
        "admin:console:access",
        "admin:integrations:read",
      ]),
    });
  });

  it("derives delegated permissions from profile fallback when explicit permissions are missing", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-7b",
        email: "ops.delegate@praedixa.com",
        org_id: "org-7",
        role: "viewer",
        profile: "admin_ops",
      }),
    ).toEqual({
      userId: "user-7b",
      email: "ops.delegate@praedixa.com",
      organizationId: "org-7",
      role: "viewer",
      siteIds: [],
      permissions: expect.arrayContaining(["admin:console:access"]),
    });
  });

  it("falls back to default organization when org claims are missing", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-8",
        email: "no-org@praedixa.com",
        role: "org_admin",
      }),
    ).toEqual({
      userId: "user-8",
      email: "no-org@praedixa.com",
      organizationId: "11111111-1111-1111-1111-111111111111",
      role: "org_admin",
      siteIds: [],
      permissions: [],
    });
  });
});

describe("decodeJwtPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue(async () => ({ keys: [] }));
  });

  it("returns normalized claims when JWT verification succeeds", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: {
        sub: "user-9",
        email: "verified@praedixa.com",
        org_id: "org-9",
        role: "org_admin",
      },
    });

    await expect(decodeJwtPayload("signed.jwt.token", JWT_CONFIG)).resolves.toEqual(
      {
        userId: "user-9",
        email: "verified@praedixa.com",
        organizationId: "org-9",
        role: "org_admin",
        siteIds: [],
        permissions: [],
      },
    );

    expect(mockJwtVerify).toHaveBeenCalledWith(
      "signed.jwt.token",
      expect.any(Function),
      expect.objectContaining({
        issuer: JWT_CONFIG.issuerUrl,
        audience: JWT_CONFIG.audience,
        algorithms: [...JWT_CONFIG.algorithms],
      }),
    );
  });

  it("returns null when JWT verification fails", async () => {
    mockJwtVerify.mockRejectedValue(new Error("invalid signature"));

    await expect(decodeJwtPayload("bad.jwt.token", JWT_CONFIG)).resolves.toBeNull();
  });

  it("returns null when verified payload has invalid claims", async () => {
    mockJwtVerify.mockResolvedValue({ payload: { sub: "user-only" } });

    await expect(
      decodeJwtPayload("verified-but-invalid-claims", JWT_CONFIG),
    ).resolves.toBeNull();
  });
});
