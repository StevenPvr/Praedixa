export const ADMIN_PERMISSION_NAMES = [
  "admin:console:access",
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
  "admin:integrations:read",
  "admin:integrations:write",
] as const;

export type AdminPermissionName = (typeof ADMIN_PERMISSION_NAMES)[number];
