import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  CONFIG_ACCESS,
  JOURNAL_ACCESS,
  MESSAGES_ACCESS,
  MONITORING_READ,
  ONBOARDING_ACCESS,
  ORG_READ,
  SETTINGS_ACCESS,
  SUPPORT_ACCESS,
  USERS_ACCESS,
  createPagePolicy,
} from "./admin-route-policy-shared";
import { ADMIN_API_COLLABORATION_POLICIES } from "./admin-route-policies-api-collaboration";
import { ADMIN_API_CORE_POLICIES } from "./admin-route-policies-api-core";
import type {
  AdminApiPolicy,
  AdminGlobalNavItemDefinition,
  AdminHttpMethod,
  AdminPagePolicy,
  AdminRouteNavigation,
  WorkspaceTabDefinition,
} from "./admin-route-policy-shared";

export type {
  AdminApiPolicy,
  AdminGlobalNavItemDefinition,
  AdminHttpMethod,
  AdminNavGroup,
  AdminNavIcon,
  AdminPagePolicy,
  WorkspaceTabDefinition,
} from "./admin-route-policy-shared";

export const ADMIN_PAGE_POLICIES: readonly AdminPagePolicy[] = [
  createPagePolicy({
    id: "home",
    pattern: "/",
    title: "Accueil",
    requiredPermissions: MONITORING_READ,
    navigation: {
      scope: "global",
      label: "Accueil",
      order: 10,
      icon: "home",
      group: "pilotage",
      keywords: ["home", "accueil", "pilotage"],
      shortcut: "G H",
    },
  }),
  createPagePolicy({
    id: "clients",
    pattern: "/clients",
    title: "Clients",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "global",
      label: "Clients",
      order: 20,
      icon: "clients",
      group: "operations",
      keywords: ["organisations", "clients", "workspace"],
      shortcut: "G C",
    },
  }),
  createPagePolicy({
    id: "contact-requests",
    pattern: "/demandes-contact",
    title: "Demandes contact",
    requiredPermissions: SUPPORT_ACCESS,
    navigation: {
      scope: "global",
      label: "Demandes contact",
      order: 30,
      icon: "contact",
      group: "operations",
      keywords: ["contact", "leads", "messages"],
    },
  }),
  createPagePolicy({
    id: "journal",
    pattern: "/journal",
    title: "Journal",
    requiredPermissions: JOURNAL_ACCESS,
    navigation: {
      scope: "global",
      label: "Journal",
      order: 40,
      icon: "journal",
      group: "gouvernance",
      keywords: ["audit", "rgpd", "journal"],
    },
  }),
  createPagePolicy({
    id: "settings",
    pattern: "/parametres",
    title: "Parametres",
    requiredPermissions: SETTINGS_ACCESS,
    navigation: {
      scope: "global",
      label: "Parametres",
      order: 50,
      icon: "settings",
      group: "gouvernance",
      keywords: ["config", "parametres", "onboarding"],
      shortcut: "G S",
    },
  }),
  createPagePolicy({
    id: "coverage-harness",
    pattern: "/coverage-harness",
    title: "Coverage Harness",
    requiredPermissions: MONITORING_READ,
  }),
  createPagePolicy({
    id: "client-redirect",
    pattern: "/clients/[orgId]",
    title: "Workspace client",
    requiredPermissions: ORG_READ,
  }),
  createPagePolicy({
    id: "client-dashboard",
    pattern: "/clients/[orgId]/dashboard",
    title: "Workspace client - Tableau de bord",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Dashboard",
      order: 10,
      icon: "dashboard",
      keywords: ["workspace", "dashboard", "tableau de bord"],
    },
  }),
  createPagePolicy({
    id: "client-vue-client",
    pattern: "/clients/[orgId]/vue-client",
    title: "Workspace client - Vue client",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Vue client",
      order: 20,
      icon: "client-overview",
      keywords: ["workspace", "vue client", "miroir"],
    },
  }),
  createPagePolicy({
    id: "client-data",
    pattern: "/clients/[orgId]/donnees",
    title: "Workspace client - Donnees",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Donnees",
      order: 30,
      icon: "data",
      keywords: ["workspace", "donnees", "datasets"],
    },
  }),
  createPagePolicy({
    id: "client-forecasts",
    pattern: "/clients/[orgId]/previsions",
    title: "Workspace client - Previsions",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Previsions",
      order: 40,
      icon: "forecasts",
      keywords: ["workspace", "previsions", "forecast"],
    },
  }),
  createPagePolicy({
    id: "client-actions",
    pattern: "/clients/[orgId]/actions",
    title: "Workspace client - Actions",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Actions",
      order: 50,
      icon: "actions",
      keywords: ["workspace", "actions", "decisions"],
    },
  }),
  createPagePolicy({
    id: "client-approvals",
    pattern: "/clients/[orgId]/actions/approvals",
    title: "Workspace client - Approbations",
    requiredPermissions: ORG_READ,
  }),
  createPagePolicy({
    id: "client-action-dispatch-detail",
    pattern: "/clients/[orgId]/actions/dispatches/[actionId]",
    title: "Workspace client - Detail d'action",
    requiredPermissions: ORG_READ,
  }),
  createPagePolicy({
    id: "client-alerts",
    pattern: "/clients/[orgId]/alertes",
    title: "Workspace client - Alertes",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Alertes",
      order: 60,
      icon: "alerts",
      keywords: ["workspace", "alertes", "coverage"],
    },
  }),
  createPagePolicy({
    id: "client-reports",
    pattern: "/clients/[orgId]/rapports",
    title: "Workspace client - Rapports",
    requiredPermissions: ORG_READ,
    navigation: {
      scope: "workspace",
      label: "Rapports",
      order: 70,
      icon: "reports",
      keywords: ["workspace", "rapports", "proof packs"],
    },
  }),
  createPagePolicy({
    id: "client-ledger-detail",
    pattern: "/clients/[orgId]/rapports/ledgers/[ledgerId]",
    title: "Workspace client - Detail ledger",
    requiredPermissions: ORG_READ,
  }),
  createPagePolicy({
    id: "client-onboarding",
    pattern: "/clients/[orgId]/onboarding",
    title: "Workspace client - Onboarding",
    requiredPermissions: ONBOARDING_ACCESS,
    navigation: {
      scope: "workspace",
      label: "Onboarding",
      order: 80,
      icon: "onboarding",
      keywords: ["workspace", "onboarding", "activation"],
    },
  }),
  createPagePolicy({
    id: "client-contracts",
    pattern: "/clients/[orgId]/contrats",
    title: "Workspace client - Contrats",
    requiredPermissions: CONFIG_ACCESS,
    navigation: {
      scope: "workspace",
      label: "Contrats",
      order: 85,
      icon: "settings",
      keywords: ["workspace", "contrats", "decision contract", "studio"],
    },
  }),
  createPagePolicy({
    id: "client-config",
    pattern: "/clients/[orgId]/config",
    title: "Workspace client - Configuration",
    requiredPermissions: CONFIG_ACCESS,
    navigation: {
      scope: "workspace",
      label: "Config",
      order: 90,
      icon: "settings",
      keywords: ["workspace", "config", "decision"],
    },
  }),
  createPagePolicy({
    id: "client-team",
    pattern: "/clients/[orgId]/equipe",
    title: "Workspace client - Equipe",
    requiredPermissions: USERS_ACCESS,
    navigation: {
      scope: "workspace",
      label: "Equipe",
      order: 100,
      icon: "team",
      keywords: ["workspace", "equipe", "users"],
    },
  }),
  createPagePolicy({
    id: "client-messages",
    pattern: "/clients/[orgId]/messages",
    title: "Workspace client - Messages",
    requiredPermissions: MESSAGES_ACCESS,
    navigation: {
      scope: "workspace",
      label: "Messages",
      order: 110,
      icon: "messages",
      keywords: ["workspace", "messages", "conversation"],
    },
  }),
] as const;

