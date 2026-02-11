"use client";

import type { WeeklySummary, CoverageAlert } from "@praedixa/shared-types";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
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
  return (
    <AnimatedSection>
      <section aria-label="Bilan de la semaine">
        <p className="mb-3 text-xs text-gray-500">
          Synthese hebdomadaire des alertes: detectees, resolues, en attente et
          impact cout/service.
        </p>
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : error ? (
          <ErrorFallback message={error} onRetry={onRetry} />
        ) : (
          <DataTable<WeeklySummary>
            columns={weeklyColumns}
            data={buildWeeklySummaries(coverageAlerts ?? [])}
            getRowKey={(row) => row.weekStart}
            emptyMessage="Aucune donnee pour le moment. Les bilans hebdomadaires apparaitront apres votre premiere semaine d'utilisation."
          />
        )}
      </section>
    </AnimatedSection>
  );
}
