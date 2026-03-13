import { hasAnyPermission } from "@/lib/auth/permissions";

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

interface AdminRouteNavigation {
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

const MONITORING_READ = ["admin:monitoring:read"] as const;
const ORG_READ = ["admin:org:read"] as const;
const ORG_WRITE = ["admin:org:write"] as const;
const USERS_ACCESS = ["admin:users:read", "admin:users:write"] as const;
const USERS_WRITE = ["admin:users:write"] as const;
const BILLING_READ = ["admin:billing:read"] as const;
const BILLING_WRITE = ["admin:billing:write"] as const;
const AUDIT_READ = ["admin:audit:read"] as const;
const ONBOARDING_ACCESS = [
  "admin:onboarding:read",
  "admin:onboarding:write",
] as const;
const ONBOARDING_WRITE = ["admin:onboarding:write"] as const;
const SUPPORT_ACCESS = ["admin:support:read", "admin:support:write"] as const;
const SUPPORT_WRITE = ["admin:support:write"] as const;
const MESSAGES_ACCESS = [
  "admin:messages:read",
  "admin:messages:write",
] as const;
const MESSAGES_WRITE = ["admin:messages:write"] as const;
const CONFIG_ACCESS = ["admin:org:write", "admin:billing:read"] as const;
const CONFIG_WRITE = ["admin:org:write"] as const;
const INTEGRATIONS_READ = ["admin:integrations:read"] as const;
const INTEGRATIONS_WRITE = ["admin:integrations:write"] as const;
const SETTINGS_ACCESS = [...ONBOARDING_ACCESS, ...MONITORING_READ] as const;
const JOURNAL_ACCESS = [
  ...AUDIT_READ,
  ...ORG_WRITE,
  ...BILLING_WRITE,
  ...SUPPORT_WRITE,
] as const;

function dedupePermissions(permissions: readonly string[]): string[] {
  return Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );
}

function createPagePolicy(
  policy: Omit<AdminPagePolicy, "requiredPermissions"> & {
    requiredPermissions: readonly string[];
  },
): AdminPagePolicy {
  return {
    ...policy,
    requiredPermissions: dedupePermissions(policy.requiredPermissions),
  };
}

function createApiPolicy(
  policy: Omit<AdminApiPolicy, "requiredPermissions"> & {
    requiredPermissions?: readonly string[];
  },
): AdminApiPolicy {
  return {
    ...policy,
    requiredPermissions: dedupePermissions(policy.requiredPermissions ?? []),
  };
}

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

const WORKSPACE_HEADER_ACCESS = dedupePermissions(
  ADMIN_PAGE_POLICIES.filter((policy) =>
    policy.pattern.startsWith("/clients/[orgId]"),
  ).flatMap((policy) => policy.requiredPermissions),
);
const PROOF_PACK_ACCESS = dedupePermissions([...ORG_READ, ...CONFIG_ACCESS]);

