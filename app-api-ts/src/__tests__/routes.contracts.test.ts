import { describe, expect, it } from "vitest";

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

  it("returns integration catalog and supports full admin connection flow", async () => {
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
      secretRef: "scw://secrets/org-integration-test/salesforce",
      config: { instanceUrl: "https://example.my.salesforce.com" },
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
