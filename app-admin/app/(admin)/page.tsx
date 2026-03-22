"use client";

import { useMemo } from "react";
import { AlertTriangle, Clock, Activity, Zap, CheckCircle } from "lucide-react";
import { StatCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { SkeletonAdminDashboard } from "@/components/skeletons/skeleton-admin-dashboard";
import { InboxItemCard } from "@/components/inbox-item-card";
import { SystemHealthBar } from "@/components/system-health-bar";
import { ActivityFeed, type AuditLogEntry } from "@/components/activity-feed";
import { UnreadMessagesCard } from "@/components/unread-messages-card";
import {
  buildInboxItems,
  type PlatformKPIs,
  type AlertsByOrg,
  type CostParamsMissing,
  type DecisionsAdoption,
  type UnreadCount,
} from "@/lib/inbox-helpers";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

/* ────────────────────────────────────────────── */
/*  Main Page                                     */
/* ────────────────────────────────────────────── */

export default function AccueilPage() {
  const currentUser = useCurrentUser();
  const canReadAudit = hasAnyPermission(currentUser?.permissions, [
    "admin:audit:read",
  ]);
  const canReadMessages = hasAnyPermission(currentUser?.permissions, [
    "admin:messages:read",
    "admin:messages:write",
  ]);

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
    canReadAudit ? `${ADMIN_ENDPOINTS.auditLog}?page=1&pageSize=10` : null,
  );

  const { data: unreadCount } = useApiGet<UnreadCount>(
    canReadMessages ? ADMIN_ENDPOINTS.conversationsUnread : null,
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
        <h1 className="font-serif text-2xl font-bold text-ink">Accueil</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Inbox operationnel — vue d&apos;ensemble de la plateforme
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Organisations actives"
          value={String(kpis?.activeOrganizations ?? 0)}
          {...(kpis
            ? {
                trend: `${kpis.activeOrganizations}/${kpis.totalOrganizations}`,
              }
            : {})}
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
          <h2 className="font-serif text-lg font-semibold text-ink">
            Inbox ({inboxItems.length})
          </h2>
          {inboxItems.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-border-subtle bg-card p-8 shadow-soft">
              <CheckCircle className="h-8 w-8 text-success-500" />
              <p className="mt-3 text-sm font-medium text-charcoal">
                Aucun element en attente
              </p>
              <p className="mt-1 text-sm text-ink-placeholder">
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
          {canReadMessages && unreadCount ? (
            <UnreadMessagesCard unread={unreadCount} />
          ) : null}
        </div>
      </div>

      {/* Activity feed */}
      {canReadAudit && auditEntries ? (
        <ActivityFeed entries={auditEntries} />
      ) : null}
    </div>
  );
}