export const ADMIN_API_POLICIES: readonly AdminApiPolicy[] = [
  createApiPolicy({
    id: "health",
    pattern: "/api/v1/health",
    methods: ["GET"],
    public: true,
  }),
  ...[
    "/api/v1/admin/monitoring/platform",
    "/api/v1/admin/monitoring/trends",
    "/api/v1/admin/monitoring/errors",
    "/api/v1/admin/monitoring/alerts/summary",
    "/api/v1/admin/monitoring/alerts/by-org",
    "/api/v1/admin/monitoring/scenarios/summary",
    "/api/v1/admin/monitoring/decisions/summary",
    "/api/v1/admin/monitoring/decisions/overrides",
    "/api/v1/admin/monitoring/decisions/adoption",
    "/api/v1/admin/monitoring/proof-packs/summary",
    "/api/v1/admin/monitoring/canonical-coverage",
    "/api/v1/admin/monitoring/cost-params/missing",
    "/api/v1/admin/monitoring/roi/by-org",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `monitoring-${index}`,
      pattern,
      methods: ["GET"],
      requiredPermissions: MONITORING_READ,
    }),
  ),
  createApiPolicy({
    id: "organizations",
    pattern: "/api/v1/admin/organizations",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-monitoring",
    pattern: "/api/v1/admin/monitoring/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: MONITORING_READ,
  }),
  createApiPolicy({
    id: "org-mirror",
    pattern: "/api/v1/admin/monitoring/organizations/[orgId]/mirror",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "organization",
    pattern: "/api/v1/admin/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: WORKSPACE_HEADER_ACCESS,
  }),
  createApiPolicy({
    id: "org-overview",
    pattern: "/api/v1/admin/organizations/[orgId]/overview",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-hierarchy",
    pattern: "/api/v1/admin/organizations/[orgId]/hierarchy",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "integrations-catalog",
    pattern: "/api/v1/admin/integrations/catalog",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/suspend",
    "/api/v1/admin/organizations/[orgId]/reactivate",
    "/api/v1/admin/organizations/[orgId]/churn",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: ORG_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-users",
    pattern: "/api/v1/admin/organizations/[orgId]/users",
    methods: ["GET"],
    requiredPermissions: USERS_ACCESS,
  }),
  createApiPolicy({
    id: "org-user",
    pattern: "/api/v1/admin/organizations/[orgId]/users/[userId]",
    methods: ["GET"],
    requiredPermissions: USERS_ACCESS,
  }),
  createApiPolicy({
    id: "org-user-role",
    pattern: "/api/v1/admin/organizations/[orgId]/users/[userId]/role",
    methods: ["PATCH"],
    requiredPermissions: USERS_WRITE,
  }),
  createApiPolicy({
    id: "org-user-invite",
    pattern: "/api/v1/admin/organizations/[orgId]/users/invite",
    methods: ["POST"],
    requiredPermissions: USERS_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/users/[userId]/deactivate",
    "/api/v1/admin/organizations/[orgId]/users/[userId]/reactivate",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-user-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: USERS_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-billing",
    pattern: "/api/v1/admin/billing/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: BILLING_READ,
  }),
  createApiPolicy({
    id: "org-change-plan",
    pattern: "/api/v1/admin/billing/organizations/[orgId]/change-plan",
    methods: ["POST"],
    requiredPermissions: BILLING_WRITE,
  }),
  createApiPolicy({
    id: "org-plan-history",
    pattern: "/api/v1/admin/billing/organizations/[orgId]/history",
    methods: ["GET"],
    requiredPermissions: BILLING_READ,
  }),
  createApiPolicy({
    id: "audit-log",
    pattern: "/api/v1/admin/audit-log",
    methods: ["GET"],
    requiredPermissions: AUDIT_READ,
  }),
  createApiPolicy({
    id: "onboarding-list",
    pattern: "/api/v1/admin/onboarding",
    methods: ["GET"],
    requiredPermissions: ONBOARDING_ACCESS,
  }),
  createApiPolicy({
    id: "onboarding-start",
    pattern: "/api/v1/admin/onboarding",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "onboarding-step",
    pattern: "/api/v1/admin/onboarding/[onboardingId]/step/[step]",
    methods: ["PATCH"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/canonical",
    "/api/v1/admin/organizations/[orgId]/canonical/quality",
    "/api/v1/admin/organizations/[orgId]/alerts",
    "/api/v1/admin/organizations/[orgId]/scenarios",
    "/api/v1/admin/organizations/[orgId]/ml-monitoring/summary",
    "/api/v1/admin/organizations/[orgId]/ml-monitoring/drift",
    "/api/v1/admin/organizations/[orgId]/ingestion-log",
    "/api/v1/admin/organizations/[orgId]/medallion-quality-report",
    "/api/v1/admin/organizations/[orgId]/datasets",
    "/api/v1/admin/organizations/[orgId]/datasets/[datasetId]/data",
    "/api/v1/admin/organizations/[orgId]/datasets/[datasetId]/features",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-read-${index}`,
      pattern,
      methods: ["GET"],
      requiredPermissions: ORG_READ,
    }),
  ),
  createApiPolicy({
    id: "org-cost-params",
    pattern: "/api/v1/admin/organizations/[orgId]/cost-params",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-config-resolved",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/resolved",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-config-versions-get",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/versions",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-config-versions-post",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/versions",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/decision-config/versions/[versionId]/cancel",
    "/api/v1/admin/organizations/[orgId]/decision-config/versions/[versionId]/rollback",
    "/api/v1/admin/organizations/[orgId]/alerts/[alertId]/scenarios/recompute",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-decision-config-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: CONFIG_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-proof-packs",
    pattern: "/api/v1/admin/organizations/[orgId]/proof-packs",
    methods: ["GET"],
    requiredPermissions: PROOF_PACK_ACCESS,
  }),
  createApiPolicy({
    id: "org-approval-inbox",
    pattern: "/api/v1/admin/organizations/[orgId]/approval-inbox",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-approval-decision",
    pattern:
      "/api/v1/admin/organizations/[orgId]/approvals/[approvalId]/decision",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-action-dispatch-detail",
    pattern: "/api/v1/admin/organizations/[orgId]/action-dispatches/[actionId]",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-ledger-detail",
    pattern: "/api/v1/admin/organizations/[orgId]/ledgers/[ledgerId]",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-proof-pack-share-link",
    pattern:
      "/api/v1/admin/organizations/[orgId]/proof-packs/[proofPackId]/share-link",
    methods: ["POST"],
    requiredPermissions: PROOF_PACK_ACCESS,
  }),
  createApiPolicy({
    id: "org-integrations-get",
    pattern: "/api/v1/admin/organizations/[orgId]/integrations/connections",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integrations-post",
    pattern: "/api/v1/admin/organizations/[orgId]/integrations/connections",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-connection-get",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-connection-patch",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]",
    methods: ["PATCH"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credentials-get",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credentials-post",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credential-revoke",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials/[credentialId]/revoke",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-raw-events",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/raw-events",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-raw-event-payload",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/raw-events/[eventId]/payload",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "conversations",
    pattern: "/api/v1/admin/conversations",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "org-conversations",
    pattern: "/api/v1/admin/organizations/[orgId]/conversations",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-messages-get",
    pattern: "/api/v1/admin/conversations/[conversationId]/messages",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-messages-post",
    pattern: "/api/v1/admin/conversations/[conversationId]/messages",
    methods: ["POST"],
    requiredPermissions: MESSAGES_WRITE,
  }),
  createApiPolicy({
    id: "conversation-status-get",
    pattern: "/api/v1/admin/conversations/[conversationId]",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-status-patch",
    pattern: "/api/v1/admin/conversations/[conversationId]",
    methods: ["PATCH"],
    requiredPermissions: MESSAGES_WRITE,
  }),
  createApiPolicy({
    id: "conversations-unread",
    pattern: "/api/v1/admin/conversations/unread-count",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "contact-requests",
    pattern: "/api/v1/admin/contact-requests",
    methods: ["GET"],
    requiredPermissions: SUPPORT_ACCESS,
  }),
  createApiPolicy({
    id: "contact-request-status",
    pattern: "/api/v1/admin/contact-requests/[requestId]/status",
    methods: ["PATCH"],
    requiredPermissions: SUPPORT_WRITE,
  }),
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
