export function isSuperAdmin(role: string | undefined): boolean {
  return role === "super_admin";
}

export function canAccessSettings(role: string | undefined): boolean {
  return role === "org_admin" || role === "admin";
}

export function toSidebarRole(
  role: string | undefined,
): "admin" | "manager" | "viewer" {
  if (canAccessSettings(role) || role === "super_admin") {
    return "admin";
  }
  if (role === "manager" || role === "hr_manager") {
    return "manager";
  }
  return "viewer";
}
