import { describe, expect, it } from "vitest";

import { routes } from "../routes.js";
import {
  authenticateServiceToken,
  canAccessOrganization,
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  hasRequiredCapabilities,
  isJsonContentType,
  resolveClientIp,
  resolveCorsHeaders,
  SECURITY_HEADERS,
} from "../server.js";
import { safeEqualSecret } from "../security.js";

describe("connectors transport and auth surface", () => {
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
    expect(
      resolveCorsHeaders("https://evil.example", ["https://app.example"]),
    ).toEqual({});
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
});
