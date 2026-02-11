"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { LineChart } from "@tremor/react";
import { SkeletonChart } from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { buildCapacitySeries } from "@/lib/capacity-chart";
import { ChartErrorBoundary } from "@/components/chart-error-boundary";
import { useLatestForecasts } from "@/hooks/use-latest-forecasts";

type Dimension = "human" | "merchandise";
const MAX_FORECAST_DAYS = 7;

import { formatDateShort } from "@/lib/date-formatters";

const chartValueFormatter = (v: number) => v.toFixed(0);

export const ForecastTimelineChart = memo(function ForecastTimelineChart() {
  const [dimension, setDimension] = useState<Dimension>("human");
  const [selectedForecastDate, setSelectedForecastDate] = useState<
    string | null
  >(null);

  const { dailyData, loading, error, refetchRuns, refetchDaily } =
    useLatestForecasts(dimension);

  const chartData = useMemo(
    () =>
      buildCapacitySeries(dailyData ?? [], formatDateShort, {
        maxDays: MAX_FORECAST_DAYS,
      }),
    [dailyData],
  );
  const detailRows = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    return [...dailyData]
      .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
      .slice(-MAX_FORECAST_DAYS);
  }, [dailyData]);
  const selectedDetail = useMemo(() => {
    if (detailRows.length === 0) return null;
    return (
      detailRows.find((row) => row.forecastDate === selectedForecastDate) ??
      detailRows[detailRows.length - 1]
    );
  }, [detailRows, selectedForecastDate]);

  useEffect(() => {
    if (detailRows.length === 0) {
      setSelectedForecastDate(null);
      return;
    }
    if (
      selectedForecastDate &&
      detailRows.some((row) => row.forecastDate === selectedForecastDate)
    ) {
      return;
    }
    setSelectedForecastDate(detailRows[detailRows.length - 1].forecastDate);
  }, [detailRows, selectedForecastDate]);

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

  const dimensionLabel = dimension === "human" ? "humaine" : "marchandise";

  return (
    <div data-testid="forecast-timeline-chart">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">
          Capacite {dimensionLabel} — vue lisible sur 7 jours
        </p>
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
            <p className="text-sm text-gray-400">Aucune prevision disponible</p>
          </div>
        ) : (
          <div className="h-[300px] sm:h-[340px] md:h-[360px]">
            <ChartErrorBoundary>
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
            </ChartErrorBoundary>
          </div>
        )}
      </div>
      {detailRows.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            Cliquez sur un jour pour afficher le detail de la prediction.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {detailRows.map((row) => {
              const active = selectedDetail?.forecastDate === row.forecastDate;
              return (
                <button
                  key={row.forecastDate}
                  onClick={() => setSelectedForecastDate(row.forecastDate)}
                  aria-label={`Voir le detail du ${formatDateShort(row.forecastDate)}`}
                  aria-pressed={active}
                  title={`Voir le detail du ${formatDateShort(row.forecastDate)}`}
                  className={`min-h-[36px] rounded-full px-3 py-1 text-xs ${
                    active
                      ? "bg-amber-500 text-white"
                      : "bg-white text-gray-600 hover:bg-amber-50"
                  }`}
                >
                  {formatDateShort(row.forecastDate)}
                </button>
              );
            })}
          </div>
          {selectedDetail && (
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-gray-700 sm:grid-cols-4">
              <div>
                <p className="text-gray-500">Demande</p>
                <p className="font-semibold">
                  {selectedDetail.predictedDemand.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Capacite prevue</p>
                <p className="font-semibold">
                  {selectedDetail.capacityPlannedPredicted.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Capacite optimale</p>
                <p className="font-semibold">
                  {selectedDetail.capacityOptimalPredicted.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Risque</p>
                <p className="font-semibold">
                  {`${(selectedDetail.riskScore <= 1
                    ? selectedDetail.riskScore * 100
                    : selectedDetail.riskScore
                  ).toFixed(0)}%`}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ForecastTimelineChart.displayName = "ForecastTimelineChart";
