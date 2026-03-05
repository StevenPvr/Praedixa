import { describe, expect, it } from "vitest";

import { routes } from "../routes.js";
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  isJsonContentType,
  resolveCorsHeaders,
  SECURITY_HEADERS,
} from "../server.js";
import { safeEqualSecret } from "../security.js";

describe("connectors transport and auth surface", () => {
  it("keeps transport security headers enabled", () => {
    expect(SECURITY_HEADERS).toEqual({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    });
  });

  it("keeps only health endpoint unauthenticated", () => {
    const publicRoutes = routes.filter((entry) => !entry.authRequired);
    expect(publicRoutes.map((entry) => entry.template)).toEqual(["/health"]);

    const protectedRoutes = routes.filter((entry) => entry.authRequired);
    expect(protectedRoutes.length).toBeGreaterThan(0);
  });

  it("builds CORS headers only for allowlisted origins", () => {
    const headers = resolveCorsHeaders(
      "http://localhost:3001",
      ["http://localhost:3001"],
      "development",
    );

    expect(headers).toEqual({
      "Access-Control-Allow-Origin": "http://localhost:3001",
      "Access-Control-Allow-Methods": CORS_ALLOWED_METHODS,
      "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
      "Access-Control-Max-Age": "600",
      Vary: "Origin",
    });
    expect(resolveCorsHeaders("http://localhost:3010", [], "production")).toEqual({});
  });

  it("accepts only JSON content-types for request bodies", () => {
    expect(isJsonContentType("application/json")).toBe(true);
    expect(isJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isJsonContentType(["application/json"])).toBe(true);
    expect(isJsonContentType("text/plain")).toBe(false);
    expect(isJsonContentType(undefined)).toBe(false);
  });

  it("compares internal tokens with constant-time helper", () => {
    expect(safeEqualSecret("token-long-enough-1234567890", "token-long-enough-1234567890")).toBe(
      true,
    );
    expect(safeEqualSecret("token-long-enough-1234567890", "token-long-enough-1234567891")).toBe(
      false,
    );
    expect(safeEqualSecret("token-long-enough-1234567890", null)).toBe(false);
  });
});
