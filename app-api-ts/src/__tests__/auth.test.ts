import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadPublicOpenApiDocument } from "@praedixa/shared-types/public-contract-node";

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
import { routes } from "../routes.js";

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

  it("accepts bearer scheme case-insensitively", () => {
    expect(parseBearerToken("bearer token-value")).toBe("token-value");
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

  it("rejects JWTs whose organization_id is blank for non super-admin roles", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-6b",
          email: "manager@praedixa.com",
          role: "org_admin",
          organization_id: "   ",
        }),
      ),
    ).toBeNull();
  });

  it("maps super_admin JWTs without organization_id to the synthetic admin organization and full admin permissions", () => {
    expect(
      normalizeJwtClaims(
        withRequiredJwtClaims({
          sub: "user-7",
          email: "admin@praedixa.com",
          role: "super_admin",
          permissions: ["admin:console:access"],
        }),
      ),
    ).toEqual({
      userId: "user-7",
      email: "admin@praedixa.com",
      organizationId: "11111111-1111-1111-1111-111111111111",
      role: "super_admin",
      siteIds: [],
      permissions: expect.arrayContaining([
        "admin:console:access",
        "admin:monitoring:read",
        "admin:org:read",
      ]),
    });
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

  it("returns detailed claim failure information for blank organization_id values", async () => {
    mockJwtVerify.mockResolvedValue({
      payload: withRequiredJwtClaims({
        sub: "user-11b",
        email: "admin@praedixa.com",
        role: "org_admin",
        organization_id: "   ",
      }),
    });

    await expect(
      decodeJwtPayloadDetailed("verified-but-blank-organization", JWT_CONFIG),
    ).resolves.toMatchObject({
      user: null,
      failure: {
        stage: "claims",
        reason: "JWT organization_id must be a non-empty string",
        tokenSummary: expect.objectContaining({
          hasUserId: true,
          hasCanonicalUserId: true,
          hasOrganizationId: false,
          hasCanonicalOrganizationId: false,
        }),
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

type OpenApiResponseRef = {
  $ref?: string;
};

type OpenApiOperationDocument = {
  security?: Array<Record<string, string[]>>;
  responses?: Record<string, OpenApiResponseRef | undefined>;
};

describe("public OpenAPI auth contract", () => {
  it("documents standard auth and validation failures for every bearer-protected operation", () => {
    const document = loadPublicOpenApiDocument();
    const operations = Object.values(document.paths ?? {}).flatMap((pathItem) =>
      Object.values(pathItem ?? {}),
    ) as OpenApiOperationDocument[];

    const protectedOperations = operations.filter(
      (operation) => (operation.security?.length ?? 0) > 0,
    );

    expect(protectedOperations.length).toBeGreaterThan(0);
    expect(
      protectedOperations.every(
        (operation) =>
          operation.responses?.["400"]?.$ref ===
            "#/components/responses/BadRequestError" &&
          operation.responses?.["401"]?.$ref ===
            "#/components/responses/UnauthorizedError" &&
          operation.responses?.["403"]?.$ref ===
            "#/components/responses/ForbiddenError",
      ),
    ).toBe(true);
  });

  it("keeps decision contract and action dispatch admin routes internal and org-scoped", () => {
    const document = loadPublicOpenApiDocument();
    const publicPaths = new Set(Object.keys(document.paths ?? {}));
    const internalAdminRoutes = [
      "/api/v1/admin/organizations/:orgId/decision-contracts",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion",
      "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/transition",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision",
      "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback",
    ] as const;

    for (const template of internalAdminRoutes) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();
      expect(route?.authRequired).toBe(true);
      expect(route?.template).toContain(":orgId");
      expect(publicPaths.has(template)).toBe(false);
    }
  });

  it("keeps admin user-management routes internal and tenant-scoped", () => {
    const document = loadPublicOpenApiDocument();
    const publicPaths = new Set(Object.keys(document.paths ?? {}));
    const internalAdminRoutes = [
      "/api/v1/admin/organizations/:orgId/users",
      "/api/v1/admin/organizations/:orgId/users/:userId",
      "/api/v1/admin/organizations/:orgId/users/:userId/role",
      "/api/v1/admin/organizations/:orgId/users/invite",
      "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
      "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
    ] as const;

    for (const template of internalAdminRoutes) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();
      expect(route?.authRequired).toBe(true);
      expect(route?.template).toContain(":orgId");
      expect(publicPaths.has(template)).toBe(false);
    }
  });

  it("keeps admin onboarding routes internal and organization-scoped", () => {
    const document = loadPublicOpenApiDocument();
    const publicPaths = new Set(Object.keys(document.paths ?? {}));
    const internalAdminRoutes = [
      "/api/v1/admin/organizations/:orgId/onboarding/cases",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/readiness/recompute",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save",
      "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete",
    ] as const;

    for (const template of internalAdminRoutes) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();
      expect(route?.authRequired).toBe(true);
      expect(route?.template).toContain(":orgId");
      expect(publicPaths.has(template)).toBe(false);
    }
  });

  it("keeps the delivery webhook outside the public OpenAPI contract while leaving it unauthenticated", () => {
    const document = loadPublicOpenApiDocument();
    const publicPaths = new Set(Object.keys(document.paths ?? {}));
    const route = routes.find(
      (entry) => entry.template === "/api/v1/webhooks/resend/email-delivery",
    );

    expect(route).toBeDefined();
    expect(route?.authRequired).toBe(false);
    expect(publicPaths.has("/api/v1/webhooks/resend/email-delivery")).toBe(
      false,
    );
  });
});
