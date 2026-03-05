export const ADMIN_CONSOLE_PERMISSION = "admin:console:access";

const ROLE_PERMISSION_FALLBACK: Record<string, readonly string[]> = {
  super_admin: [
    ADMIN_CONSOLE_PERMISSION,
    "admin:monitoring:read",
    "admin:org:read",
    "admin:org:write",
    "admin:users:read",
    "admin:users:write",
    "admin:billing:read",
    "admin:billing:write",
    "admin:audit:read",
    "admin:onboarding:read",
    "admin:onboarding:write",
    "admin:messages:read",
    "admin:messages:write",
    "admin:support:read",
    "admin:support:write",
  ],
  org_admin: [
  ],
  hr_manager: [
  ],
  manager: [
  ],
} as const;

const PROFILE_PERMISSION_FALLBACK: Record<string, readonly string[]> = {
  admin_ops: [
    ADMIN_CONSOLE_PERMISSION,
    "admin:monitoring:read",
    "admin:org:read",
    "admin:messages:read",
    "admin:messages:write",
    "admin:support:read",
  ],
  admin_compliance: [
    ADMIN_CONSOLE_PERMISSION,
    "admin:audit:read",
    "admin:billing:read",
    "admin:org:read",
    "admin:onboarding:read",
  ],
} as const;

function normalizeRole(role: string | null | undefined): string {
  if (!role) return "";
  const trimmed = role.trim();
  if (trimmed.length === 0) return "";
  const withoutPath = trimmed.includes("/")
    ? (trimmed.split("/").at(-1) ?? "")
    : trimmed;
  const normalized = withoutPath
    .toLowerCase()
    .replace(/^role[_:-]?/, "")
    .replace(/[\s-]+/g, "_");

  if (
    normalized === "superadmin" ||
    normalized === "super_administrator"
  ) {
    return "super_admin";
  }

  if (
    normalized === "admin" ||
    normalized === "orgadmin" ||
    normalized === "organization_admin" ||
    normalized === "org_administrator"
  ) {
    return "org_admin";
  }

  if (normalized === "hrmanager") {
    return "hr_manager";
  }

  return normalized;
}

function normalizeProfile(profile: string): string {
  return profile
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

export function normalizePermissions(
  permissions: readonly string[] | null | undefined,
): string[] {
  if (!permissions || permissions.length === 0) {
    return [];
  }

  return Array.from(
    new Set(
      permissions
        .map((permission) => normalizePermission(permission))
        .filter((permission) => permission.length > 0),
    ),
  );
}

export function resolveRolePermissions(role: string | null | undefined): string[] {
  const normalizedRole = normalizeRole(role);
  return normalizePermissions(ROLE_PERMISSION_FALLBACK[normalizedRole] ?? []);
}

export function resolveProfilePermissions(
  profiles: readonly string[] | null | undefined,
): string[] {
  if (!profiles || profiles.length === 0) {
    return [];
  }

  const normalizedProfiles = Array.from(
    new Set(
      profiles
        .map((profile) => normalizeProfile(profile))
        .filter((profile) => profile.length > 0),
    ),
  );

  return normalizePermissions(
    normalizedProfiles.flatMap(
      (profile) => PROFILE_PERMISSION_FALLBACK[profile] ?? [],
    ),
  );
}

export function resolveAdminPermissions(input: {
  role: string | null | undefined;
  explicitPermissions: readonly string[] | null | undefined;
  profiles: readonly string[] | null | undefined;
}): string[] {
  const explicitPermissions = normalizePermissions(input.explicitPermissions);
  if (explicitPermissions.length > 0) {
    return explicitPermissions;
  }

  return normalizePermissions([
    ...resolveProfilePermissions(input.profiles),
    ...resolveRolePermissions(input.role),
  ]);
}

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  requiredPermission: string,
): boolean {
  const normalizedPermission = normalizePermission(requiredPermission);
  if (normalizedPermission.length === 0) {
    return false;
  }
  return normalizePermissions(permissions).includes(normalizedPermission);
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  requiredPermissions: readonly string[],
): boolean {
  const availablePermissions = normalizePermissions(permissions);
  const required = normalizePermissions(requiredPermissions);
  if (required.length === 0) {
    return true;
  }
  return required.some((permission) => availablePermissions.includes(permission));
}

export function canAccessAdminConsole(
  role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "super_admin") {
    return true;
  }
  return hasPermission(permissions, ADMIN_CONSOLE_PERMISSION);
}
