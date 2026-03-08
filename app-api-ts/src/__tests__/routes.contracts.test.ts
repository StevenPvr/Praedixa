import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { routes } from "../routes.js";
import type { RouteContext, RouteDefinition } from "../types.js";

function findRoute(method: "GET" | "POST" | "PATCH", template: string): RouteDefinition {
  const route = routes.find(
    (entry) => entry.method === method && entry.template === template,
  );
  if (route == null) {
    throw new Error(`Route not found: ${method} ${template}`);
  }
  return route;
}

function makeContext(
  method: "GET" | "POST" | "PATCH",
  path: string,
  query = "",
): RouteContext {
  return {
    method,
    path,
    query: new URLSearchParams(query),
    requestId: "req-test",
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    params: {},
    body: null,
    user: {
      userId: "user-test",
      email: "ops.client@praedixa.com",
      organizationId: "org-1",
      role: "viewer",
      siteIds: ["site-lyon"],
      permissions: [],
    },
  };
}

function makeAdminContext(
  method: "GET" | "POST" | "PATCH",
  path: string,
  query = "",
): RouteContext {
  return {
    ...makeContext(method, path, query),
    user: {
      userId: "admin-test",
      email: "admin@praedixa.com",
      organizationId: "org-admin",
      role: "super_admin",
      siteIds: [],
      permissions: [],
    },
  };
}

