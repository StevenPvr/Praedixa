"use client";

import { useState } from "react";
import { AreaChart } from "@tremor/react";
import { SkeletonChart } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { isUuid } from "@/lib/uuid";

interface DailyForecastData {
  forecastDate: string;
  dimension: string;
  predictedDemand: number;
  predictedCapacity: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

interface ForecastRunSummary {
  id: string;
  status: string;
  accuracyScore: number | null;
}

type Dimension = "human" | "merchandise";

const chartValueFormatter = (v: number) => v.toFixed(0);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function ForecastChart() {
  const [dimension, setDimension] = useState<Dimension>("human");

  // Fetch latest completed forecast run
  const {
    data: runs,
    loading: runsLoading,
    error: runsError,
    refetch: refetchRuns,
  } = useApiGet<ForecastRunSummary[]>(
    "/api/v1/forecasts?page=1&pageSize=1&status=completed",
  );

  const latestRunId = runs && runs.length > 0 ? runs[0].id : null;
  const dailyRunId = isUuid(latestRunId) ? latestRunId : null;

  // Fetch daily forecasts for the latest run
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

  const loading = runsLoading || (dailyRunId !== null && dailyLoading);
  const error = runsError ?? dailyError;

  if (loading) {
    return <SkeletonChart />;
  }

  if (error) {
    return (
      <ErrorFallback
        message={error}
        onRetry={() => {
          refetchRuns();
          refetchDaily();
        }}
      />
    );
  }

  // Build chart data
  const chartData = (dailyData ?? []).map((d) => ({
    date: formatDate(d.forecastDate),
    Demande: d.predictedDemand,
    Capacite: d.predictedCapacity,
    "Borne basse": d.confidenceLower,
    "Borne haute": d.confidenceUpper,
  }));

  const dimensionLabel = dimension === "human" ? "humaine" : "marchandise";

  return (
    <section aria-label="Prevision de couverture">
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-charcoal">
              Prevision de couverture a 14 jours
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Capacite {dimensionLabel} — tous sites
            </p>
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setDimension("human")}
              className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                dimension === "human"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-gray-500 hover:text-charcoal"
              }`}
            >
              Humaine
            </button>
            <button
              onClick={() => setDimension("merchandise")}
              className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                dimension === "merchandise"
                  ? "bg-white text-charcoal shadow-sm"
                  : "text-gray-500 hover:text-charcoal"
              }`}
            >
              Marchandise
            </button>
          </div>
        </div>
        <div
          className="mt-4 aspect-[4/3] w-full sm:aspect-[16/9]"
          style={{ minHeight: "300px", maxHeight: "400px" }}
        >
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
              <p className="text-sm text-gray-400">
                Aucune prevision disponible
              </p>
            </div>
          ) : (
            <AreaChart
              data={chartData}
              index="date"
              categories={["Demande", "Capacite", "Borne basse", "Borne haute"]}
              colors={["amber", "emerald", "gray", "gray"]}
              valueFormatter={chartValueFormatter}
              showLegend
              showGridLines={false}
              curveType="monotone"
              className="h-full"
            />
          )}
        </div>
      </div>
    </section>
  );
}
