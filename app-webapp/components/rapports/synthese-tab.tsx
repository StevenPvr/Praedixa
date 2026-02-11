"use client";

import { useMemo } from "react";
import type { WeeklySummary, CoverageAlert } from "@praedixa/shared-types";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { buildWeeklySummaries } from "@/lib/rapports-helpers";

const weeklyColumns: DataTableColumn<WeeklySummary>[] = [
  { key: "weekStart", label: "Semaine du" },
  { key: "weekEnd", label: "au" },
  { key: "totalAlerts", label: "Alertes detectees", align: "right" },
  { key: "alertsResolved", label: "Alertes resolues", align: "right" },
  { key: "alertsPending", label: "En attente", align: "right" },
  {
    key: "totalCostEur",
    label: "Cout total",
    align: "right",
    render: (row) => `${row.totalCostEur.toLocaleString("fr-FR")} EUR`,
  },
  {
    key: "avgServicePct",
    label: "Couverture moyenne",
    align: "right",
    render: (row) => `${row.avgServicePct.toFixed(1)}%`,
  },
];

interface SyntheseTabProps {
  coverageAlerts: CoverageAlert[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function SyntheseTab({
  coverageAlerts,
  loading,
  error,
  onRetry,
}: SyntheseTabProps) {
  const weeklyData = useMemo(
    () => buildWeeklySummaries(coverageAlerts ?? []),
    [coverageAlerts],
  );

  const latest = weeklyData[0];

  return (
    <AnimatedSection>
      <section aria-label="Bilan de la semaine" className="space-y-4">
        {loading ? (
          <StatusBanner
            variant="info"
            title="Consolidation hebdomadaire en cours"
          >
            Construction du bilan des alertes, resolutions et impacts
            financiers.
          </StatusBanner>
        ) : latest && latest.alertsPending > 0 ? (
          <StatusBanner variant="warning" title="Points en attente a cloturer">
            {latest.alertsPending} alerte(s) restent ouvertes sur la derniere
            semaine consolidee.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Bilan operationnel stable">
            Aucun retard de traitement critique sur la periode la plus recente.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Semaines consolidees"
              value={loading ? "..." : weeklyData.length}
              status={weeklyData.length > 0 ? "good" : "neutral"}
            />
            <MetricCard
              label="Alertes detectees"
              value={loading ? "..." : (latest?.totalAlerts ?? 0)}
              status={(latest?.totalAlerts ?? 0) > 0 ? "warning" : "good"}
            />
            <MetricCard
              label="Alertes resolues"
              value={loading ? "..." : (latest?.alertsResolved ?? 0)}
              status={(latest?.alertsResolved ?? 0) > 0 ? "good" : "neutral"}
            />
            <MetricCard
              label="Couverture moyenne"
              value={
                loading ? "..." : `${(latest?.avgServicePct ?? 0).toFixed(1)}%`
              }
              status={(latest?.avgServicePct ?? 0) >= 90 ? "good" : "warning"}
            />
          </div>
        </DetailCard>

        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : error ? (
          <ErrorFallback message={error} onRetry={onRetry} />
        ) : (
          <DataTable<WeeklySummary>
            columns={weeklyColumns}
            data={weeklyData}
            getRowKey={(row) => row.weekStart}
            emptyMessage="Aucune donnee pour le moment. Les bilans hebdomadaires apparaitront apres votre premiere semaine d'utilisation."
          />
        )}
      </section>
    </AnimatedSection>
  );
}
