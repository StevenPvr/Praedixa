"use client";

import { useMemo, useState } from "react";
import type { CoverageAlert } from "@praedixa/shared-types";
import { AlertOctagon, ShieldAlert, Siren, Filter } from "lucide-react";
import { DataTable, type DataTableColumn, SkeletonTable } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { StatusBanner } from "@/components/status-banner";
import { MetricCard } from "@/components/ui/metric-card";
import {
  SelectDropdown,
  type SelectOption,
} from "@/components/ui/select-dropdown";
import { Badge } from "@/components/ui/badge";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { formatSeverity, getSeverityBadgeVariant } from "@/lib/formatters";
import { useSiteScope } from "@/lib/site-scope";

const SEVERITY_OPTIONS: SelectOption[] = [
  { value: "", label: "Toutes les severites" },
  { value: "critical", label: "Critique" },
  { value: "high", label: "Elevee" },
  { value: "medium", label: "Moderee" },
  { value: "low", label: "Faible" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Tous les statuts" },
  { value: "open", label: "Ouverte" },
  { value: "acknowledged", label: "Accusee" },
  { value: "resolved", label: "Resolue" },
  { value: "expired", label: "Expiree" },
];

const columns: DataTableColumn<CoverageAlert>[] = [
  { key: "siteId", label: "Site" },
  { key: "alertDate", label: "Date" },
  { key: "shift", label: "Poste" },
  {
    key: "severity",
    label: "Severite",
    render: (row) => (
      <Badge variant={getSeverityBadgeVariant(row.severity)}>
        {formatSeverity(row.severity)}
      </Badge>
    ),
  },
  {
    key: "pRupture",
    label: "Risque rupture",
    align: "right",
    render: (row) => `${Math.round(row.pRupture * 100)}%`,
  },
  {
    key: "gapH",
    label: "Heures manquantes",
    align: "right",
    render: (row) => row.gapH.toFixed(1),
  },
  {
    key: "horizon",
    label: "Horizon",
    render: (row) => row.horizon.toUpperCase(),
  },
  {
    key: "status",
    label: "Etat",
    render: (row) =>
      row.status === "open"
        ? "Ouverte"
        : row.status === "acknowledged"
          ? "Accusee"
          : row.status === "resolved"
            ? "Resolue"
            : "Expiree",
  },
];

export default function PrevisionsAlertesPage() {
  const { appendSiteParam } = useSiteScope();
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("open");
  const baseUrl = useMemo(
    () =>
      appendSiteParam(
        `/api/v1/live/coverage-alerts?page_size=400${status ? `&status=${status}` : ""}`,
      ),
    [appendSiteParam, status],
  );

  const { data, loading, error, refetch } = useApiGet<CoverageAlert[]>(
    baseUrl,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const filteredAlerts = useMemo(
    () =>
      (data ?? []).filter((alert) =>
        severity ? alert.severity === severity : true,
      ),
    [data, severity],
  );

  const criticalCount = filteredAlerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const highCount = filteredAlerts.filter(
    (alert) => alert.severity === "high",
  ).length;

  return (
    <PageTransition>
      <div className="gradient-mesh min-h-full space-y-8">
        <PageHeader
          eyebrow="Anticipation"
          title="Toutes les alertes"
          subtitle="Priorisez les risques de sous-effectif avec une vue consolidée par severite, horizon et statut."
        />

        {loading ? (
          <StatusBanner variant="info" title="Analyse des alertes en cours">
            Synchronisation des signaux de risque sur tous les sites.
          </StatusBanner>
        ) : criticalCount > 0 ? (
          <StatusBanner variant="danger" title="Risque critique detecte">
            {criticalCount} alerte(s) critique(s) et {highCount} alerte(s)
            elevee(s) exigent une decision immediate.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Risque sous controle">
            Aucune alerte critique active sur le perimetre selectionne.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Alertes affichees"
              value={loading ? "..." : filteredAlerts.length}
              status={criticalCount > 0 ? "danger" : "neutral"}
              icon={<AlertOctagon className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Critiques"
              value={loading ? "..." : criticalCount}
              status={criticalCount > 0 ? "danger" : "good"}
              icon={<Siren className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Elevees"
              value={loading ? "..." : highCount}
              status={highCount > 0 ? "warning" : "good"}
              icon={<ShieldAlert className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Filtres actifs"
              value={[severity, status].filter(Boolean).length}
              status="neutral"
              icon={<Filter className="h-5 w-5" />}
            />
          </div>
        </DetailCard>

        <DetailCard>
          <div className="flex flex-wrap items-end gap-4">
            <SelectDropdown
              label="Severite"
              options={SEVERITY_OPTIONS}
              value={severity}
              onChange={setSeverity}
            />
            <SelectDropdown
              label="Statut"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </div>
        </DetailCard>

        {error ? (
          <ErrorFallback message={error} onRetry={refetch} />
        ) : loading ? (
          <SkeletonTable rows={10} columns={8} />
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            icon={<AlertOctagon className="h-6 w-6 text-ink-tertiary" />}
            title="Aucune alerte"
            description="Aucune alerte ne correspond aux filtres en cours."
          />
        ) : (
          <DataTable<CoverageAlert>
            columns={columns}
            data={filteredAlerts}
            getRowKey={(row) => row.id}
            emptyMessage="Aucune alerte disponible"
            stickyHeader
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-floating)]"
          />
        )}
      </div>
    </PageTransition>
  );
}
