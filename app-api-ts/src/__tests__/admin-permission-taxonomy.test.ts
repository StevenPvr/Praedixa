import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { routes } from "../routes.js";

const permissionTaxonomy = JSON.parse(
  readFileSync(
    path.resolve(
      process.cwd(),
      "../contracts/admin/permission-taxonomy.v1.json",
    ),
    "utf8",
  ),
) as {
  permissions: Array<{ name: string }>;
};

const allowedPermissions = new Set(
  permissionTaxonomy.permissions.map((permission) => permission.name),
);

describe("admin route permission taxonomy", () => {
  it("keeps every protected admin route inside the versioned taxonomy", () => {
    const adminRoutes = routes.filter((route) =>
      route.template.startsWith("/api/v1/admin"),
    );

    expect(adminRoutes.length).toBeGreaterThan(0);

    for (const route of adminRoutes) {
      const requiredPermissions = route.requiredPermissions ?? [];

      expect(requiredPermissions.length).toBeGreaterThan(0);
      expect(
        requiredPermissions.every((permission) =>
          allowedPermissions.has(permission),
        ),
      ).toBe(true);
    }
  });

  it("keeps the health route as the only public admin-adjacent route", () => {
    const publicLikeRoutes = routes.filter(
      (route) =>
        route.template.startsWith("/api/v1/admin") &&
        (route.requiredPermissions == null ||
          route.requiredPermissions.length === 0),
    );

    expect(publicLikeRoutes).toEqual([]);
  });
});