export const ADMIN_API_POLICIES: readonly AdminApiPolicy[] = [
  ...ADMIN_API_CORE_POLICIES,
  ...ADMIN_API_COLLABORATION_POLICIES,
] as const;

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed) {
    return "/";
  }

  const withoutQuery = trimmed.split(/[?#]/, 1)[0] ?? "/";
  const withLeadingSlash = withoutQuery.startsWith("/")
    ? withoutQuery
    : `/${withoutQuery}`;

  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, "")
    : withLeadingSlash;
}

function splitPathSegments(pathname: string): string[] {
  return normalizePathname(pathname).split("/").filter(Boolean);
}

function isDynamicSegment(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function matchesPattern(pathname: string, pattern: string): boolean {
  const pathnameSegments = splitPathSegments(pathname);
  const patternSegments = splitPathSegments(pattern);

  if (pathnameSegments.length !== patternSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    if (isDynamicSegment(segment)) {
      return pathnameSegments[index] != null && pathnameSegments[index] !== "";
    }

    return pathnameSegments[index] === segment;
  });
}

function sortByNavigationOrder(
  left: { navigation?: AdminRouteNavigation },
  right: { navigation?: AdminRouteNavigation },
): number {
  return (
    (left.navigation?.order ?? Number.MAX_SAFE_INTEGER) -
    (right.navigation?.order ?? Number.MAX_SAFE_INTEGER)
  );
}

