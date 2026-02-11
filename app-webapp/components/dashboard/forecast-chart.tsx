"use client";

import { memo, useState } from "react";
import { LineChart } from "@tremor/react";
import { SkeletonChart } from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { buildCapacitySeries } from "@/lib/capacity-chart";
import { useLatestForecasts } from "@/hooks/use-latest-forecasts";

type Dimension = "human" | "merchandise";
const MAX_FORECAST_DAYS = 7;

import { formatDateShort } from "@/lib/date-formatters";

const chartValueFormatter = (v: number) => v.toFixed(0);

export const ForecastChart = memo(function ForecastChart() {
  const [dimension, setDimension] = useState<Dimension>("human");

  const { dailyData, loading, error, refetchRuns, refetchDaily } =
    useLatestForecasts(dimension);

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
  const chartData = buildCapacitySeries(dailyData ?? [], formatDateShort, {
    maxDays: MAX_FORECAST_DAYS,
  });

  const dimensionLabel = dimension === "human" ? "humaine" : "marchandise";

  return (
    <section aria-label="Prevision de couverture">
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-charcoal">
              Prevision de couverture sur 7 jours
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Capacite {dimensionLabel} — tous sites
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Fenetre limitee a 7 jours pour conserver un graphique lisible.
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
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 bg-white/70">
          {chartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 sm:h-[340px] md:h-[360px]">
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
      </div>
    </section>
  );
});

ForecastChart.displayName = "ForecastChart";
