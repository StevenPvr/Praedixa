"use client";

import type { OverrideStatistics } from "@praedixa/shared-types";
import {
  MetricCard,
  DataTable,
  SkeletonCard,
  SkeletonTable,
} from "@praedixa/ui";
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
  } = useApiGet<OverrideStatistics>(
    "/api/v1/operational-decisions/override-stats",
  );

  const reasonColumns: DataTableColumn<ReasonRow>[] = [
    { key: "reason", label: "Raison invoquee" },
    { key: "count", label: "Nombre de fois", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Qualite des decisions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Mesurez l&apos;efficacite de vos choix et identifiez les axes
          d&apos;amelioration
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
          <section aria-label="Indicateurs choix manuels">
            <div className="flex flex-wrap gap-3">
              <MetricCard
                label="Actions enregistrees"
                value={stats.totalDecisions}
                status="neutral"
              />
              <MetricCard
                label="Choix manuels"
                value={stats.overrideCount}
                status={Number(stats.overridePct) > 20 ? "danger" : "good"}
              />
              <MetricCard
                label="Taux de choix manuels"
                value={`${Number(stats.overridePct).toFixed(1)}%`}
                status={Number(stats.overridePct) > 20 ? "warning" : "good"}
              />
              <MetricCard
                label="Ecart de cout moyen"
                value={
                  stats.avgCostDelta != null
                    ? `${Number(stats.avgCostDelta) >= 0 ? "+" : ""}${Number(stats.avgCostDelta).toFixed(0)} EUR`
                    : "--"
                }
                status={
                  stats.avgCostDelta != null && Number(stats.avgCostDelta) > 0
                    ? "danger"
                    : "good"
                }
              />
            </div>
          </section>

          <section aria-label="Principales raisons des choix manuels">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">
              Principales raisons des choix manuels
            </h2>
            <DataTable<ReasonRow>
              columns={reasonColumns}
              data={stats.topOverrideReasons}
              getRowKey={(row) => row.reason}
              emptyMessage="Aucune raison enregistree pour le moment."
            />
          </section>
        </>
      ) : (
        <ErrorFallback
          variant="empty"
          message="Aucune statistique disponible"
        />
      )}
    </div>
  );
}
