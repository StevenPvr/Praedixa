import { describe, expect, it } from "vitest";

import {
  ADMIN_CONSOLE_PERMISSION,
  canAccessAdminConsole,
  hasAnyPermission,
  hasPermission,
  resolveAdminPermissions,
} from "../permissions";

describe("auth permissions helpers", () => {
  it("keeps explicit permissions when provided", () => {
    expect(
      resolveAdminPermissions({
        role: "viewer",
        explicitPermissions: ["ADMIN:ORG:READ", "admin:org:read"],
        profiles: ["admin_compliance"],
      }),
    ).toEqual(["admin:org:read"]);
  });

  it("does not derive permissions from role or profile fallbacks", () => {
    expect(
      resolveAdminPermissions({
        role: "super_admin",
        explicitPermissions: [],
        profiles: ["admin_compliance"],
      }),
    ).toEqual([]);
  });

  it("requires explicit console access permission", () => {
    expect(canAccessAdminConsole("super_admin", [])).toBe(false);
    expect(canAccessAdminConsole("viewer", [ADMIN_CONSOLE_PERMISSION])).toBe(
      true,
    );
    expect(canAccessAdminConsole("viewer", [])).toBe(false);
  });

  it("evaluates permission checks", () => {
    const permissions = ["admin:audit:read", "admin:messages:read"];
    expect(hasPermission(permissions, "admin:audit:read")).toBe(true);
    expect(
      hasAnyPermission(permissions, ["admin:org:read", "admin:messages:read"]),
    ).toBe(true);
  });
});
