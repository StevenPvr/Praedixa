import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  ADMIN_API_POLICIES,
  ADMIN_PAGE_POLICIES,
  getRequiredPermissionsForPath,
  resolveAdminApiPolicy,
} from "../admin-route-policies";
import { getRequiredPermissionsForPath as getLegacyRequiredPermissionsForPath } from "../route-access";

function resolvePermissionTaxonomyPath() {
  const candidatePaths = [
    path.resolve(
      process.cwd(),
      "../contracts/admin/permission-taxonomy.v1.json",
    ),
    path.resolve(process.cwd(), "contracts/admin/permission-taxonomy.v1.json"),
  ];

  try {
    candidatePaths.push(
      fileURLToPath(
        new URL(
          "../../../../contracts/admin/permission-taxonomy.v1.json",
          import.meta.url,
        ),
      ),
    );
  } catch {
    // Vitest can expose a non-file import URL; cwd fallbacks cover app-local runs.
  }

  const resolved = candidatePaths.find((candidatePath) =>
    existsSync(candidatePath),
  );
  if (!resolved) {
    throw new Error(
      "Unable to resolve contracts/admin/permission-taxonomy.v1.json",
    );
  }
  return resolved;
}

const permissionTaxonomy = JSON.parse(
  readFileSync(resolvePermissionTaxonomyPath(), "utf8"),
) as {
  permissions: Array<{ name: string }>;
};

const allowedPermissions = new Set(
  permissionTaxonomy.permissions.map((permission) => permission.name),
);

function expectPermissionsToBeVersioned(permissions: readonly string[]) {
  expect(permissions.length).toBeGreaterThan(0);
  expect(
    permissions.every((permission) => allowedPermissions.has(permission)),
  ).toBe(true);
}

describe("admin route policy taxonomy", () => {
  it("keeps every admin page policy inside the versioned taxonomy", () => {
    for (const policy of ADMIN_PAGE_POLICIES) {
      expectPermissionsToBeVersioned(policy.requiredPermissions);
    }
  });

  it("keeps every protected admin API policy inside the versioned taxonomy", () => {
    for (const policy of ADMIN_API_POLICIES) {
      if (policy.public) {
        expect(policy.requiredPermissions).toEqual([]);
        continue;
      }

      expectPermissionsToBeVersioned(policy.requiredPermissions);
    }
  });

  it("keeps legacy route-access helpers aligned with page policies", () => {
    const coveredPaths = [
      "/",
      "/clients",
      "/clients/org-1/dashboard",
      "/clients/org-1/config",
      "/clients/org-1/equipe",
      "/journal",
      "/demandes-contact",
      "/parametres",
    ] as const;

    for (const pathname of coveredPaths) {
      expect(getLegacyRequiredPermissionsForPath(pathname)).toEqual(
        getRequiredPermissionsForPath(pathname),
      );
    }
  });

  it("keeps key admin API routes mapped to versioned permissions", () => {
    expect(
      resolveAdminApiPolicy("/api/v1/admin/organizations/org-1/users", "GET")
        ?.requiredPermissions,
    ).toEqual(["admin:users:read", "admin:users:write"]);
    expect(
      resolveAdminApiPolicy("/api/v1/admin/audit-log", "GET")
        ?.requiredPermissions,
    ).toEqual(["admin:audit:read"]);
    expect(
      resolveAdminApiPolicy("/api/v1/admin/integrations/catalog", "GET")
        ?.requiredPermissions,
    ).toEqual(["admin:integrations:read"]);
  });
});
