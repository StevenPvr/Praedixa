"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { LineChart } from "@tremor/react";
import type { CoverageAlert } from "@praedixa/shared-types";
import { SkeletonChart, SkeletonCard } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { DecompositionPanel } from "@/components/previsions/decomposition-panel";
import { FeatureImportanceBar } from "@/components/previsions/feature-importance-bar";
import { formatSeverity } from "@/lib/formatters";
import {
  decomposeForecast,
  extractFeatureImportance,
} from "@/lib/forecast-decomposition";
import type { DailyForecastData } from "@/lib/forecast-decomposition";
import { isUuid } from "@/lib/uuid";
import { buildCapacitySeries } from "@/lib/capacity-chart";

type Dimension = "human" | "merchandise";

interface ForecastRunSummary {
  id: string;
  status: string;
}

const chartValueFormatter = (v: number) => v.toFixed(0);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function PrevisionsPage() {
  const [dimension, setDimension] = useState<Dimension>("human");

  // 1. Fetch latest completed forecast run
  const {
    data: runs,
    loading: runsLoading,
    error: runsError,
    refetch: refetchRuns,
  } = useApiGet<ForecastRunSummary[]>(
    "/api/v1/forecasts?page=1&page_size=1&status=completed",
  );

  const latestRunId = runs && runs.length > 0 ? runs[0].id : null;
  const dailyRunId = isUuid(latestRunId) ? latestRunId : null;

  // 2. Fetch daily forecasts for the latest run
  const {
    data: dailyData,
    loading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useApiGet<DailyForecastData[]>(
    dailyRunId
      ? `/api/v1/forecasts/${encodeURIComponent(dailyRunId)}/daily?dimension=${encodeURIComponent(dimension)}`
      : null,
  );

  // 3. Fetch coverage alerts
  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
  } = useApiGet<CoverageAlert[]>("/api/v1/coverage-alerts?status=open");

  const forecastLoading = runsLoading || (dailyRunId !== null && dailyLoading);
  const forecastError = runsError ?? dailyError;

  // Decomposition
  const decomposition = useMemo(
    () => (dailyData ? decomposeForecast(dailyData) : null),
    [dailyData],
  );

  // Feature importance from alerts
  const features = useMemo(
    () => (alerts ? extractFeatureImportance(alerts) : []),
    [alerts],
  );

  // Main chart data
  const chartData = buildCapacitySeries(dailyData ?? [], formatDate);

  const dimensionLabel = dimension === "human" ? "humaine" : "marchandise";

  const topAlerts = (alerts ?? []).slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Previsions"
        subtitle="Comprenez pourquoi et anticipez les besoins"
      />

      {/* A. Main forecast chart */}
      <AnimatedSection>
        <DetailCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-semibold text-charcoal">
                Prevision de couverture a 14 jours
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Capacite {dimensionLabel} — tous sites
              </p>
            </div>
            <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                onClick={() => setDimension("human")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  dimension === "human"
                    ? "bg-white text-charcoal shadow-sm"
                    : "text-gray-500 hover:text-charcoal"
                }`}
              >
                Humaine
              </button>
              <button
                onClick={() => setDimension("merchandise")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  dimension === "merchandise"
                    ? "bg-white text-charcoal shadow-sm"
                    : "text-gray-500 hover:text-charcoal"
                }`}
              >
                Marchandise
              </button>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white/70">
            {forecastLoading ? (
              <SkeletonChart />
            ) : forecastError ? (
              <ErrorFallback
                message={forecastError}
                onRetry={() => {
                  refetchRuns();
                  refetchDaily();
                }}
              />
            ) : chartData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 sm:h-[340px] md:h-[360px]">
                <p className="text-sm text-gray-400">
                  Aucune prevision disponible
                </p>
              </div>
            ) : (
              <div className="h-[300px] sm:h-[340px] md:h-[360px]">
                <LineChart
                  data={chartData}
                  index="date"
                  categories={[
                    "Capacite prevue actuelle",
                    "Capacite prevue predite",
                    "Capacite optimale predite",
                  ]}
                  colors={["slate", "amber", "emerald"]}
                  valueFormatter={chartValueFormatter}
                  showLegend
                  showGridLines
                  curveType="natural"
                  yAxisWidth={44}
                  tickGap={28}
                  className="h-full w-full"
                />
              </div>
            )}
          </div>
        </DetailCard>
      </AnimatedSection>

      {/* B. SARIMAX decomposition */}
      <AnimatedSection>
        <section aria-label="Decomposition SARIMAX">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Decomposition du signal
          </h2>
          <DecompositionPanel data={decomposition} loading={forecastLoading} />
        </section>
      </AnimatedSection>

      {/* C. Feature importance */}
      <AnimatedSection>
        <section aria-label="Facteurs explicatifs">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Pourquoi cette prevision ?
          </h2>
          <DetailCard>
            <FeatureImportanceBar features={features} loading={alertsLoading} />
          </DetailCard>
        </section>
      </AnimatedSection>

      {/* D. Top 3 alerts */}
      <AnimatedSection>
        <section aria-label="Alertes prioritaires">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Alertes prioritaires
          </h2>
          {alertsError ? (
            <ErrorFallback message={alertsError} />
          ) : alertsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : topAlerts.length === 0 ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-card p-12">
              <p className="text-sm text-gray-400">
                Aucune alerte active — vos sites sont couverts
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {topAlerts.map((alert) => (
                <DetailCard key={alert.id}>
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium text-gray-500">
                      {alert.siteId}
                    </span>
                    <Badge
                      variant={
                        alert.severity === "critical" ||
                        alert.severity === "high"
                          ? "destructive"
                          : alert.severity === "medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {formatSeverity(alert.severity)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-charcoal">
                    {alert.alertDate} — {alert.shift}
                  </p>
                  <div className="mt-2 flex gap-4 text-xs text-gray-500">
                    <span>Risque : {(alert.pRupture * 100).toFixed(0)}%</span>
                    <span>Ecart : {alert.gapH}h</span>
                  </div>
                  {alert.driversJson.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {alert.driversJson.map((d) => (
                        <span
                          key={d}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                  <Link
                    href="/actions"
                    className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
                  >
                    Voir les solutions
                  </Link>
                </DetailCard>
              ))}
            </div>
          )}
        </section>
      </AnimatedSection>
    </div>
  );
}
