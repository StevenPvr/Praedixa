export interface PlatformKPIs {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalDatasets: number;
  totalForecasts: number;
  totalDecisions: number;
  ingestionSuccessRate: number;
  apiErrorRate: number;
}

export type InboxPriority = "urgent" | "warning" | "info";

export interface InboxItem {
  id: string;
  priority: InboxPriority;
  title: string;
  description: string;
  source: string;
  href: string;
  timestamp?: string;
}

export interface AlertSummary {
  orgId: string;
  orgName: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface AlertsByOrg {
  organizations: AlertSummary[];
  totalAlerts: number;
}

export interface CostParamsMissing {
  organizations: {
    orgId: string;
    orgName: string;
    missingSites: number;
    totalSites: number;
  }[];
}

export interface DecisionsAdoption {
  organizations: {
    orgId: string;
    orgName: string;
    adoptionRate: number;
    totalDecisions: number;
  }[];
}

export interface UnreadCount {
  total: number;
  byOrg: { orgId: string; orgName: string; count: number }[];
}

export const PRIORITY_CONFIG: Record<
  InboxPriority,
  { bg: string; border: string; dot: string; label: string }
> = {
  urgent: {
    bg: "bg-danger-50",
    border: "border-danger-200",
    dot: "bg-danger-500",
    label: "Urgent",
  },
  warning: {
    bg: "bg-primary-50",
    border: "border-primary-200",
    dot: "bg-primary",
    label: "A surveiller",
  },
  info: {
    bg: "bg-card",
    border: "border-border-subtle",
    dot: "bg-ink-placeholder",
    label: "Info",
  },
};

export const ACTION_LABELS: Record<string, string> = {
  view_org: "Consultation organisation",
  create_org: "Creation organisation",
  update_org: "Modification organisation",
  suspend_org: "Suspension organisation",
  reactivate_org: "Reactivation organisation",
  churn_org: "Churn organisation",
  view_users: "Consultation utilisateurs",
  invite_user: "Invitation utilisateur",
  change_role: "Changement role",
  suspend_user: "Suspension utilisateur",
  change_plan: "Changement plan",
  view_monitoring: "Consultation monitoring",
  view_mirror: "Consultation miroir",
  view_audit: "Consultation audit",
  start_onboarding: "Demarrage onboarding",
  complete_step: "Etape completee",
  decision_config_bootstrapped: "Bootstrap decision-config",
  decision_config_version_created: "Version decision-config creee",
  decision_config_version_activated: "Version decision-config activee",
  decision_config_version_cancelled: "Version decision-config annulee",
  decision_config_rollback: "Rollback decision-config",
};

const INBOX_PRIORITY_ORDER: Record<InboxPriority, number> = {
  urgent: 0,
  warning: 1,
  info: 2,
};

function buildAlertInboxItems(alerts: AlertsByOrg | null): InboxItem[] {
  const items: InboxItem[] = [];
  const organizations = alerts?.organizations ?? [];

  for (const org of organizations) {
    const encodedOrgId = encodeURIComponent(org.orgId);

    if (org.critical > 0) {
      items.push({
        id: `alert-critical-${org.orgId}`,
        priority: "urgent",
        title: `${org.critical} alerte(s) critique(s)`,
        description: `${org.orgName} — ${org.total} alertes au total`,
        source: "Alertes",
        href: `/clients/${encodedOrgId}/alertes`,
      });
      continue;
    }

    if (org.high > 0) {
      items.push({
        id: `alert-high-${org.orgId}`,
        priority: "warning",
        title: `${org.high} alerte(s) elevee(s)`,
        description: `${org.orgName} — necessite une attention`,
        source: "Alertes",
        href: `/clients/${encodedOrgId}/alertes`,
      });
    }
  }

  return items;
}

function buildUnreadInboxItems(unread: UnreadCount | null): InboxItem[] {
  const items: InboxItem[] = [];
  const organizations = unread?.byOrg ?? [];

  for (const org of organizations) {
    const encodedOrgId = encodeURIComponent(org.orgId);

    if (org.count > 5) {
      items.push({
        id: `unread-urgent-${org.orgId}`,
        priority: "urgent",
        title: `${org.count} messages non lus`,
        description: `${org.orgName} — reponse en attente`,
        source: "Messages",
        href: `/clients/${encodedOrgId}/messages`,
      });
      continue;
    }

    if (org.count > 0) {
      items.push({
        id: `unread-${org.orgId}`,
        priority: "info",
        title: `${org.count} message(s) non lu(s)`,
        description: org.orgName,
        source: "Messages",
        href: `/clients/${encodedOrgId}/messages`,
      });
    }
  }

  return items;
}

function buildCostParamInboxItems(
  costParams: CostParamsMissing | null,
): InboxItem[] {
  const items: InboxItem[] = [];
  const organizations = costParams?.organizations ?? [];

  for (const org of organizations) {
    if (org.missingSites <= 0) {
      continue;
    }

    const encodedOrgId = encodeURIComponent(org.orgId);
    items.push({
      id: `cost-missing-${org.orgId}`,
      priority: "warning",
      title: "Parametres de cout manquants",
      description: `${org.orgName} — ${org.missingSites}/${org.totalSites} sites non configures`,
      source: "Configuration",
      href: `/clients/${encodedOrgId}/config`,
    });
  }

  return items;
}

function buildAdoptionInboxItems(
  adoption: DecisionsAdoption | null,
): InboxItem[] {
  const items: InboxItem[] = [];
  const organizations = adoption?.organizations ?? [];

  for (const org of organizations) {
    if (org.adoptionRate >= 50 || org.totalDecisions <= 0) {
      continue;
    }

    const encodedOrgId = encodeURIComponent(org.orgId);
    items.push({
      id: `adoption-low-${org.orgId}`,
      priority: "warning",
      title: `Adoption faible (${Math.round(org.adoptionRate)}%)`,
      description: `${org.orgName} — ${org.totalDecisions} decisions au total`,
      source: "Adoption",
      href: `/clients/${encodedOrgId}/vue-client`,
    });
  }

  return items;
}

export function buildInboxItems(
  alerts: AlertsByOrg | null,
  costParams: CostParamsMissing | null,
  adoption: DecisionsAdoption | null,
  unread: UnreadCount | null,
): InboxItem[] {
  const items = [
    ...buildAlertInboxItems(alerts),
    ...buildUnreadInboxItems(unread),
    ...buildCostParamInboxItems(costParams),
    ...buildAdoptionInboxItems(adoption),
  ];

  items.sort(
    (a, b) =>
      INBOX_PRIORITY_ORDER[a.priority] - INBOX_PRIORITY_ORDER[b.priority],
  );
  return items;
}
