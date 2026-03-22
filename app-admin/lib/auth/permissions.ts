import { ADMIN_PERMISSION_NAMES } from "@praedixa/shared-types";

export const ADMIN_CONSOLE_PERMISSION = "admin:console:access";

export function normalizePermission(permission: string): string {
  return permission.trim().toLowerCase();
}

export function normalizePermissions(
  permissions: readonly string[] | null | undefined,
): string[] {
  const hasPermissions = Array.isArray(permissions) && permissions.length > 0;
  if (hasPermissions === false) {
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

export function resolveAdminPermissions(input: {
  role: string | null | undefined;
  explicitPermissions: readonly string[] | null | undefined;
  profiles: readonly string[] | null | undefined;
}): string[] {
  const explicitPermissions = normalizePermissions(input.explicitPermissions);

  if (input.role === "super_admin") {
    return normalizePermissions([
      ...ADMIN_PERMISSION_NAMES,
      ...explicitPermissions,
    ]);
  }

  return explicitPermissions;
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

  return required.some((permission) =>
    availablePermissions.includes(permission),
  );
}

export function canAccessAdminConsole(
  _role: string | null | undefined,
  permissions: readonly string[] | null | undefined,
): boolean {
  return hasPermission(permissions, ADMIN_CONSOLE_PERMISSION);
}
