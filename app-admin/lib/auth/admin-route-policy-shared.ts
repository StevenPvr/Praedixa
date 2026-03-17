export type AdminHttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type AdminNavGroup = "pilotage" | "operations" | "gouvernance";
export type AdminNavIcon =
  | "home"
  | "clients"
  | "contact"
  | "journal"
  | "settings"
  | "dashboard"
  | "client-overview"
  | "data"
  | "forecasts"
  | "actions"
  | "alerts"
  | "reports"
  | "onboarding"
  | "team"
  | "messages";

export interface AdminRouteNavigation {
  scope: "global" | "workspace";
  label: string;
  order: number;
  icon: AdminNavIcon;
  keywords?: readonly string[];
  shortcut?: string;
  group?: AdminNavGroup;
}

export interface AdminPagePolicy {
  id: string;
  pattern: string;
  title: string;
  requiredPermissions: string[];
  navigation?: AdminRouteNavigation;
}

export interface AdminApiPolicy {
  id: string;
  pattern: string;
  methods: readonly AdminHttpMethod[];
  requiredPermissions: string[];
  public?: boolean;
}

export interface WorkspaceTabDefinition {
  icon: AdminNavIcon;
  href: string;
  keywords: readonly string[];
  label: string;
  requiredPermissions: string[];
  title: string;
}

export interface AdminGlobalNavItemDefinition {
  group: AdminNavGroup;
  href: string;
  icon: AdminNavIcon;
  id: string;
  keywords: readonly string[];
  label: string;
  requiredPermissions: string[];
  shortcut?: string;
}

export const MONITORING_READ = ["admin:monitoring:read"] as const;
export const ORG_READ = ["admin:org:read"] as const;
export const ORG_WRITE = ["admin:org:write"] as const;
export const USERS_ACCESS = ["admin:users:read", "admin:users:write"] as const;
export const USERS_WRITE = ["admin:users:write"] as const;
export const BILLING_READ = ["admin:billing:read"] as const;
export const BILLING_WRITE = ["admin:billing:write"] as const;
export const AUDIT_READ = ["admin:audit:read"] as const;
export const ONBOARDING_ACCESS = [
  "admin:onboarding:read",
  "admin:onboarding:write",
] as const;
export const ONBOARDING_WRITE = ["admin:onboarding:write"] as const;
export const SUPPORT_ACCESS = [
  "admin:support:read",
  "admin:support:write",
] as const;
export const SUPPORT_WRITE = ["admin:support:write"] as const;
export const MESSAGES_ACCESS = [
  "admin:messages:read",
  "admin:messages:write",
] as const;
export const MESSAGES_WRITE = ["admin:messages:write"] as const;
export const CONFIG_ACCESS = ["admin:org:write", "admin:billing:read"] as const;
export const CONFIG_WRITE = ["admin:org:write"] as const;
export const INTEGRATIONS_READ = ["admin:integrations:read"] as const;
export const INTEGRATIONS_WRITE = ["admin:integrations:write"] as const;
export const SETTINGS_ACCESS = [
  ...ONBOARDING_ACCESS,
  ...MONITORING_READ,
] as const;
export const JOURNAL_ACCESS = [
  ...AUDIT_READ,
  ...ORG_WRITE,
  ...BILLING_WRITE,
  ...SUPPORT_WRITE,
] as const;

export function dedupePermissions(permissions: readonly string[]): string[] {
  return Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );
}

export function createPagePolicy(
  policy: Omit<AdminPagePolicy, "requiredPermissions"> & {
    requiredPermissions: readonly string[];
  },
): AdminPagePolicy {
  return {
    ...policy,
    requiredPermissions: dedupePermissions(policy.requiredPermissions),
  };
}

export function createApiPolicy(
  policy: Omit<AdminApiPolicy, "requiredPermissions"> & {
    requiredPermissions?: readonly string[];
  },
): AdminApiPolicy {
  return {
    ...policy,
    requiredPermissions: dedupePermissions(policy.requiredPermissions ?? []),
  };
}
