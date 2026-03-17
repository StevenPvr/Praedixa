import { afterEach, describe, expect, it, vi } from "vitest";

import { routes } from "../routes.js";
import { compileRoutes, matchRoute } from "../router.js";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  clearRateLimitBuckets,
  consumeRateLimit,
  createAppServer,
  isJsonContentType,
  normalizeOrigin,
  resolveClientIp,
  resolveRateLimitPolicy,
  resolveCorsHeaders,
  SECURITY_HEADERS,
} from "../server.js";
import type { RouteContext } from "../types.js";

const TEST_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const nativeFetch = globalThis.fetch.bind(globalThis);

function buildRouteContext(
  overrides: Partial<RouteContext> = {},
): RouteContext {
  return {
    method: "GET",
    path: "/",
    query: new URLSearchParams(),
    requestId: "req-test",
    telemetry: {
      requestId: "req-test",
      traceId: "trace-test",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: TEST_ORGANIZATION_ID,
      siteId: "site-lyon",
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    params: {},
    body: null,
    user: {
      userId: "user-1",
      email: "user@praedixa.test",
      organizationId: TEST_ORGANIZATION_ID,
      role: "viewer",
      siteIds: ["site-lyon"],
      permissions: [],
    },
    ...overrides,
  };
}

describe("api transport and authorization guards", () => {
  afterEach(() => {
    clearRateLimitBuckets();
    vi.unstubAllEnvs();
  });

  it("keeps mandatory transport security headers enabled", () => {
    expect(SECURITY_HEADERS).toEqual({
      "Content-Security-Policy":
        "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    });
  });

  it("requires super_admin role for all /api/v1/admin routes", () => {
    const adminRoutes = routes.filter((entry) =>
      entry.template.startsWith("/api/v1/admin"),
    );

    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const route of adminRoutes) {
      expect(route.allowedRoles).toContain("super_admin");
      expect(route.allowedRoles).not.toContain("org_admin");
      expect(route.requiredPermissions).not.toBeNull();
      expect((route.requiredPermissions ?? []).length).toBeGreaterThan(0);
    }
  });

  it("keeps admin user-management routes fail-closed against role escalation", () => {
    const privilegedUserRoutes = [
      {
        template: "/api/v1/admin/organizations/:orgId/users",
        permission: "admin:users:read",
      },
      {
        template: "/api/v1/admin/organizations/:orgId/users/:userId/role",
        permission: "admin:users:write",
      },
      {
        template: "/api/v1/admin/organizations/:orgId/users/:userId",
        permission: "admin:users:read",
      },
      {
        template: "/api/v1/admin/organizations/:orgId/users/invite",
        permission: "admin:users:write",
      },
      {
        template: "/api/v1/admin/organizations/:orgId/users/:userId/deactivate",
        permission: "admin:users:write",
      },
      {
        template: "/api/v1/admin/organizations/:orgId/users/:userId/reactivate",
        permission: "admin:users:write",
      },
    ] as const;

    for (const { template, permission } of privilegedUserRoutes) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();
      expect(route?.authRequired).toBe(true);
      expect(route?.allowedRoles).toEqual(["super_admin"]);
      expect(route?.requiredPermissions).toContain(permission);
    }
  });

  it("keeps decision contract and action dispatch admin routes fail-closed against org privilege drift", () => {
    const guardedAdminRoutes = [
      {
        template: "/api/v1/admin/organizations/:orgId/decision-contracts",
        permission: "admin:org:read",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion",
        permission: "admin:org:read",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/transition",
        permission: "admin:org:write",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/fork",
        permission: "admin:org:write",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
        permission: "admin:org:read",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision",
        permission: "admin:org:write",
      },
      {
        template:
          "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback",
        permission: "admin:org:write",
      },
    ] as const;

    for (const { template, permission } of guardedAdminRoutes) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();
      expect(route?.authRequired).toBe(true);
      expect(route?.allowedRoles).toEqual(["super_admin"]);
      expect(route?.requiredPermissions).toContain(permission);
    }
  });

  it("matches static admin unread-count route before dynamic conversation id route", () => {
    const matched = matchRoute(
      compileRoutes(routes),
      "GET",
      "/api/v1/admin/conversations/unread-count",
    );
    expect(matched).not.toBeNull();
    expect(matched?.route.template).toBe(
      "/api/v1/admin/conversations/unread-count",
    );
  });

  it("keeps public endpoints explicitly unauthenticated", () => {
    const publicRoutes = routes
      .filter((entry) => !entry.authRequired)
      .map((entry) => entry.template)
      .sort();

    expect(publicRoutes).toEqual([
      "/api/v1/health",
      "/api/v1/public/contact-requests",
    ]);
  });

  it("normalizes valid origin header values", () => {
    expect(normalizeOrigin("http://localhost:3001")).toBe(
      "http://localhost:3001",
    );
    expect(normalizeOrigin("::invalid::")).toBeNull();
    expect(normalizeOrigin(undefined)).toBeNull();
  });

  it("builds CORS headers only for allowlisted origins", () => {
    const allowlistedHeaders = resolveCorsHeaders("http://localhost:3001", [
      "http://localhost:3001",
    ]);
    expect(allowlistedHeaders).toEqual({
      "Access-Control-Allow-Origin": "http://localhost:3001",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });

    expect(
      resolveCorsHeaders("http://localhost:3999", ["http://localhost:3001"]),
    ).toEqual({});
    expect(resolveCorsHeaders(null, ["http://localhost:3001"])).toEqual({});
  });

  it("trusts forwarded client IPs only when proxy trust is explicit", () => {
    expect(resolveClientIp("203.0.113.10, 10.0.0.4", "10.0.0.4", false)).toBe(
      "10.0.0.4",
    );
    expect(resolveClientIp("203.0.113.10, 10.0.0.4", "10.0.0.4", true)).toBe(
      "203.0.113.10",
    );
  });

  it("allows private LAN origins during development", () => {
    expect(
      resolveCorsHeaders("http://10.188.106.147:3002", [], "development"),
    ).toEqual({
      "Access-Control-Allow-Origin": "http://10.188.106.147:3002",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
  });

  it("allows any http origin during development", () => {
    expect(
      resolveCorsHeaders("http://dev.localhost.test:3002", [], "development"),
    ).toEqual({
      "Access-Control-Allow-Origin": "http://dev.localhost.test:3002",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
  });

  it("rejects private LAN origins outside development", () => {
    expect(
      resolveCorsHeaders("http://10.188.106.147:3002", [], "production"),
    ).toEqual({});
  });

  it("accepts only JSON media types for request bodies", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType(["application/json"])).toBe(true);
    expect(isJsonContentType("text/plain")).toBe(false);
    expect(isJsonContentType(undefined)).toBe(false);
  });

  it("assigns stricter rate limits to public contact and admin mutations", () => {
    const contactRoute = routes.find(
      (entry) => entry.template === "/api/v1/public/contact-requests",
    );
    const unreadCountRoute = routes.find(
      (entry) => entry.template === "/api/v1/conversations/unread-count",
    );
    const adminSuspendRoute = routes.find(
      (entry) =>
        entry.template === "/api/v1/admin/organizations/:orgId/suspend",
    );
    const healthRoute = routes.find(
      (entry) => entry.template === "/api/v1/health",
    );

    expect(contactRoute).toBeDefined();
    expect(unreadCountRoute).toBeDefined();
    expect(adminSuspendRoute).toBeDefined();
    expect(healthRoute).toBeDefined();

    expect(resolveRateLimitPolicy(contactRoute!)).toEqual({
      maxRequests: 5,
      scope: "ip",
      windowMs: 600000,
    });

    expect(resolveRateLimitPolicy(unreadCountRoute!)).toEqual({
      maxRequests: 120,
      scope: "principal",
      windowMs: 60000,
    });

    expect(resolveRateLimitPolicy(adminSuspendRoute!)).toEqual({
      maxRequests: 30,
      scope: "principal",
      windowMs: 60000,
    });

    expect(
      resolveRateLimitPolicy(
        routes.find(
          (entry) => entry.template === "/api/v1/admin/monitoring/platform",
        )!,
      ),
    ).toEqual({
      maxRequests: 120,
      scope: "principal",
      windowMs: 60000,
    });

    expect(resolveRateLimitPolicy(healthRoute!)).toBeNull();
  });

  it("blocks requests once a rate-limit bucket is exhausted", () => {
    const policy = {
      maxRequests: 2,
      scope: "ip",
      windowMs: 1000,
    } as const;

    expect(consumeRateLimit("contact:127.0.0.1", policy, 1000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(consumeRateLimit("contact:127.0.0.1", policy, 1500)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(consumeRateLimit("contact:127.0.0.1", policy, 1800)).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 1,
    });
  });

  it("emits structured request lifecycle logs through the shared telemetry package", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const stdoutWrite = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrWrite = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const server = createAppServer({
      port: 0,
      nodeEnv: "staging",
      trustProxy: false,
      corsOrigins: [],
      databaseUrl: null,
      connectors: {
        runtimeUrl: "https://connectors.praedixa.internal",
        runtimeAllowedHosts: ["connectors.praedixa.internal"],
        runtimeToken: "token-long-enough-1234567890abcd",
      },
      jwt: {
        issuerUrl: "https://auth.praedixa.com/realms/praedixa",
        audience: "praedixa-api",
        jwksUrl:
          "https://auth.praedixa.com/realms/praedixa/protocol/openid-connect/certs",
        algorithms: ["RS256"],
      },
    });

    try {
      const address = server.address();
      expect(address).not.toBeNull();
      expect(typeof address).toBe("object");
      const port =
        address != null && typeof address === "object" ? address.port : null;
      expect(typeof port).toBe("number");

      const response = await nativeFetch(
        `http://127.0.0.1:${port}/api/v1/health`,
        {
          headers: {
            "X-Request-ID": "req-health-123",
            "X-Trace-ID": "trace-health-123",
          },
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("x-request-id")).toBe("req-health-123");
      expect(response.headers.get("x-trace-id")).toBe("trace-health-123");
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }

    const stdoutLogs = stdoutWrite.mock.calls
      .map(([chunk]) => chunk.toString().trim())
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);

    expect(stderrWrite).not.toHaveBeenCalled();
    expect(stdoutLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          service: "api",
          env: "staging",
          event: "http.request.started",
          request_id: "req-health-123",
          trace_id: "trace-health-123",
          run_id: null,
          connector_run_id: null,
          action_id: null,
          contract_version: null,
          organization_id: null,
          site_id: null,
          status: "started",
          status_code: null,
          duration_ms: null,
          path: "/api/v1/health",
          route_template: null,
        }),
        expect.objectContaining({
          service: "api",
          env: "staging",
          event: "http.request.completed",
          request_id: "req-health-123",
          trace_id: "trace-health-123",
          run_id: null,
          connector_run_id: null,
          action_id: null,
          contract_version: null,
          organization_id: null,
          site_id: null,
          status: "completed",
          status_code: 200,
          path: "/api/v1/health",
          route_template: "/api/v1/health",
        }),
      ]),
    );
    expect(
      stdoutLogs.some(
        (entry) =>
          entry.event === "http.request.completed" &&
          typeof entry.duration_ms === "number",
      ),
    ).toBe(true);
  });

  it("fails closed on high-trust live decision routes when persistence is unavailable even if DEMO_MODE is enabled", async () => {
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("DATABASE_URL", "");

    const routeExpectations = [
      {
        template: "/api/v1/live/coverage-alerts",
        context: buildRouteContext({
          path: "/api/v1/live/coverage-alerts",
        }),
      },
      {
        template: "/api/v1/live/coverage-alerts/queue",
        context: buildRouteContext({
          path: "/api/v1/live/coverage-alerts/queue",
        }),
      },
      {
        template: "/api/v1/live/scenarios/alert/:alertId",
        context: buildRouteContext({
          path: "/api/v1/live/scenarios/alert/alt-001",
          params: { alertId: "alt-001" },
        }),
      },
      {
        template: "/api/v1/live/decision-workspace/:alertId",
        context: buildRouteContext({
          path: "/api/v1/live/decision-workspace/alt-001",
          params: { alertId: "alt-001" },
        }),
      },
      {
        template: "/api/v1/scenarios/generate/:alertId",
        context: buildRouteContext({
          method: "POST",
          path: "/api/v1/scenarios/generate/alt-001",
          params: { alertId: "alt-001" },
        }),
      },
    ] as const;

    for (const { template, context } of routeExpectations) {
      const route = routes.find((entry) => entry.template === template);
      expect(route).toBeDefined();

      const result = await route!.handler(context);
      expect(result.statusCode).toBe(503);
      expect(result.payload).toMatchObject({
        success: false,
        error: {
          code: "PERSISTENCE_UNAVAILABLE",
        },
      });
    }
  });
});
