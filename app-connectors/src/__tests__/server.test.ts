import { afterEach, describe, expect, it } from "vitest";

import { routes } from "../routes.js";
import {
  buildResponseCorrelationHeaders,
  buildRequestLogEntry,
  authenticateServiceToken,
  canAccessOrganization,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  clearRateLimitBuckets,
  consumeRateLimit,
  hasRequiredCapabilities,
  isJsonContentType,
  resolveRateLimitPolicy,
  resolveClientIp,
  resolveCorsHeaders,
  resolveRequestCorrelation,
  SECURITY_HEADERS,
} from "../server.js";
import { safeEqualSecret } from "../security.js";

describe("connectors transport and auth surface", () => {
  afterEach(() => {
    clearRateLimitBuckets();
  });

  function getRoute(template: string) {
    return routes.find((entry) => entry.template === template);
  }

  it("keeps transport security headers enabled", () => {
    expect(SECURITY_HEADERS).toEqual({
      "Content-Security-Policy":
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    });
  });

  it("exposes only health and public ingest as unauthenticated routes", () => {
    const publicRoutes = routes.filter((entry) => !entry.authRequired);
    expect(publicRoutes.map((entry) => entry.template)).toEqual([
      "/health",
      "/v1/ingest/:orgId/:connectionId/events",
    ]);

    const protectedRoutes = routes.filter((entry) => entry.authRequired);
    expect(protectedRoutes.length).toBeGreaterThan(0);
    for (const route of protectedRoutes) {
      expect(route.requiredCapabilities.length).toBeGreaterThan(0);
    }
  });

  it("builds CORS headers only for allowlisted origins", () => {
    const headers = resolveCorsHeaders("http://localhost:3001", [
      "http://localhost:3001",
    ]);

    expect(headers).toEqual({
      "Access-Control-Allow-Origin": "http://localhost:3001",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    expect(CORS_ALLOWED_HEADERS).toContain("X-Run-ID");
    expect(CORS_ALLOWED_HEADERS).toContain("X-Connector-Run-ID");
    expect(
      resolveCorsHeaders("https://evil.example", ["https://app.example"]),
    ).toEqual({});
    expect(CORS_ALLOWED_HEADERS).not.toContain("X-Actor-User-ID");
  });

  it("accepts only JSON content-types for request bodies", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType(["application/json"])).toBe(true);
    expect(isJsonContentType("text/plain")).toBe(false);
    expect(isJsonContentType(undefined)).toBe(false);
  });

  it("trusts proxy headers only when TRUST_PROXY is enabled", () => {
    expect(
      resolveClientIp(
        {
          "cf-connecting-ip": "203.0.113.8",
          "x-forwarded-for": "203.0.113.9, 10.0.0.4",
        },
        "10.0.0.4",
        false,
      ),
    ).toBe("10.0.0.4");

    expect(
      resolveClientIp(
        {
          "cf-connecting-ip": "203.0.113.8",
          "x-forwarded-for": "203.0.113.9, 10.0.0.4",
        },
        "10.0.0.4",
        true,
      ),
    ).toBe("203.0.113.8");

    expect(
      resolveClientIp(
        {
          "x-forwarded-for": "203.0.113.9, 10.0.0.4",
        },
        "10.0.0.4",
        true,
      ),
    ).toBe("203.0.113.9");
  });

  it("compares internal tokens with constant-time helper", () => {
    expect(
      safeEqualSecret(
        "token-long-enough-1234567890",
        "token-long-enough-1234567890",
      ),
    ).toBe(true);
    expect(
      safeEqualSecret(
        "token-long-enough-1234567890",
        "token-long-enough-1234567891",
      ),
    ).toBe(false);
    expect(safeEqualSecret("token-long-enough-1234567890", null)).toBe(false);
  });

  it("authenticates service tokens and enforces org scoping", () => {
    const principal = authenticateServiceToken(
      [
        {
          name: "worker-a",
          token: "token-long-enough-1234567890aaaa",
          allowedOrgs: ["org-1", "org-2"],
          capabilities: ["connections:read", "sync:write"],
        },
      ],
      "Bearer token-long-enough-1234567890aaaa",
    );

    expect(principal).toEqual({
      name: "worker-a",
      allowedOrgs: ["org-1", "org-2"],
      capabilities: ["connections:read", "sync:write"],
    });
    expect(canAccessOrganization(principal!, "org-2")).toBe(true);
    expect(canAccessOrganization(principal!, "org-3")).toBe(false);
    expect(hasRequiredCapabilities(principal!, ["connections:read"])).toBe(
      true,
    );
    expect(hasRequiredCapabilities(principal!, ["connections:write"])).toBe(
      false,
    );
    expect(
      authenticateServiceToken(
        [
          {
            name: "worker-a",
            token: "token-long-enough-1234567890aaaa",
            allowedOrgs: ["org-1"],
            capabilities: ["connections:read"],
          },
        ],
        "Bearer wrong-token-long-enough-1234567890",
      ),
    ).toBeNull();
  });

  it("lets dedicated control-plane tokens access every organization", () => {
    const principal = authenticateServiceToken(
      [
        {
          name: "admin-control-plane",
          token: "token-long-enough-1234567890zzzz",
          allowedOrgs: ["global:all-orgs"],
          capabilities: ["connections:read"],
        },
      ],
      "Bearer token-long-enough-1234567890zzzz",
    );

    expect(principal).toEqual({
      name: "admin-control-plane",
      allowedOrgs: ["global:all-orgs"],
      capabilities: ["connections:read"],
    });
    expect(canAccessOrganization(principal!, "org-1")).toBe(true);
    expect(canAccessOrganization(principal!, "org-999")).toBe(true);
  });

  it("rate-limits the public ingest endpoint by client IP", () => {
    const ingestRoute = getRoute("/v1/ingest/:orgId/:connectionId/events");

    expect(resolveRateLimitPolicy(ingestRoute!)).toEqual({
      maxRequests: 120,
      scope: "ip",
      windowMs: 60_000,
    });

    const policy = ingestRoute!.rateLimit!;
    const first = consumeRateLimit("ingest:ip:203.0.113.1", policy, 1_000);
    const second = consumeRateLimit("ingest:ip:203.0.113.1", policy, 1_500);

    expect(first).toMatchObject({ allowed: true });
    expect(second).toMatchObject({ allowed: true });
  });

  it("keeps secret-bearing sync runtime routes behind dedicated runtime capabilities", () => {
    const claimRoute = getRoute("/v1/runtime/sync-runs/claim");
    const executionPlanRoute = getRoute(
      "/v1/organizations/:orgId/sync-runs/:runId/execution-plan",
    );
    const syncStateRoute = getRoute(
      "/v1/organizations/:orgId/sync-runs/:runId/sync-state",
    );
    const rawEventPayloadRoute = getRoute(
      "/v1/organizations/:orgId/connections/:connectionId/raw-events/:eventId/payload",
    );
    const rawEventsClaimRoute = getRoute(
      "/v1/organizations/:orgId/connections/:connectionId/raw-events/claim",
    );

    expect(claimRoute?.requiredCapabilities).toEqual(["sync_runtime:write"]);
    expect(executionPlanRoute?.requiredCapabilities).toEqual([
      "sync_runtime:write",
    ]);
    expect(syncStateRoute?.requiredCapabilities).toEqual([
      "sync_runtime:write",
    ]);
    expect(rawEventPayloadRoute?.requiredCapabilities).toEqual([
      "raw_events_runtime:write",
    ]);
    expect(rawEventsClaimRoute?.requiredCapabilities).toEqual([
      "raw_events_runtime:write",
    ]);
  });

  it("builds structured request lifecycle logs with stable correlation fields", () => {
    expect(
      buildRequestLogEntry(
        {
          nodeEnv: "production",
        },
        {
          level: "info",
          event: "request.completed",
          message: "Connector request completed",
          requestId: "req-123",
          traceId: "trace-123",
          runId: null,
          connectorRunId: "sync-9",
          actionId: null,
          contractVersion: null,
          organizationId: "org-1",
          siteId: null,
          routeTemplate: "/v1/organizations/:orgId/sync-runs/:runId",
          principal: "worker-a",
          method: "GET",
          path: "/v1/organizations/org-1/sync-runs/sync-9",
          clientIp: "203.0.113.8",
          origin: "https://admin.praedixa.com",
          status: "completed",
          statusCode: 200,
          durationMs: 84,
          errorCode: null,
        },
      ),
    ).toMatchObject({
      level: "info",
      service: "connectors",
      env: "production",
      event: "request.completed",
      request_id: "req-123",
      trace_id: "trace-123",
      run_id: null,
      connector_run_id: "sync-9",
      action_id: null,
      contract_version: null,
      organization_id: "org-1",
      site_id: null,
      route_template: "/v1/organizations/:orgId/sync-runs/:runId",
      principal: "worker-a",
      status: "completed",
      status_code: 200,
      duration_ms: 84,
      error_code: null,
    });
  });

  it("resolves inbound request correlation from internal runtime headers", () => {
    expect(
      resolveRequestCorrelation(
        {
          "x-request-id": "req-123",
          "x-run-id": "run-42",
          "x-connector-run-id": "sync-42",
          traceparent:
            "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
        },
        "fallback-req",
      ),
    ).toEqual({
      requestId: "req-123",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
      runId: "run-42",
      connectorRunId: "sync-42",
    });
  });

  it("reemits response correlation headers for request and business ids", () => {
    expect(
      buildResponseCorrelationHeaders({
        requestId: "req-123",
        runId: "run-42",
        connectorRunId: "sync-42",
      }),
    ).toEqual({
      "X-Request-ID": "req-123",
      "X-Run-ID": "run-42",
      "X-Connector-Run-ID": "sync-42",
    });
  });
});
