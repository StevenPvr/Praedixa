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
        profiles: [],
      }),
    ).toEqual(["admin:org:read"]);
  });

  it("falls back to role permissions when explicit permissions are absent", () => {
    const resolved = resolveAdminPermissions({
      role: "super_admin",
      explicitPermissions: [],
      profiles: [],
    });

    expect(resolved).toContain("admin:org:read");
    expect(resolved).toContain(ADMIN_CONSOLE_PERMISSION);
  });

  it("adds profile fallback permissions when available", () => {
    const resolved = resolveAdminPermissions({
      role: "viewer",
      explicitPermissions: [],
      profiles: ["admin_compliance"],
    });

    expect(resolved).toContain("admin:audit:read");
    expect(resolved).toContain("admin:billing:read");
  });

  it("supports console access either by role or permission", () => {
    expect(canAccessAdminConsole("super_admin", [])).toBe(true);
    expect(
      canAccessAdminConsole("viewer", [ADMIN_CONSOLE_PERMISSION]),
    ).toBe(true);
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