export const CLIENT_WORKSPACE_TABS: readonly WorkspaceTabDefinition[] =
  ADMIN_PAGE_POLICIES.filter(
    (policy) => policy.navigation?.scope === "workspace",
  )
    .sort(sortByNavigationOrder)
    .map((policy) => ({
      icon: policy.navigation?.icon ?? "dashboard",
      href: policy.pattern.split("/").at(-1) ?? "",
      keywords: policy.navigation?.keywords ?? [
        "workspace",
        policy.navigation?.label.toLowerCase() ?? "",
      ],
      label: policy.navigation?.label ?? policy.title,
      requiredPermissions: [...policy.requiredPermissions],
      title: policy.title,
    }));

export const ADMIN_GLOBAL_NAV_ITEMS: readonly AdminGlobalNavItemDefinition[] =
  ADMIN_PAGE_POLICIES.filter((policy) => policy.navigation?.scope === "global")
    .sort(sortByNavigationOrder)
    .map((policy) => ({
      group: policy.navigation?.group ?? "operations",
      href: policy.pattern,
      icon: policy.navigation?.icon ?? "home",
      id: policy.id,
      keywords: policy.navigation?.keywords ?? [
        policy.navigation?.label.toLowerCase() ?? "",
      ],
      label: policy.navigation?.label ?? policy.title,
      requiredPermissions: [...policy.requiredPermissions],
      shortcut: policy.navigation?.shortcut,
    }));

export function resolveWorkspaceBasePath(pathname: string): string | null {
  const segments = splitPathSegments(pathname);
  if (segments[0] !== "clients" || !segments[1]) {
    return null;
  }

  return `/clients/${encodeURIComponent(segments[1])}`;
}

export function resolveAdminPagePolicy(
  pathname: string,
): AdminPagePolicy | null {
  const normalizedPathname = normalizePathname(pathname);
  return (
    ADMIN_PAGE_POLICIES.find((policy) =>
      matchesPattern(normalizedPathname, policy.pattern),
    ) ?? null
  );
}

export function hasExplicitAdminPagePolicy(pathname: string): boolean {
  return resolveAdminPagePolicy(pathname) != null;
}

export function getRequiredPermissionsForPath(pathname: string): string[] {
  return [...(resolveAdminPagePolicy(pathname)?.requiredPermissions ?? [])];
}

export function getAdminPageTitle(pathname: string): string | undefined {
  return resolveAdminPagePolicy(pathname)?.title;
}

export function canAccessPath(
  pathname: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const policy = resolveAdminPagePolicy(pathname);
  if (!policy) {
    return false;
  }

  return hasAnyPermission(permissions, policy.requiredPermissions);
}

export function resolveAdminApiPolicy(
  pathname: string,
  method: string,
): AdminApiPolicy | null {
  const normalizedMethod = method.trim().toUpperCase();
  const normalizedPathname = normalizePathname(pathname);

  return (
    ADMIN_API_POLICIES.find(
      (policy) =>
        policy.methods.includes(normalizedMethod as AdminHttpMethod) &&
        matchesPattern(normalizedPathname, policy.pattern),
    ) ?? null
  );
}

export function hasExplicitAdminApiPolicy(
  pathname: string,
  method: string,
): boolean {
  return resolveAdminApiPolicy(pathname, method) != null;
}

export function isPublicAdminProxyPath(
  pathname: string,
  method: string,
): boolean {
  return resolveAdminApiPolicy(pathname, method)?.public === true;
}

export function canAccessAdminApiPath(
  pathname: string,
  method: string,
  permissions: readonly string[] | null | undefined,
): boolean {
  const policy = resolveAdminApiPolicy(pathname, method);
  if (!policy) {
    return false;
  }
  if (policy.public) {
    return true;
  }

  return hasAnyPermission(permissions, policy.requiredPermissions);
}
