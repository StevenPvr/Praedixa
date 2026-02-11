"use client";

import { useApiGet } from "@/hooks/use-api";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

export interface DailyForecastData {
  forecastDate: string;
  dimension: string;
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

interface UseLatestForecastsResult {
  dailyData: DailyForecastData[] | null;
  loading: boolean;
  error: string | null;
  refetchRuns: () => void;
  refetchDaily: () => void;
}

export function useLatestForecasts(
  dimension: string,
): UseLatestForecastsResult {
  const {
    data: dailyData,
    loading,
    error,
    refetch,
  } = useApiGet<DailyForecastData[]>(
    `/api/v1/live/forecasts/latest/daily?dimension=${encodeURIComponent(dimension)}`,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  return {
    dailyData,
    loading,
    error,
    refetchRuns: refetch,
    refetchDaily: refetch,
  };
}
