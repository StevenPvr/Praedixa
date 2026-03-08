import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  getRequiredPermissionsForPath,
} from "../route-access";

describe("route access helpers", () => {
  it("maps workspace sections to their required permissions", () => {
    expect(getRequiredPermissionsForPath("/clients/org-1/equipe")).toEqual([
      "admin:users:read",
      "admin:users:write",
    ]);
  });

  it("allows journal access when audit read permission is present", () => {
    expect(canAccessPath("/journal", ["admin:audit:read"])).toBe(true);
  });

  it("blocks support routes without support permissions", () => {
    expect(canAccessPath("/demandes-contact", ["admin:org:read"])).toBe(false);
  });
});
