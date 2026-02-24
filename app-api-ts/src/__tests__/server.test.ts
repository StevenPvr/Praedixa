import { describe, expect, it } from "vitest";

import { routes } from "../routes.js";
import { SECURITY_HEADERS } from "../server.js";

describe("api transport and authorization guards", () => {
  it("keeps mandatory transport security headers enabled", () => {
    expect(SECURITY_HEADERS).toEqual({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    });
  });

  it("requires super_admin role for all /api/v1/admin routes", () => {
    const adminRoutes = routes.filter((entry) =>
      entry.template.startsWith("/api/v1/admin"),
    );

    expect(adminRoutes.length).toBeGreaterThan(0);
    for (const route of adminRoutes) {
      expect(route.allowedRoles).toContain("super_admin");
    }
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
});
