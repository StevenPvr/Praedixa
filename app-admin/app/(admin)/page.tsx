"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Activity,
  ChevronRight,
  Server,
  Zap,
} from "lucide-react";
import { StatCard, Card } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { SeverityBadge } from "@/components/severity-badge";
import { SkeletonAdminDashboard } from "@/components/skeletons";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface PlatformKPIs {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  totalDatasets: number;
  totalForecasts: number;
  totalDecisions: number;
  ingestionSuccessRate: number;
  apiErrorRate: number;
}

interface AlertSummary {
  orgId: string;
  orgName: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface AlertsByOrg {
  organizations: AlertSummary[];
  totalAlerts: number;
}

interface CostParamsMissing {
  organizations: {
    orgId: string;
    orgName: string;
    missingSites: number;
    totalSites: number;
  }[];
}

interface DecisionsAdoption {
  organizations: {
    orgId: string;
    orgName: string;
    adoptionRate: number;
    totalDecisions: number;
  }[];
}

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  action: string;
  resourceType: string | null;
  severity: string;
  createdAt: string;
  targetOrgId: string | null;
}

interface UnreadCount {
  total: number;
  byOrg: { orgId: string; orgName: string; count: number }[];
}

/* ────────────────────────────────────────────── */
/*  Priority logic                                */
/* ────────────────────────────────────────────── */

type InboxPriority = "urgent" | "warning" | "info";

interface InboxItem {
  id: string;
  priority: InboxPriority;
  title: string;
  description: string;
  source: string;
  href: string;
  timestamp?: string;
}

const PRIORITY_CONFIG: Record<
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
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-500",
    label: "A surveiller",
  },
  info: {
    bg: "bg-white",
    border: "border-neutral-200/80",
    dot: "bg-neutral-300",
    label: "Info",
  },
};

