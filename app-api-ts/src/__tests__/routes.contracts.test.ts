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
});
