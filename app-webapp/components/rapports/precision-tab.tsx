"use client";

import { useMemo } from "react";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { Card } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { StatusBanner } from "@/components/status-banner";
import { formatDateOrDash } from "@/lib/formatters";
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
      <section aria-label="Fiabilite des previsions" className="space-y-4">
        {error ? (
          <ErrorFallback message={error} onRetry={onRetry} />
        ) : (
          <>
            {loading ? (
              <StatusBanner variant="info" title="Evaluation des runs en cours">
                Consolidation des scores de precision et des tendances de
                fiabilite.
              </StatusBanner>
            ) : (forecastStats.averageAccuracy ?? 0) >= 90 ? (
              <StatusBanner variant="success" title="Precision modele robuste">
                La performance des derniers runs reste au-dessus du seuil
                attendu.
              </StatusBanner>
            ) : (
              <StatusBanner variant="warning" title="Precision a surveiller">
                La fiabilite moyenne est inferieure au niveau cible. Verifiez
                les donnees d'entree et les modeles actifs.
              </StatusBanner>
            )}

            <Card variant="elevated">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  label="Runs completes"
                  value={loading ? "..." : String(forecastStats.totalRuns)}
                  status={forecastStats.totalRuns > 0 ? "good" : "neutral"}
                />
                <MetricCard
                  label="Precision moyenne"
                  value={
                    loading
                      ? "..."
                      : forecastStats.averageAccuracy == null
                        ? "-"
                        : `${forecastStats.averageAccuracy.toFixed(1)}%`
                  }
                  status={
                    (forecastStats.averageAccuracy ?? 0) >= 90
                      ? "good"
                      : "warning"
                  }
                />
                <MetricCard
                  label="Meilleure precision"
                  value={
                    loading
                      ? "..."
                      : forecastStats.bestAccuracy == null
                        ? "-"
                        : `${forecastStats.bestAccuracy.toFixed(1)}%`
                  }
                  status={
                    (forecastStats.bestAccuracy ?? 0) >= 95 ? "good" : "neutral"
                  }
                />
              </div>
            </Card>

            {loading ? (
              <SkeletonTable
                rows={5}
                columns={4}
                className="rounded-[var(--radius-lg)] shadow-[var(--shadow-floating)]"
              />
            ) : (
              <DataTable<ForecastRunSummary>
                columns={forecastColumns}
                data={forecastRuns ?? []}
                getRowKey={(row) => row.id}
                emptyMessage="Aucune execution de prevision disponible."
              />
            )}
          </>
        )}
      </section>
    </AnimatedSection>
  );
}