const originalDemoMode = process.env.DEMO_MODE;
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  process.env.DEMO_MODE = "true";
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (originalDemoMode == null) {
    delete process.env.DEMO_MODE;
  } else {
    process.env.DEMO_MODE = originalDemoMode;
  }

  if (originalDatabaseUrl == null) {
    delete process.env.DATABASE_URL;
    return;
  }
  process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("live route contracts", () => {
  it("returns platform KPI fields expected by admin app", async () => {
    const route = findRoute("GET", "/api/v1/admin/monitoring/platform");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/monitoring/platform"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      totalOrganizations: expect.any(Number),
      activeOrganizations: expect.any(Number),
      totalUsers: expect.any(Number),
      totalDatasets: expect.any(Number),
      totalForecasts: expect.any(Number),
      totalDecisions: expect.any(Number),
      ingestionSuccessRate: expect.any(Number),
      apiErrorRate: expect.any(Number),
    });
  });

  it("returns alert monitoring payload expected by admin inbox", async () => {
    const route = findRoute("GET", "/api/v1/admin/monitoring/alerts/by-org");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/monitoring/alerts/by-org"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      organizations: expect.any(Array),
      totalAlerts: expect.any(Number),
    });
  });

  it("returns missing cost parameter payload expected by admin settings", async () => {
    const route = findRoute("GET", "/api/v1/admin/monitoring/cost-params/missing");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/monitoring/cost-params/missing"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      totalOrgsWithMissing: expect.any(Number),
      totalMissingParams: expect.any(Number),
      organizations: expect.any(Array),
      orgs: expect.any(Array),
    });
  });

  it("returns organization mirror metrics expected by admin client pages", async () => {
    const route = findRoute("GET", "/api/v1/admin/monitoring/organizations/:orgId/mirror");
    const context = makeAdminContext(
      "GET",
      "/api/v1/admin/monitoring/organizations/org-1/mirror",
    );
    context.params = { orgId: "org-1" };
    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      orgId: "org-1",
      totalEmployees: expect.any(Number),
      totalSites: expect.any(Number),
      activeAlerts: expect.any(Number),
    });
  });

  it("returns dashboard summary fields expected by webapp", async () => {
    const route = findRoute("GET", "/api/v1/live/dashboard/summary");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/dashboard/summary"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      coverageHuman: expect.any(Number),
      coverageMerchandise: expect.any(Number),
      activeAlertsCount: expect.any(Number),
      forecastAccuracy: expect.any(Number),
      lastForecastDate: expect.any(String),
    });
  });

  it("returns coverage alerts as paginated response when page is provided", async () => {
    const route = findRoute("GET", "/api/v1/live/coverage-alerts");
    const result = await route.handler(
      makeContext(
        "GET",
        "/api/v1/live/coverage-alerts",
        "status=open&page=1&page_size=50",
      ),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload).toHaveProperty("pagination");
    const paginated = result.payload as {
      data: Array<Record<string, unknown>>;
      pagination: { total: number; page: number; pageSize: number };
    };
    expect(Array.isArray(paginated.data)).toBe(true);
    expect(paginated.pagination.page).toBe(1);
    expect(paginated.pagination.pageSize).toBe(50);
  });

  it("returns gold rows as paginated response", async () => {
    const route = findRoute("GET", "/api/v1/live/gold/rows");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/gold/rows", "page=1&page_size=2"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload).toHaveProperty("pagination");
  });

  it("rejects gold fixture fallback when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const route = findRoute("GET", "/api/v1/live/gold/rows");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/gold/rows", "page=1&page_size=2"),
    );

    expect(result.statusCode).toBe(400);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("INVALID_ORGANIZATION_ID");
  });

  it("rejects organization fixture fallback when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const route = findRoute("GET", "/api/v1/organizations/me");
    const context = makeContext("GET", "/api/v1/organizations/me");
    context.user = {
      ...context.user!,
      organizationId: "11111111-1111-1111-1111-111111111111",
    };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("rejects conversation mutation fallback when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const route = findRoute("POST", "/api/v1/conversations");
    const context = makeContext("POST", "/api/v1/conversations");
    context.user = {
      ...context.user!,
      organizationId: "11111111-1111-1111-1111-111111111111",
    };
    context.body = { subject: "Should fail closed" };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("rejects dashboard fixture fallback when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const route = findRoute("GET", "/api/v1/live/dashboard/summary");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/dashboard/summary"),
    );

    expect(result.statusCode).toBe(400);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("INVALID_ORGANIZATION_ID");
  });

  it("returns not found for unknown decision workspace alerts", async () => {
    const route = findRoute("GET", "/api/v1/live/decision-workspace/:alertId");
    const context = makeContext(
      "GET",
      "/api/v1/live/decision-workspace/alt-does-not-exist",
    );
    context.params = { alertId: "alt-does-not-exist" };

    const result = await route.handler(context);

    expect(result.statusCode).toBe(404);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("NOT_FOUND");
  });

  it("rejects unsupported proof pack identifiers before building the download URL", async () => {
    const route = findRoute("GET", "/api/v1/proof/pdf");
    const result = await route.handler(
      makeContext("GET", "/api/v1/proof/pdf", "proof_pack_id=../tenant-secrets"),
    );

    expect(result.statusCode).toBe(400);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("INVALID_PROOF_PACK_ID");
  });

  it("validates public contact requests before accepting them", async () => {
    const route = findRoute("POST", "/api/v1/public/contact-requests");

    const invalidResult = await route.handler({
      ...makeContext("POST", "/api/v1/public/contact-requests"),
      user: null,
      body: {
        companyName: "Acme Logistics",
        email: "invalid-email",
        message: "trop court",
        consent: false,
      },
    });
    expect(invalidResult.statusCode).toBe(422);

    const validResult = await route.handler({
      ...makeContext("POST", "/api/v1/public/contact-requests"),
      user: null,
      body: {
        companyName: "Acme Logistics",
        firstName: "Alice",
        lastName: "Martin",
        role: "Operations Director",
        email: "ops@acme.test",
        message:
          "Nous souhaitons organiser un audit historique du staffing sur deux sites pilotes pour valider le ROI.",
        consent: true,
      },
    });
    expect(validResult.statusCode).toBe(201);
    expect(validResult.payload.success).toBe(true);
  });

  it("scopes live data to the authenticated user's siteIds", async () => {
    const alertsRoute = findRoute("GET", "/api/v1/live/coverage-alerts");
    const alertsResult = await alertsRoute.handler(
      makeContext("GET", "/api/v1/live/coverage-alerts"),
    );
    expect(alertsResult.statusCode).toBe(200);
    expect(alertsResult.payload.success).toBe(true);
    if (!alertsResult.payload.success) {
      throw new Error("expected success payload");
    }

    const alerts = alertsResult.payload.data as Array<Record<string, unknown>>;
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts.every((alert) => alert.siteId === "site-lyon")).toBe(true);

    const goldRowsRoute = findRoute("GET", "/api/v1/live/gold/rows");
    const goldRowsResult = await goldRowsRoute.handler(
      makeContext("GET", "/api/v1/live/gold/rows"),
    );
    expect(goldRowsResult.statusCode).toBe(200);
    expect(goldRowsResult.payload.success).toBe(true);
    if (!goldRowsResult.payload.success) {
      throw new Error("expected success payload");
    }

    const goldRows = goldRowsResult.payload.data as Array<Record<string, unknown>>;
    expect(goldRows.length).toBeGreaterThan(0);
    expect(goldRows.every((row) => row.site_id === "site-lyon")).toBe(true);
  });

  it("returns canonical quality dashboard fields", async () => {
    const route = findRoute("GET", "/api/v1/live/canonical/quality");
    const result = await route.handler(
      makeContext("GET", "/api/v1/live/canonical/quality"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      totalRecords: expect.any(Number),
      coveragePct: expect.any(Number),
      sites: expect.any(Number),
      dateRange: expect.any(Array),
      missingShiftsPct: expect.any(Number),
      avgAbsPct: expect.any(Number),
    });
  });

  it("returns unread fields expected by admin app", async () => {
    const route = findRoute("GET", "/api/v1/admin/conversations/unread-count");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/conversations/unread-count"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    expect(result.payload.data).toMatchObject({
      unreadCount: expect.any(Number),
      total: expect.any(Number),
      byOrg: expect.any(Array),
    });
  });

  it("returns organization list fields expected by admin clients table", async () => {
    const route = findRoute("GET", "/api/v1/admin/organizations");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/organizations"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }
    const data = result.payload.data as Array<Record<string, unknown>>;
    expect(data[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      slug: expect.any(String),
      status: expect.any(String),
      plan: expect.any(String),
      contactEmail: expect.any(String),
      userCount: expect.any(Number),
      siteCount: expect.any(Number),
    });
  });

  it("returns organization detail and billing plan fields expected by admin pages", async () => {
    const orgRoute = findRoute("GET", "/api/v1/admin/organizations/:orgId");
    const orgContext = makeAdminContext(
      "GET",
      "/api/v1/admin/organizations/org-1",
    );
    orgContext.params = { orgId: "org-1" };
    const orgResult = await orgRoute.handler(
      orgContext,
    );
    expect(orgResult.statusCode).toBe(200);
    expect(orgResult.payload.success).toBe(true);
    if (!orgResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect(orgResult.payload.data).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      plan: expect.any(String),
      sites: expect.any(Array),
    });

    const billingRoute = findRoute(
      "GET",
      "/api/v1/admin/billing/organizations/:orgId",
    );
    const billingContext = makeAdminContext(
      "GET",
      "/api/v1/admin/billing/organizations/org-1",
    );
    billingContext.params = { orgId: "org-1" };
    const billingResult = await billingRoute.handler(
      billingContext,
    );
    expect(billingResult.statusCode).toBe(200);
    expect(billingResult.payload.success).toBe(true);
    if (!billingResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect(billingResult.payload.data).toMatchObject({
      organizationId: expect.any(String),
      plan: expect.any(String),
    });
  });

  it("rejects stubbed admin monitoring when demo mode is disabled", async () => {
    process.env.DEMO_MODE = "false";

    const route = findRoute("GET", "/api/v1/admin/monitoring/platform");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/monitoring/platform"),
    );

    expect(result.statusCode).toBe(503);
    expect(result.payload.success).toBe(false);
    if (result.payload.success) {
      throw new Error("expected error payload");
    }
    expect(result.payload.error.code).toBe("PERSISTENCE_UNAVAILABLE");
  });

  it("returns audit log fields expected by admin journal page", async () => {
    const route = findRoute("GET", "/api/v1/admin/audit-log");
    const result = await route.handler(
      makeAdminContext("GET", "/api/v1/admin/audit-log"),
    );

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }

    const rows = result.payload.data as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({
      id: expect.any(String),
      adminUserId: expect.any(String),
      targetOrgId: expect.any(String),
      action: expect.any(String),
      resourceType: expect.any(String),
      ipAddress: expect.any(String),
      metadataJson: expect.any(Object),
      severity: expect.any(String),
      createdAt: expect.any(String),
    });
  });

  it("returns organization overview payload expected by admin dashboard workspace", async () => {
    const route = findRoute("GET", "/api/v1/admin/organizations/:orgId/overview");
    const context = makeAdminContext(
      "GET",
      "/api/v1/admin/organizations/org-1/overview",
    );
    context.params = { orgId: "org-1" };
    const result = await route.handler(context);

    expect(result.statusCode).toBe(200);
    expect(result.payload.success).toBe(true);
    if (!result.payload.success) {
      throw new Error("expected success payload");
    }

    const data = result.payload.data as Record<string, unknown>;
    expect(data).toMatchObject({
      organization: expect.any(Object),
      mirror: expect.any(Object),
      billing: expect.any(Object),
      alerts: expect.any(Array),
      scenarios: expect.any(Array),
    });
  });

  it("prevents cross-tenant access to conversations", async () => {
    const createRoute = findRoute("POST", "/api/v1/conversations");
    const createResult = await createRoute.handler(
      {
        ...makeContext("POST", "/api/v1/conversations"),
        body: { subject: "Conversation scope test" },
      },
    );
    expect(createResult.statusCode).toBe(201);
    expect(createResult.payload.success).toBe(true);
    if (!createResult.payload.success) {
      throw new Error("expected success payload");
    }

    const conversation = createResult.payload.data as Record<string, unknown>;
    const conversationId = String(conversation.id ?? "");
    expect(conversationId.length).toBeGreaterThan(0);

    const otherTenantContext: RouteContext = {
      ...makeContext("GET", `/api/v1/conversations/${conversationId}/messages`),
      path: `/api/v1/conversations/${conversationId}/messages`,
      params: { convId: conversationId },
      user: {
        userId: "user-other-tenant",
        email: "other@praedixa.com",
        organizationId: "org-2",
        role: "viewer",
        siteIds: ["site-orleans"],
        permissions: [],
      },
    };

    const messagesRoute = findRoute("GET", "/api/v1/conversations/:convId/messages");
    const messagesResult = await messagesRoute.handler(otherTenantContext);
    expect(messagesResult.statusCode).toBe(404);

    const listRoute = findRoute("GET", "/api/v1/conversations");
    const listResult = await listRoute.handler({
      ...otherTenantContext,
      method: "GET",
      path: "/api/v1/conversations",
      params: {},
    });
    expect(listResult.statusCode).toBe(200);
    expect(listResult.payload.success).toBe(true);
    if (!listResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect(
      (listResult.payload.data as Array<Record<string, unknown>>).some(
        (entry) => String(entry.id ?? "") === conversationId,
      ),
    ).toBe(false);
  });

  it("returns integration catalog and supports full admin connection flow", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const previousRuntimeUrl = process.env.CONNECTORS_RUNTIME_URL;
    const previousRuntimeToken = process.env.CONNECTORS_RUNTIME_TOKEN;
    process.env.CONNECTORS_RUNTIME_URL = "http://127.0.0.1:8100";
    process.env.CONNECTORS_RUNTIME_TOKEN = "t".repeat(32);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              vendor: "salesforce",
              label: "Salesforce CRM",
              domain: "crm",
              authModes: ["oauth2"],
              sourceObjects: ["Account"],
              recommendedSyncMinutes: 30,
              medallionTargets: ["bronze", "silver", "gold"],
            },
            {
              vendor: "ukg",
              label: "UKG Workforce",
              domain: "wfm",
              authModes: ["oauth2"],
              sourceObjects: ["Employees"],
              recommendedSyncMinutes: 30,
              medallionTargets: ["bronze", "silver", "gold"],
            },
            {
              vendor: "toast",
              label: "Toast POS",
              domain: "pos",
              authModes: ["oauth2"],
              sourceObjects: ["Orders"],
              recommendedSyncMinutes: 15,
              medallionTargets: ["bronze", "silver", "gold"],
            },
            {
              vendor: "olo",
              label: "Olo Ordering",
              domain: "pos",
              authModes: ["api_key"],
              sourceObjects: ["Orders"],
              recommendedSyncMinutes: 15,
              medallionTargets: ["bronze", "silver", "gold"],
            },
            {
              vendor: "geotab",
              label: "Geotab Telematics",
              domain: "telematics",
              authModes: ["api_key"],
              sourceObjects: ["Trip"],
              recommendedSyncMinutes: 10,
              medallionTargets: ["bronze", "silver", "gold"],
            },
            {
              vendor: "ncr_aloha",
              label: "NCR Aloha",
              domain: "pos",
              authModes: ["api_key"],
              sourceObjects: ["Check"],
              recommendedSyncMinutes: 15,
              medallionTargets: ["bronze", "silver", "gold"],
            },
          ],
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            id: "conn-1",
            organizationId: "org-integration-test",
            vendor: "salesforce",
            displayName: "Salesforce Pilot",
            authMode: "oauth2",
            status: "pending",
            authorizationState: "not_started",
            secretRef: "memory://connectors/org-integration-test/conn-1/oauth2_client/v1",
            config: {
              authorizationEndpoint: "https://login.example.test/authorize",
              tokenEndpoint: "https://login.example.test/token",
            },
            lastSuccessfulSyncAt: null,
            nextScheduledSyncAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            authorizationUrl: "https://login.example.test/authorize?state=abc",
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            state: "state-1234567890123456",
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            authorized: true,
            secretRef: "memory://connectors/org-integration-test/conn-1/oauth2_token/v2",
            secretVersion: 2,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            scopes: ["api", "refresh_token"],
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            ok: true,
            latencyMs: 120,
            checkedScopes: ["api", "refresh_token"],
            warnings: [],
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          success: true,
          data: {
            id: "run-1",
            organizationId: "org-integration-test",
            connectionId: "conn-1",
            triggerType: "manual",
            status: "queued",
            recordsFetched: 0,
            recordsWritten: 0,
            errorClass: null,
            errorMessage: null,
            startedAt: null,
            endedAt: null,
            createdAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              id: "run-1",
              organizationId: "org-integration-test",
              connectionId: "conn-1",
              triggerType: "manual",
              status: "queued",
              recordsFetched: 0,
              recordsWritten: 0,
              errorClass: null,
              errorMessage: null,
              startedAt: null,
              endedAt: null,
              createdAt: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: {
            credential: {
              id: "cred-1",
              organizationId: "org-integration-test",
              connectionId: "conn-1",
              label: "CRM outbound",
              keyId: "key-1",
              authMode: "bearer_hmac",
              secretRef: "memory://secret",
              secretVersion: 1,
              tokenPreview: "prdx_live_",
              allowedSourceObjects: ["Account"],
              allowedIpAddresses: null,
              expiresAt: null,
              lastUsedAt: null,
              revokedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            apiKey: "prdx_live_secret",
            signingSecret: "prdx_sig_secret",
            ingestUrl: "https://connectors.praedixa.test/v1/ingest/org-integration-test/conn-1/events",
            authScheme: "Bearer",
            signature: {
              algorithm: "hmac-sha256",
              keyIdHeader: "X-Praedixa-Key-Id",
              timestampHeader: "X-Praedixa-Timestamp",
              signatureHeader: "X-Praedixa-Signature",
            },
          },
          timestamp: new Date().toISOString(),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [
            {
              id: "evt-1",
              organizationId: "org-integration-test",
              connectionId: "conn-1",
              credentialId: "cred-1",
              eventId: "evt-1",
              sourceObject: "Account",
              sourceRecordId: "001",
              sourceUpdatedAt: "2026-03-06T10:00:00.000Z",
              schemaVersion: "crm.account.v1",
              contentType: "application/json",
              payloadSha256: "abc123",
              payloadPreview: { name: "Acme" },
              sizeBytes: 128,
              idempotencyKey: "ingest-key-1",
              receivedAt: new Date().toISOString(),
            },
          ],
          timestamp: new Date().toISOString(),
        }),
      });

    try {
    const catalogRoute = findRoute("GET", "/api/v1/admin/integrations/catalog");
    const catalogResult = await catalogRoute.handler(
      makeAdminContext("GET", "/api/v1/admin/integrations/catalog"),
    );
    expect(catalogResult.statusCode).toBe(200);
    expect(catalogResult.payload.success).toBe(true);
    if (!catalogResult.payload.success) {
      throw new Error("expected success payload");
    }
    const catalog = catalogResult.payload.data as Array<Record<string, unknown>>;
    expect(catalog.length).toBeGreaterThan(5);
    expect(catalog.some((entry) => entry.vendor === "salesforce")).toBe(true);

    const orgId = "org-integration-test";
    const createRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections",
    );
    const createCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections`,
    );
    createCtx.params = { orgId };
    createCtx.body = {
      vendor: "salesforce",
      displayName: "Salesforce Pilot",
      authMode: "oauth2",
      credentials: {
        clientId: "salesforce-client-id",
        clientSecret: "salesforce-client-secret-123",
      },
      config: {
        authorizationEndpoint: "https://login.example.test/authorize",
        tokenEndpoint: "https://login.example.test/token",
      },
    };
    const createResult = await createRoute.handler(createCtx);
    expect(createResult.statusCode).toBe(201);
    expect(createResult.payload.success).toBe(true);
    if (!createResult.payload.success) {
      throw new Error("expected success payload");
    }

    const connection = createResult.payload.data as Record<string, unknown>;
    const connectionId = connection.id as string;
    expect(connectionId).toEqual(expect.any(String));

    const authStartRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/start",
    );
    const authStartCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/authorize/start`,
    );
    authStartCtx.params = { orgId, connectionId };
    authStartCtx.body = {
      redirectUri: "https://praedixa.test/oauth/callback",
    };
    const authStartResult = await authStartRoute.handler(authStartCtx);
    expect(authStartResult.statusCode).toBe(200);
    expect(authStartResult.payload.success).toBe(true);

    const authCompleteRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/complete",
    );
    const authCompleteCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/authorize/complete`,
    );
    authCompleteCtx.params = { orgId, connectionId };
    authCompleteCtx.body = {
      state: "state-1234567890123456",
      code: "authorization-code-123",
    };
    const authCompleteResult = await authCompleteRoute.handler(authCompleteCtx);
    expect(authCompleteResult.statusCode).toBe(200);
    expect(authCompleteResult.payload.success).toBe(true);

    const testRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/test",
    );
    const testCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/test`,
    );
    testCtx.params = { orgId, connectionId };
    const testResult = await testRoute.handler(testCtx);
    expect(testResult.statusCode).toBe(200);
    expect(testResult.payload.success).toBe(true);

    const syncRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/sync",
    );
    const syncCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/sync`,
    );
    syncCtx.params = { orgId, connectionId };
    syncCtx.body = { triggerType: "manual" };
    const syncResult = await syncRoute.handler(syncCtx);
    expect(syncResult.statusCode).toBe(202);
    expect(syncResult.payload.success).toBe(true);

    const runsRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/integrations/sync-runs",
    );
    const runsCtx = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${orgId}/integrations/sync-runs`,
    );
    runsCtx.params = { orgId };
    const runsResult = await runsRoute.handler(runsCtx);
    expect(runsResult.statusCode).toBe(200);
    expect(runsResult.payload.success).toBe(true);
    if (!runsResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect((runsResult.payload.data as unknown[]).length).toBeGreaterThan(0);

    const issueCredentialRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials",
    );
    const issueCredentialCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/ingest-credentials`,
    );
    issueCredentialCtx.params = { orgId, connectionId };
    issueCredentialCtx.body = {
      label: "CRM outbound",
      requireSignature: true,
    };
    const issueCredentialResult = await issueCredentialRoute.handler(issueCredentialCtx);
    expect(issueCredentialResult.statusCode).toBe(201);
    expect(issueCredentialResult.payload.success).toBe(true);

    const rawEventsRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/raw-events",
    );
    const rawEventsCtx = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${orgId}/integrations/connections/${connectionId}/raw-events`,
    );
    rawEventsCtx.params = { orgId, connectionId };
    const rawEventsResult = await rawEventsRoute.handler(rawEventsCtx);
    expect(rawEventsResult.statusCode).toBe(200);
    expect(rawEventsResult.payload.success).toBe(true);
    if (!rawEventsResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect((rawEventsResult.payload.data as unknown[]).length).toBe(1);
    } finally {
      vi.unstubAllGlobals();
      process.env.CONNECTORS_RUNTIME_URL = previousRuntimeUrl;
      process.env.CONNECTORS_RUNTIME_TOKEN = previousRuntimeToken;
    }
  });

  it("manages admin user lifecycle from invite to activation", async () => {
    const orgId = "org-users-lifecycle";

    const listRoute = findRoute("GET", "/api/v1/admin/organizations/:orgId/users");
    const inviteRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/users/invite",
    );
    const patchRoleRoute = findRoute(
      "PATCH",
      "/api/v1/admin/organizations/:orgId/users/:userId/role",
    );
    const deactivateRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
    );
    const reactivateRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
    );
    const getUserRoute = findRoute(
      "GET",
      "/api/v1/admin/organizations/:orgId/users/:userId",
    );

    const listBeforeCtx = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${orgId}/users`,
    );
    listBeforeCtx.params = { orgId };
    const listBefore = await listRoute.handler(listBeforeCtx);
    expect(listBefore.statusCode).toBe(200);
    expect(listBefore.payload.success).toBe(true);
    if (!listBefore.payload.success) {
      throw new Error("expected success payload");
    }
    expect(listBefore.payload.data).toEqual([]);

    const inviteCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/users/invite`,
    );
    inviteCtx.params = { orgId };
    inviteCtx.body = {
      email: "new.manager@praedixa.com",
      role: "manager",
      fullName: "New Manager",
    };
    const inviteResult = await inviteRoute.handler(inviteCtx);
    expect(inviteResult.statusCode).toBe(201);
    expect(inviteResult.payload.success).toBe(true);
    if (!inviteResult.payload.success) {
      throw new Error("expected success payload");
    }

    const invitedUser = inviteResult.payload.data as Record<string, unknown>;
    const userId = invitedUser.id as string;
    expect(invitedUser).toMatchObject({
      organizationId: orgId,
      email: "new.manager@praedixa.com",
      role: "manager",
      status: "pending_invite",
    });

    const listAfterCtx = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${orgId}/users`,
    );
    listAfterCtx.params = { orgId };
    const listAfter = await listRoute.handler(listAfterCtx);
    expect(listAfter.statusCode).toBe(200);
    expect(listAfter.payload.success).toBe(true);
    if (!listAfter.payload.success) {
      throw new Error("expected success payload");
    }
    expect((listAfter.payload.data as unknown[]).length).toBe(1);

    const patchRoleCtx = makeAdminContext(
      "PATCH",
      `/api/v1/admin/organizations/${orgId}/users/${userId}/role`,
    );
    patchRoleCtx.params = { orgId, userId };
    patchRoleCtx.body = { role: "hr_manager" };
    const patchRoleResult = await patchRoleRoute.handler(patchRoleCtx);
    expect(patchRoleResult.statusCode).toBe(200);
    expect(patchRoleResult.payload.success).toBe(true);
    if (!patchRoleResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect((patchRoleResult.payload.data as Record<string, unknown>).role).toBe(
      "hr_manager",
    );

    const deactivateCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/users/${userId}/deactivate`,
    );
    deactivateCtx.params = { orgId, userId };
    const deactivateResult = await deactivateRoute.handler(deactivateCtx);
    expect(deactivateResult.statusCode).toBe(200);
    expect(deactivateResult.payload.success).toBe(true);
    if (!deactivateResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect((deactivateResult.payload.data as Record<string, unknown>).status).toBe(
      "deactivated",
    );

    const reactivateCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/users/${userId}/reactivate`,
    );
    reactivateCtx.params = { orgId, userId };
    const reactivateResult = await reactivateRoute.handler(reactivateCtx);
    expect(reactivateResult.statusCode).toBe(200);
    expect(reactivateResult.payload.success).toBe(true);
    if (!reactivateResult.payload.success) {
      throw new Error("expected success payload");
    }
    expect((reactivateResult.payload.data as Record<string, unknown>).status).toBe(
      "active",
    );

    const getUserCtx = makeAdminContext(
      "GET",
      `/api/v1/admin/organizations/${orgId}/users/${userId}`,
    );
    getUserCtx.params = { orgId, userId };
    const getUserResult = await getUserRoute.handler(getUserCtx);
    expect(getUserResult.statusCode).toBe(200);
    expect(getUserResult.payload.success).toBe(true);
  });

  it("rejects super_admin invitations from admin workspace", async () => {
    const orgId = "org-users-guard";
    const inviteRoute = findRoute(
      "POST",
      "/api/v1/admin/organizations/:orgId/users/invite",
    );

    const inviteCtx = makeAdminContext(
      "POST",
      `/api/v1/admin/organizations/${orgId}/users/invite`,
    );
    inviteCtx.params = { orgId };
    inviteCtx.body = { email: "blocked@praedixa.com", role: "super_admin" };
    const inviteResult = await inviteRoute.handler(inviteCtx);

    expect(inviteResult.statusCode).toBe(422);
    expect(inviteResult.payload.success).toBe(false);
  });
});
