"use client";

import type { ReactNode } from "react";
import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  DataTable,
  StatCard,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { SeverityBadge } from "@/components/severity-badge";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

interface AlertItem {
  id: string;
  date: string;
  type: string;
  severity: string;
  siteName?: string;
  departmentName?: string;
  status: string;
  message?: string;
}

function getAlertStatusClassName(status: string): string {
  if (status === "resolved") {
    return "text-success";
  }

  if (status === "acknowledged") {
    return "text-primary";
  }

  return "text-ink-tertiary";
}

export default function AlertesPage() {
  const { orgId, selectedSiteId } = useClientContext();

  const alertsUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgAlerts(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgAlerts(orgId);

  const {
    data: alerts,
    loading,
    error,
    refetch,
  } = useApiGet<AlertItem[]>(alertsUrl);

  const alertList = alerts ?? [];

  const criticalCount = alertList.filter(
    (a) => a.severity === "CRITICAL",
  ).length;
  const warningCount = alertList.filter((a) => a.severity === "WARNING").length;
  const infoCount = alertList.filter((a) => a.severity === "INFO").length;

  const columns: DataTableColumn<AlertItem>[] = [
    {
      key: "date",
      label: "Date",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {new Date(row.date).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    { key: "type", label: "Type" },
    {
      key: "severity",
      label: "Severite",
      render: (row) => (
        <SeverityBadge
          severity={row.severity as "INFO" | "WARNING" | "CRITICAL"}
        />
      ),
    },
    {
      key: "siteName",
      label: "Site",
      render: (row) => <span>{row.siteName ?? "-"}</span>,
    },
    {
      key: "departmentName",
      label: "Departement",
      render: (row) => <span>{row.departmentName ?? "-"}</span>,
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span className={getAlertStatusClassName(row.status)}>
          {row.status}
        </span>
      ),
    },
  ];

  let alertsTableContent: ReactNode;

  if (loading) {
    alertsTableContent = <SkeletonCard />;
  } else if (error) {
    alertsTableContent = <ErrorFallback message={error} onRetry={refetch} />;
  } else {
    alertsTableContent = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={alertList}
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Alertes</h2>

      {/* Summary cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Critiques"
            value={String(criticalCount)}
            icon={<ShieldAlert className="h-4 w-4" />}
            variant={criticalCount > 0 ? "warning" : undefined}
          />
          <StatCard
            label="Avertissements"
            value={String(warningCount)}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
          <StatCard
            label="Informations"
            value={String(infoCount)}
            icon={<Info className="h-4 w-4" />}
          />
        </div>
      )}

      {/* Alerts table */}
      {alertsTableContent}
    </div>
  );
}
