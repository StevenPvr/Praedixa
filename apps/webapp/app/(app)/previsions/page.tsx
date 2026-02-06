"use client";

import { useState } from "react";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { FilterBar } from "@/components/previsions/filter-bar";
import { RiskCards } from "@/components/previsions/risk-cards";
import { RiskDistributionChart } from "@/components/previsions/risk-distribution-chart";
import { isUuid } from "@/lib/uuid";

type Dimension = "human" | "merchandise";

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

export default function PrevisionsPage() {
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

  // Fetch daily forecasts for the selected dimension
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Previsions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Previsions de capacite humaine et marchandise
        </p>
      </div>

      <FilterBar dimension={dimension} onDimensionChange={setDimension} />

      {error ? (
        <ErrorFallback
          message={error}
          onRetry={() => {
            refetchRuns();
            refetchDaily();
          }}
        />
      ) : (
        <>
          <section aria-label="Risques par departement">
            <h2 className="mb-4 text-lg font-semibold text-charcoal">
              Risques par departement
            </h2>
            <RiskCards
              dailyData={dailyData}
              loading={loading}
              dimension={dimension}
            />
          </section>

          <RiskDistributionChart dailyData={dailyData} loading={loading} />
        </>
      )}
    </div>
  );
}
