"use client";

import { AreaChart } from "@tremor/react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@praedixa/ui";
import { SkeletonTable } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { useState } from "react";
import { isUuid } from "@/lib/uuid";

interface ForecastRunSummary {
  id: string;
  status: string;
}

interface DailyForecastData {
  forecastDate: string;
  dimension: string;
  predictedDemand: number;
  predictedCapacity: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
  departmentId: string | null;
}

interface DimensionDetailProps {
  dimension: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function riskBadge(score: number): string {
  if (score <= 0.3) return "text-success-700 bg-success-50";
  if (score <= 0.6) return "text-warning-700 bg-warning-50";
  return "text-danger-700 bg-danger-50";
}

function riskLabel(score: number): string {
  if (score <= 0.3) return "Faible";
  if (score <= 0.6) return "Moyen";
  return "Eleve";
}

const API_DIMENSION_MAP: Record<string, string | null> = {
  humaine: "human",
  marchandise: "merchandise",
  globale: null,
};

const DIMENSION_DISPLAY: Record<string, string> = {
  human: "Humaine",
  merchandise: "Marchandise",
};

export function DimensionDetail({ dimension }: DimensionDetailProps) {
  const apiDimension =
    dimension in API_DIMENSION_MAP ? API_DIMENSION_MAP[dimension] : dimension;
  const isGlobal = apiDimension === null;
  const [sort, setSort] = useState<DataTableSort>({
    key: "forecastDate",
    direction: "asc",
  });

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

  const dailyUrl = dailyRunId
    ? apiDimension
      ? `/api/v1/forecasts/${encodeURIComponent(dailyRunId)}/daily?dimension=${encodeURIComponent(apiDimension)}`
      : `/api/v1/forecasts/${encodeURIComponent(dailyRunId)}/daily`
    : null;

  const {
    data: dailyData,
    loading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useApiGet<DailyForecastData[]>(dailyUrl);

  const loading = runsLoading || (dailyRunId !== null && dailyLoading);
  const error = runsError ?? dailyError;

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

  // Chart data
  const chartData = (dailyData ?? []).map((d) => ({
    date: formatDate(d.forecastDate),
    Demande: d.predictedDemand,
    Capacite: d.predictedCapacity,
    "Borne basse": d.confidenceLower,
    "Borne haute": d.confidenceUpper,
  }));

  // Table columns — add Dimension column in global view
  const columns: DataTableColumn<DailyForecastData>[] = [
    {
      key: "forecastDate",
      label: "Date",
      sortable: true,
      render: (row: DailyForecastData) => formatDate(row.forecastDate),
    },
    ...(isGlobal
      ? [
          {
            key: "dimension" as const,
            label: "Dimension",
            sortable: true,
            render: (row: DailyForecastData) =>
              DIMENSION_DISPLAY[row.dimension] ?? row.dimension,
          },
        ]
      : []),
    {
      key: "predictedDemand",
      label: "Demande",
      sortable: true,
      align: "right" as const,
      render: (row: DailyForecastData) => row.predictedDemand.toFixed(0),
    },
    {
      key: "predictedCapacity",
      label: "Capacite",
      sortable: true,
      align: "right",
      render: (row: DailyForecastData) => row.predictedCapacity.toFixed(0),
    },
    {
      key: "gap",
      label: "Ecart",
      sortable: true,
      align: "right",
      render: (row: DailyForecastData) => {
        const sign = row.gap >= 0 ? "+" : "";
        return `${sign}${row.gap.toFixed(0)}`;
      },
    },
    {
      key: "riskScore",
      label: "Risque",
      sortable: true,
      align: "center",
      render: (row: DailyForecastData) => (
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${riskBadge(row.riskScore)}`}
        >
          {riskLabel(row.riskScore)} ({(row.riskScore * 100).toFixed(0)})
        </span>
      ),
    },
  ];

  // Sort table data
  const sortedData = [...(dailyData ?? [])].sort((a, b) => {
    /* v8 ignore next 2 -- null-coalescing fallback for nullable sort keys */
    const aVal = a[sort.key as keyof DailyForecastData] ?? "";
    const bVal = b[sort.key as keyof DailyForecastData] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), "fr-FR", {
      numeric: true,
    });
    /* v8 ignore next */
    return sort.direction === "asc" ? cmp : -cmp;
  });

  return (
    <div className="space-y-6">
      {/* Timeline chart */}
      <section aria-label="Timeline de prevision">
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="text-base font-semibold text-charcoal">
            Evolution de la couverture
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Demande vs capacite avec intervalles de confiance
          </p>
          <div
            className="mt-4 aspect-[4/3] w-full sm:aspect-[16/9]"
            style={{ minHeight: "300px", maxHeight: "400px" }}
          >
            {loading ? (
              <div className="h-full animate-pulse rounded-lg bg-gray-50" />
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
                <p className="text-sm text-gray-400">
                  Aucune prevision disponible
                </p>
              </div>
            ) : (
              <AreaChart
                data={chartData}
                index="date"
                categories={[
                  "Demande",
                  "Capacite",
                  "Borne basse",
                  "Borne haute",
                ]}
                colors={["amber", "emerald", "gray", "gray"]}
                valueFormatter={(v: number) => v.toFixed(0)}
                showLegend
                showGridLines={false}
                curveType="monotone"
                className="h-full"
              />
            )}
          </div>
        </div>
      </section>

      {/* Detail table */}
      <section aria-label="Donnees detaillees">
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-base font-semibold text-charcoal">
            Donnees detaillees
          </h2>
          {loading ? (
            <SkeletonTable rows={7} columns={5} />
          ) : (
            <DataTable<DailyForecastData>
              columns={columns}
              data={sortedData}
              sort={sort}
              onSort={setSort}
              getRowKey={(row: DailyForecastData) =>
                `${row.forecastDate}-${row.dimension}`
              }
              emptyMessage="Aucune prevision disponible"
            />
          )}
        </div>
      </section>
    </div>
  );
}
