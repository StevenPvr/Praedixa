import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetPersistentAdminOrgMirror = vi.fn();

vi.mock("../services/admin-monitoring.js", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "../services/admin-monitoring.js",
  );
  return {
    ...actual,
    getPersistentAdminOrgMirror: (...args: unknown[]) =>
      mockGetPersistentAdminOrgMirror(...args),
  };
});

import { routes } from "../routes.js";
import { getAdminBackofficeService } from "../services/admin-backoffice.js";
import type { RouteContext, RouteDefinition } from "../types.js";

const TARGET_ORG_ID = "33333333-3333-4333-8333-333333333333";

function findRoute(template: string): RouteDefinition {
  const route = routes.find(
    (entry) => entry.method === "GET" && entry.template === template,
  );
  if (route == null) {
    throw new Error(`Route not found: GET ${template}`);
  }
  return route;
}

function makeAdminContext(path: string): RouteContext {
  return {
    method: "GET",
    path,
    query: new URLSearchParams(),
    requestId: "req-overview",
    telemetry: {
      requestId: "req-overview",
      traceId: "trace-overview",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: TARGET_ORG_ID,
      siteId: null,
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    headers: {},
    params: { orgId: TARGET_ORG_ID },
    body: null,
    rawBody: null,
    rawBodyBytes: null,
    user: {
      userId: "admin-test",
      email: "admin@praedixa.com",
      organizationId: TARGET_ORG_ID,
      role: "super_admin",
      siteIds: [],
      permissions: ["admin:org:read"],
    },
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin organization overview route", () => {
  it("returns a persistent overview payload for the client dashboard", async () => {
    const route = findRoute("/api/v1/admin/organizations/:orgId/overview");
    const service = getAdminBackofficeService();
    const originalPool = Reflect.get(
      service as unknown as Record<string, unknown>,
      "pool",
    );

    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (
        sql.includes("FROM organizations o") &&
        sql.includes("o.sector::text")
      ) {
        expect(params).toEqual([TARGET_ORG_ID]);
        return {
          rows: [
            {
              id: TARGET_ORG_ID,
              name: "Acme Logistics",
              slug: "acme-logistics",
              status: "active",
              plan: "professional",
              contact_email: "ops@acme.fr",
              settings: { adminBackoffice: { isTest: false } },
              sector: "logistics",
              size: "mid_market",
              user_count: "12",
              site_count: "1",
              created_at: new Date("2026-03-01T08:00:00.000Z"),
            },
          ],
        };
      }

      if (
        sql.includes("FROM sites s") &&
        sql.includes("LEFT JOIN departments d")
      ) {
        expect(params).toEqual([TARGET_ORG_ID]);
        return {
          rows: [
            {
              site_id: "77777777-7777-4777-8777-777777777777",
              site_name: "Lyon",
              site_city: "Lyon",
              department_id: "88888888-8888-4888-8888-888888888888",
              department_name: "Exploitants",
              department_headcount: "14",
            },
          ],
        };
      }

      if (sql.includes("forecast_count")) {
        expect(params).toEqual([TARGET_ORG_ID]);
        return {
          rows: [
            {
              plan: "professional",
              user_count: "12",
              site_count: "1",
              dataset_count: "4",
              forecast_count: "9",
            },
          ],
        };
      }

      if (sql.includes("FROM coverage_alerts ca")) {
        expect(params).toEqual([TARGET_ORG_ID, 5]);
        return {
          rows: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              alert_date: new Date("2026-03-12T00:00:00.000Z"),
              alert_type: "j7",
              severity: "high",
              status: "open",
              site_id: "77777777-7777-4777-8777-777777777777",
              site_name: "Lyon",
            },
          ],
        };
      }

      if (sql.includes("FROM scenario_options so")) {
        expect(params).toEqual([TARGET_ORG_ID, 5]);
        return {
          rows: [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              name: "Renfort interim",
              status: "recommended",
              created_at: new Date("2026-03-11T10:00:00.000Z"),
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in overview route test: ${sql}`);
    });

    Reflect.set(service as unknown as Record<string, unknown>, "pool", {
      query,
    } as unknown);
    mockGetPersistentAdminOrgMirror.mockResolvedValue({
      totalEmployees: 42,
      totalSites: 1,
      activeAlerts: 3,
      forecastAccuracy: 0.91,
      avgAbsenteeism: 0.08,
      coverageRate: 0.95,
    });

    try {
      const result = await route.handler(
        makeAdminContext(
          `/api/v1/admin/organizations/${TARGET_ORG_ID}/overview`,
        ),
      );

      expect(result.statusCode).toBe(200);
      expect(result.payload.success).toBe(true);
      if (!result.payload.success) {
        throw new Error("expected success payload");
      }
      expect(result.payload.data).toEqual({
        organization: {
          id: TARGET_ORG_ID,
          name: "Acme Logistics",
          slug: "acme-logistics",
          status: "active",
          plan: "professional",
          contactEmail: "ops@acme.fr",
          isTest: false,
          sector: "logistics",
          size: "mid_market",
          userCount: 12,
          siteCount: 1,
          createdAt: "2026-03-01T08:00:00.000Z",
          sites: [
            {
              id: "77777777-7777-4777-8777-777777777777",
              name: "Lyon",
              city: "Lyon",
              departments: [
                {
                  id: "88888888-8888-4888-8888-888888888888",
                  name: "Exploitants",
                  employeeCount: 14,
                },
              ],
            },
          ],
        },
        mirror: {
          totalEmployees: 42,
          totalSites: 1,
          activeAlerts: 3,
          forecastAccuracy: 0.91,
          avgAbsenteeism: 0.08,
          coverageRate: 0.95,
        },
        billing: {
          organizationId: TARGET_ORG_ID,
          plan: "professional",
          billingCycle: "monthly",
          monthlyAmount: null,
          currentUsage: 9,
          usageLimit: 500,
          nextBillingDate: expect.any(String),
        },
        alerts: [
          {
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            date: "2026-03-12T00:00:00.000Z",
            type: "j7",
            severity: "high",
            status: "open",
            siteId: "77777777-7777-4777-8777-777777777777",
            siteName: "Lyon",
          },
        ],
        scenarios: [
          {
            id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            name: "Renfort interim",
            status: "recommended",
            createdAt: "2026-03-11T10:00:00.000Z",
          },
        ],
      });
    } finally {
      Reflect.set(
        service as unknown as Record<string, unknown>,
        "pool",
        originalPool,
      );
    }
  });
});