const ACTION_LABELS: Record<string, string> = {
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

function buildInboxItems(
  alerts: AlertsByOrg | null,
  costParams: CostParamsMissing | null,
  adoption: DecisionsAdoption | null,
  unread: UnreadCount | null,
): InboxItem[] {
  const items: InboxItem[] = [];

  // URGENT: critical/high alerts
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

  // URGENT: unread messages > 5
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

  // WARNING: missing cost params
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

  // WARNING: low adoption rate < 50%
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

  // Sort: urgent first, then warning, then info
  const priorityOrder: Record<InboxPriority, number> = {
    urgent: 0,
    warning: 1,
    info: 2,
  };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
}

/* ────────────────────────────────────────────── */
/*  Sub-components                                */
/* ────────────────────────────────────────────── */

function InboxItemCard({ item }: { item: InboxItem }) {
  const config = PRIORITY_CONFIG[item.priority];

  return (
    <a
      href={item.href}
      className={`flex items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-card hover:-translate-y-0.5 ${config.bg} ${config.border}`}
    >
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-charcoal">
            {item.title}
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {item.source}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-500">
          {item.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
    </a>
  );
}

function SystemHealthBar({ kpis }: { kpis: PlatformKPIs }) {
  const ingestionOk = kpis.ingestionSuccessRate >= 95;
  const apiOk = kpis.apiErrorRate <= 2;

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-neutral-900">
        Sante plateforme
      </h2>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Taux d'ingestion</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-6 w-24 overflow-hidden rounded-full ${ingestionOk ? "bg-success-100" : "bg-danger-100"}`}
            >
              <div
                className={`h-full rounded-full transition-all ${ingestionOk ? "bg-success-500" : "bg-danger-500"}`}
                style={{
                  width: `${Math.min(100, kpis.ingestionSuccessRate)}%`,
                }}
              />
            </div>
            <span
              className={`text-sm font-medium ${ingestionOk ? "text-success-600" : "text-danger-600"}`}
            >
              {kpis.ingestionSuccessRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Taux d'erreur API</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-6 w-24 overflow-hidden rounded-full ${apiOk ? "bg-success-100" : "bg-danger-100"}`}
            >
              <div
                className={`h-full rounded-full transition-all ${apiOk ? "bg-success-500" : "bg-danger-500"}`}
                style={{ width: `${Math.min(100, kpis.apiErrorRate * 10)}%` }}
              />
            </div>
            <span
              className={`text-sm font-medium ${apiOk ? "text-success-600" : "text-danger-600"}`}
            >
              {kpis.apiErrorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ActivityFeed({ entries }: { entries: AuditLogEntry[] }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 font-serif text-lg font-semibold text-neutral-900">
        Activite recente
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">Aucune activite recente</p>
      ) : (
        <div className="space-y-1">
          {entries.slice(0, 10).map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50"
            >
              <SeverityBadge severity={entry.severity} />
              <span className="min-w-0 flex-1 truncate text-sm text-charcoal">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="shrink-0 text-xs text-gray-400">
                {new Date(entry.createdAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function UnreadMessagesCard({ unread }: { unread: UnreadCount }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-neutral-900">
          Messages non lus
        </h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-700">
          {unread.total}
        </span>
      </div>
      {unread.byOrg.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CheckCircle className="h-4 w-4 text-success-500" />
          Aucun message en attente
        </div>
      ) : (
        <div className="space-y-2">
          {unread.byOrg.map((org) => (
            <a
              key={org.orgId}
              href={`/clients/${org.orgId}/messages`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-neutral-50"
            >
              <span className="text-sm text-charcoal">{org.orgName}</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {org.count}
              </span>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ────────────────────────────────────────────── */
/*  Main Page                                     */
/* ────────────────────────────────────────────── */

export default function AccueilPage() {
  const {
    data: kpis,
    loading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useApiGet<PlatformKPIs>(ADMIN_ENDPOINTS.platformKPIs);

  const { data: alertsByOrg } = useApiGet<AlertsByOrg>(
    ADMIN_ENDPOINTS.monitoringAlertsByOrg,
  );

  const { data: costParams } = useApiGet<CostParamsMissing>(
    ADMIN_ENDPOINTS.monitoringCostParamsMissing,
  );

  const { data: adoption } = useApiGet<DecisionsAdoption>(
    ADMIN_ENDPOINTS.monitoringDecisionsAdoption,
  );

  const { data: auditEntries } = useApiGet<AuditLogEntry[]>(
    `${ADMIN_ENDPOINTS.auditLog}?page=1&pageSize=10`,
  );

  const { data: unreadCount } = useApiGet<UnreadCount>(
    ADMIN_ENDPOINTS.conversationsUnread,
  );

  const inboxItems = useMemo(
    () => buildInboxItems(alertsByOrg, costParams, adoption, unreadCount),
    [alertsByOrg, costParams, adoption, unreadCount],
  );

  const urgentCount = inboxItems.filter((i) => i.priority === "urgent").length;
  const warningCount = inboxItems.filter(
    (i) => i.priority === "warning",
  ).length;

  if (kpisLoading) {
    return <SkeletonAdminDashboard />;
  }

  if (kpisError) {
    return <ErrorFallback message={kpisError} onRetry={refetchKpis} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-neutral-900">
          Accueil
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Inbox operationnel — vue d'ensemble de la plateforme
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Organisations actives"
          value={String(kpis?.activeOrganizations ?? 0)}
          trend={
            kpis
              ? `${kpis.activeOrganizations}/${kpis.totalOrganizations}`
              : undefined
          }
          trendDirection="flat"
          icon={<Activity className="h-4 w-4" />}
        />
        <StatCard
          label="Utilisateurs"
          value={String(kpis?.totalUsers ?? 0)}
          icon={<Zap className="h-4 w-4" />}
        />
        <StatCard
          label="Items urgents"
          value={String(urgentCount)}
          variant={urgentCount > 0 ? "danger" : "success"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="A surveiller"
          value={String(warningCount)}
          variant={warningCount > 0 ? "warning" : "default"}
          icon={<Clock className="h-4 w-4" />}
        />
      </div>

      {/* Main content: Inbox + sidebar */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inbox items — 2/3 width */}
        <div className="space-y-3 lg:col-span-2">
          <h2 className="font-serif text-lg font-semibold text-neutral-900">
            Inbox ({inboxItems.length})
          </h2>
          {inboxItems.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-soft">
              <CheckCircle className="h-8 w-8 text-success-500" />
              <p className="mt-3 text-sm font-medium text-charcoal">
                Aucun element en attente
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Tout est en ordre sur la plateforme
              </p>
            </div>
          ) : (
            inboxItems.map((item) => (
              <InboxItemCard key={item.id} item={item} />
            ))
          )}
        </div>

        {/* Sidebar cards — 1/3 width */}
        <div className="space-y-6">
          {kpis && <SystemHealthBar kpis={kpis} />}
          {unreadCount && <UnreadMessagesCard unread={unreadCount} />}
        </div>
      </div>

      {/* Activity feed */}
      {auditEntries && <ActivityFeed entries={auditEntries} />}
    </div>
  );
}
