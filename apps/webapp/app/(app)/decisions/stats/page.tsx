"use client";

import type { OverrideStatistics } from "@praedixa/shared-types";
import { MetricCard, DataTable, SkeletonCard, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface ReasonRow {
  reason: string;
  count: number;
}

export default function DecisionStatsPage() {
  const {
    data: stats,
    loading,
    error,
    refetch,
  } = useApiGet<OverrideStatistics>("/api/v1/operational-decisions/override-stats");

  const reasonColumns: DataTableColumn<ReasonRow>[] = [
    { key: "reason", label: "Raison" },
    { key: "count", label: "Occurrences", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Statistiques des decisions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyse des overrides et de l&apos;adoption
        </p>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <>
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <SkeletonTable rows={5} columns={2} />
        </>
      ) : stats ? (
        <>
          <section aria-label="Indicateurs override">
            <div className="flex flex-wrap gap-3">
              <MetricCard
                label="Total decisions"
                value={stats.totalDecisions}
                status="neutral"
              />
              <MetricCard
                label="Overrides"
                value={stats.overrideCount}
                status={Number(stats.overridePct) > 20 ? "danger" : "good"}
              />
              <MetricCard
                label="Taux override"
                value={`${Number(stats.overridePct).toFixed(1)}%`}
                status={Number(stats.overridePct) > 20 ? "warning" : "good"}
              />
              <MetricCard
                label="Delta cout moyen"
                value={stats.avgCostDelta != null ? `${Number(stats.avgCostDelta) >= 0 ? "+" : ""}${Number(stats.avgCostDelta).toFixed(0)} EUR` : "--"}
                status={stats.avgCostDelta != null && Number(stats.avgCostDelta) > 0 ? "danger" : "good"}
              />
            </div>
          </section>

          <section aria-label="Top raisons override">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">
              Top raisons d&apos;override
            </h2>
            <DataTable<ReasonRow>
              columns={reasonColumns}
              data={stats.topOverrideReasons}
              getRowKey={(row) => row.reason}
              emptyMessage="Aucune raison d'override enregistree"
            />
          </section>
        </>
      ) : (
        <ErrorFallback variant="empty" message="Aucune statistique disponible" />
      )}
    </div>
  );
}
