import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateRemoteJWKSet = vi.fn();
const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  createRemoteJWKSet: (...args: unknown[]) => mockCreateRemoteJWKSet(...args),
  jwtVerify: (...args: unknown[]) => mockJwtVerify(...args),
}));

import {
  decodeJwtPayload,
  decodeJwtPayloadDetailed,
  normalizeJwtClaims,
  parseBearerToken,
} from "../auth.js";

const JWT_CONFIG = {
  issuerUrl: "https://auth.praedixa.com/realms/praedixa",
  audience: "praedixa-api",
  jwksUrl:
    "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
  algorithms: ["RS256"],
} as const;
const NOW_NUMERIC_DATE = 1_700_000_000;

function withRequiredJwtClaims(payload: Record<string, unknown>) {
  return {
    iat: NOW_NUMERIC_DATE,
    exp: NOW_NUMERIC_DATE + 3600,
    ...payload,
  };
}

describe("parseBearerToken", () => {
  it("returns null for malformed header", () => {
    expect(parseBearerToken("Basic abc")).toBeNull();
  });

  it("extracts token for Bearer header", () => {
    expect(parseBearerToken("Bearer token-value")).toBe("token-value");
  });
});

describe("normalizeJwtClaims", () => {
  it("maps canonical claims to the normalized payload", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-1",
          email: "ops@praedixa.com",
          role: "org_admin",
          organization_id: "org-1",
          site_id: "site-1",
          permissions: ["ADMIN:ORG:READ", "admin:org:read"],
        }),
      ),
    ).toEqual({
      userId: "user-1",
      email: "ops@praedixa.com",
      organizationId: "org-1",
      role: "org_admin",
      siteIds: ["site-1"],
      permissions: ["admin:org:read"],
    });
  });

  it("keeps explicit permissions empty when the token does not provide them", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-2",
          email: "viewer@praedixa.com",
          role: "viewer",
          organization_id: "org-2",
        }),
      ),
    ).toEqual({
      userId: "user-2",
      email: "viewer@praedixa.com",
      organizationId: "org-2",
      role: "viewer",
      siteIds: [],
      permissions: [],
    });
  });

  it("rejects JWTs without canonical top-level role", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-3",
          email: "ops@praedixa.com",
          organization_id: "org-3",
        }),
      ),
    ).toBeNull();
  });

  it("rejects JWTs with non-canonical role aliases", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-4",
          email: "ops@praedixa.com",
          role: "super-admin",
          organization_id: "org-4",
        }),
      ),
    ).toBeNull();
  });

  it("rejects legacy fallback claims for email, role, organization, site, and permissions", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-5",
          preferred_username: "ops@praedixa.com",
          roles: ["org_admin"],
          groups: ["/org_admin"],
          org_id: "org-5",
          organizationId: "org-5",
          siteId: "site-5",
          site_ids: ["site-5"],
          permissions: [],
          app_metadata: {
            role: "org_admin",
            organization_id: "org-5",
            site_id: "site-5",
            permissions: ["admin:console:access"],
          },
          realm_access: {
            roles: ["org_admin"],
          },
          resource_access: {
            "praedixa-api": {
              roles: ["org_admin"],
            },
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects scoped manager roles without site_id", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-6",
          email: "manager@praedixa.com",
          role: "manager",
          organization_id: "org-6",
        }),
      ),
    ).toBeNull();
  });

  it("rejects JWTs without organization_id", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-7",
          email: "admin@praedixa.com",
          role: "super_admin",
        }),
      ),
    ).toBeNull();
  });

  it("rejects JWTs without exp and iat claims", () => {
    expect(
      normalizeJwtClaims({
        sub: "user-8",
        email: "missing-time@praedixa.com",
        role: "viewer",
        organization_id: "org-8",
      }),
    ).toBeNull();
  });
});

describe("decodeJwtPayload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateRemoteJWKSet.mockReturnValue(async () => ({ keys: [] }));
  });

  it("returns normalized claims when JWT verification succeeds", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({
        sub: "user-9",
        email: "verified@praedixa.com",
        role: "org_admin",
        organization_id: "org-9",
      }),
    });

    await expect(
      decodeJwtPayload("signed.jwt.token", JWT_CONFIG),
    ).resolves.toEqual({
      userId: "user-9",
      email: "verified@praedixa.com",
      organizationId: "org-9",
      role: "org_admin",
      siteIds: [],
      permissions: [],
    });

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

    await expect(
      decodeJwtPayload("bad.jwt.token", JWT_CONFIG),
    ).resolves.toBeNull();
  });

  it("returns null when verified payload has invalid claims", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({ sub: "user-only" }),
    });

    await expect(
      decodeJwtPayload("verified-but-invalid-claims", JWT_CONFIG),
    ).resolves.toBeNull();
  });

  it("returns detailed claim failure information for missing canonical claims", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({ sub: "user-only" }),
    });

    await expect(
      decodeJwtPayloadDetailed("verified-but-invalid-claims", JWT_CONFIG),
    ).resolves.toMatchObject({
      user: null,
      failure: {
        stage: "claims",
        reason: "JWT is missing email",
      },
    });
  });

  it("returns detailed claim failure information for non-canonical role aliases", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({
        sub: "user-10",
        email: "admin@praedixa.com",
        role: "super-admin",
        organization_id: "org-10",
      }),
    });

    await expect(
      decodeJwtPayloadDetailed("verified-but-invalid-role", JWT_CONFIG),
    ).resolves.toMatchObject({
      user: null,
      failure: {
        stage: "claims",
        reason: "JWT role must use a canonical top-level value",
      },
    });
  });

  it("returns detailed claim failure information for missing site_id on scoped managers", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({
        sub: "user-11",
        email: "manager@praedixa.com",
        role: "manager",
        organization_id: "org-11",
      }),
    });

    await expect(
      decodeJwtPayloadDetailed("verified-but-missing-site", JWT_CONFIG),
    ).resolves.toMatchObject({
      user: null,
      failure: {
        stage: "claims",
        reason: "JWT is missing site_id for a scoped manager role",
      },
    });
  });

  it("returns detailed verification failure information", async () => {
    mockJwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'));

    await expect(
      decodeJwtPayloadDetailed(
        "aaa.eyJhdWQiOlsiYWNjb3VudCJdLCJhenAiOiJwcmFlZGl4YS13ZWJhcHAifQ.sig",
        JWT_CONFIG,
      ),
    ).resolves.toMatchObject({
      user: null,
      failure: {
        stage: "verify",
        reason: 'unexpected "aud" claim value',
        tokenSummary: expect.objectContaining({
          parseable: true,
          aud: ["account"],
          azp: "praedixa-webapp",
        }),
      },
    });
  });
});
