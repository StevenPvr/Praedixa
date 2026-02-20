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
};

export function buildInboxItems(
  alerts: AlertsByOrg | null,
  costParams: CostParamsMissing | null,
  adoption: DecisionsAdoption | null,
  unread: UnreadCount | null,
): InboxItem[] {
  const items: InboxItem[] = [];

  if (alerts?.organizations) {
    for (const org of alerts.organizations) {
      if (org.critical > 0) {
        items.push({
          id: `alert-critical-${org.orgId}`,
          priority: "urgent",
          title: `${org.critical} alerte(s) critique(s)`,
          description: `${org.orgName} — ${org.total} alertes au total`,
          source: "Alertes",
          href: `/clients/${org.orgId}/alertes`,
        });
      }
      if (org.high > 0 && org.critical === 0) {
        items.push({
          id: `alert-high-${org.orgId}`,
          priority: "warning",
          title: `${org.high} alerte(s) elevee(s)`,
          description: `${org.orgName} — necessite une attention`,
          source: "Alertes",
          href: `/clients/${org.orgId}/alertes`,
        });
      }
    }
  }

  if (unread?.byOrg) {
    for (const org of unread.byOrg) {
      if (org.count > 5) {
        items.push({
          id: `unread-urgent-${org.orgId}`,
          priority: "urgent",
          title: `${org.count} messages non lus`,
          description: `${org.orgName} — reponse en attente`,
          source: "Messages",
          href: `/clients/${org.orgId}/messages`,
        });
      } else if (org.count > 0) {
        items.push({
          id: `unread-${org.orgId}`,
          priority: "info",
          title: `${org.count} message(s) non lu(s)`,
          description: org.orgName,
          source: "Messages",
          href: `/clients/${org.orgId}/messages`,
        });
      }
    }
  }

  if (costParams?.organizations) {
    for (const org of costParams.organizations) {
      if (org.missingSites > 0) {
        items.push({
          id: `cost-missing-${org.orgId}`,
          priority: "warning",
          title: `Parametres de cout manquants`,
          description: `${org.orgName} — ${org.missingSites}/${org.totalSites} sites non configures`,
          source: "Configuration",
          href: `/clients/${org.orgId}/config`,
        });
      }
    }
  }

  if (adoption?.organizations) {
    for (const org of adoption.organizations) {
      if (org.adoptionRate < 50 && org.totalDecisions > 0) {
        items.push({
          id: `adoption-low-${org.orgId}`,
          priority: "warning",
          title: `Adoption faible (${Math.round(org.adoptionRate)}%)`,
          description: `${org.orgName} — ${org.totalDecisions} decisions au total`,
          source: "Adoption",
          href: `/clients/${org.orgId}/vue-client`,
        });
      }
    }
  }

  const priorityOrder: Record<InboxPriority, number> = {
    urgent: 0,
    warning: 1,
    info: 2,
  };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}
