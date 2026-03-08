import { afterEach, describe, expect, it } from "vitest";

import { routes } from "../routes.js";
import { compileRoutes, matchRoute } from "../router.js";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  clearRateLimitBuckets,
  consumeRateLimit,
  isJsonContentType,
  normalizeOrigin,
  resolveClientIp,
  resolveRateLimitPolicy,
  resolveCorsHeaders,
  SECURITY_HEADERS,
} from "../server.js";

describe("api transport and authorization guards", () => {
  afterEach(() => {
    clearRateLimitBuckets();
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
    const allowlistedHeaders = resolveCorsHeaders(
      "http://localhost:3001",
      ["http://localhost:3001"],
    );
    expect(allowlistedHeaders).toEqual({
      "Access-Control-Allow-Origin": "http://localhost:3001",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });

    expect(resolveCorsHeaders("http://localhost:3999", ["http://localhost:3001"])).toEqual(
      {},
    );
    expect(resolveCorsHeaders(null, ["http://localhost:3001"])).toEqual({});
  });

  it("trusts forwarded client IPs only when proxy trust is explicit", () => {
    expect(
      resolveClientIp("203.0.113.10, 10.0.0.4", "10.0.0.4", false),
    ).toBe("10.0.0.4");
    expect(
      resolveClientIp("203.0.113.10, 10.0.0.4", "10.0.0.4", true),
    ).toBe("203.0.113.10");
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
      (entry) => entry.template === "/api/v1/admin/organizations/:orgId/suspend",
    );
    const healthRoute = routes.find((entry) => entry.template === "/api/v1/health");

    expect(contactRoute).toBeDefined();
    expect(unreadCountRoute).toBeDefined();
    expect(adminSuspendRoute).toBeDefined();
    expect(healthRoute).toBeDefined();

    expect(
      resolveRateLimitPolicy(contactRoute!),
    ).toEqual({
      maxRequests: 5,
      scope: "ip",
      windowMs: 600000,
    });

    expect(
      resolveRateLimitPolicy(unreadCountRoute!),
    ).toEqual({
      maxRequests: 120,
      scope: "principal",
      windowMs: 60000,
    });

    expect(
      resolveRateLimitPolicy(adminSuspendRoute!),
    ).toEqual({
      maxRequests: 30,
      scope: "principal",
      windowMs: 60000,
    });

    expect(
      resolveRateLimitPolicy(
        routes.find((entry) => entry.template === "/api/v1/admin/monitoring/platform")!,
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
});
