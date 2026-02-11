"use client";

import { useMemo } from "react";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { formatDateOrDash } from "@/lib/date-formatters";
import { toPercent, type ForecastRunSummary } from "@/lib/rapports-helpers";

const forecastColumns: DataTableColumn<ForecastRunSummary>[] = [
  {
    key: "completedAt",
    label: "Date d'execution",
    render: (row) => formatDateOrDash(row.completedAt),
  },
  { key: "modelType", label: "Modele" },
  { key: "horizonDays", label: "Horizon (jours)", align: "right" },
  {
    key: "accuracyScore",
    label: "Precision",
    align: "right",
    render: (row) =>
      row.accuracyScore == null
        ? "-"
        : `${toPercent(row.accuracyScore).toFixed(1)}%`,
  },
];

interface PrecisionTabProps {
  forecastRuns: ForecastRunSummary[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function PrecisionTab({
  forecastRuns,
  loading,
  error,
  onRetry,
}: PrecisionTabProps) {
  const forecastStats = useMemo(() => {
    const runs = forecastRuns ?? [];
    const accuracyValues = runs
      .map((r) => r.accuracyScore)
      .filter((v): v is number => v != null)
      .map(toPercent);

    if (accuracyValues.length === 0) {
      return {
        totalRuns: runs.length,
        averageAccuracy: null as number | null,
        bestAccuracy: null as number | null,
      };
    }

    const averageAccuracy =
      accuracyValues.reduce((sum, value) => sum + value, 0) /
      accuracyValues.length;
    const bestAccuracy = Math.max(...accuracyValues);

    return {
      totalRuns: runs.length,
      averageAccuracy,
      bestAccuracy,
    };
  }, [forecastRuns]);

  return (
    <AnimatedSection>
      <section aria-label="Fiabilite des previsions">
        {error ? (
          <ErrorFallback message={error} onRetry={onRetry} />
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Cette section suit la fiabilite des runs de prevision pour
              comprendre si le modele reste stable dans le temps.
            </p>
            <DetailCard>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Runs completes</p>
                  <p className="text-xl font-semibold text-charcoal">
                    {loading ? "..." : String(forecastStats.totalRuns)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Precision moyenne</p>
                  <p className="text-xl font-semibold text-charcoal">
                    {loading
                      ? "..."
                      : forecastStats.averageAccuracy == null
                        ? "-"
                        : `${forecastStats.averageAccuracy.toFixed(1)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Meilleure precision</p>
                  <p className="text-xl font-semibold text-charcoal">
                    {loading
                      ? "..."
                      : forecastStats.bestAccuracy == null
                        ? "-"
                        : `${forecastStats.bestAccuracy.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </DetailCard>

            {loading ? (
              <SkeletonTable rows={5} columns={4} />
            ) : (
              <DataTable<ForecastRunSummary>
                columns={forecastColumns}
                data={forecastRuns ?? []}
                getRowKey={(row) => row.id}
                emptyMessage="Aucune execution de prevision disponible."
              />
            )}
          </div>
        )}
      </section>
    </AnimatedSection>
  );
}
