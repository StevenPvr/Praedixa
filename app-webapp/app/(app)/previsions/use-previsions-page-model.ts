"use client";

import { useEffect, useMemo, useState } from "react";
import type { CoverageAlert } from "@praedixa/shared-types";

import { useApiGet } from "@/hooks/use-api";
import { useDecisionConfig } from "@/hooks/use-decision-config";
import { useLatestForecasts } from "@/hooks/use-latest-forecasts";
import { useSiteScope } from "@/lib/site-scope";

export function usePrevisionsPageModel() {
  const { selectedSiteId, appendSiteParam } = useSiteScope();
  const {
    config: decisionConfig,
    loading: configLoading,
    error: configError,
    refetch: refetchDecisionConfig,
  } = useDecisionConfig(selectedSiteId);

  const availableHorizons = useMemo(
    () =>
      [...(decisionConfig?.payload?.horizons ?? [])]
        .filter((horizon) => horizon.active)
        .sort((left, right) => left.rank - right.rank),
    [decisionConfig],
  );

  const defaultHorizonId = useMemo(() => {
    if (decisionConfig?.selectedHorizon?.id) {
      return decisionConfig.selectedHorizon.id;
    }
    return (
      availableHorizons.find((horizon) => horizon.isDefault)?.id ??
      availableHorizons[0]?.id ??
      null
    );
  }, [availableHorizons, decisionConfig]);

  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!defaultHorizonId) {
      return;
    }

    setSelectedHorizonId((current) => {
      if (
        current &&
        availableHorizons.some((horizon) => horizon.id === current)
      ) {
        return current;
      }
      return defaultHorizonId;
    });
  }, [availableHorizons, defaultHorizonId]);

  const selectedHorizon = useMemo(
    () =>
      availableHorizons.find((horizon) => horizon.id === selectedHorizonId) ??
      null,
    [availableHorizons, selectedHorizonId],
  );

  const {
    dailyData,
    loading: forecastLoading,
    error: forecastError,
    refetchDaily,
  } = useLatestForecasts("human", selectedSiteId, selectedHorizonId);

  const alertsUrl = useMemo(
    () =>
      appendSiteParam(
        selectedHorizonId
          ? `/api/v1/live/coverage-alerts?status=open&page_size=200&horizon_id=${encodeURIComponent(
              selectedHorizonId,
            )}`
          : "/api/v1/live/coverage-alerts?status=open&page_size=200",
      ),
    [appendSiteParam, selectedHorizonId],
  );

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl);

  const orderedForecast = useMemo(
    () =>
      [...(dailyData ?? [])]
        .sort((a, b) => a.forecastDate.localeCompare(b.forecastDate))
        .slice(0, selectedHorizon?.days ?? (dailyData ?? []).length),
    [dailyData, selectedHorizon?.days],
  );

  const topAlerts = useMemo(() => (alerts ?? []).slice(0, 5), [alerts]);
  const criticalCount = useMemo(
    () => (alerts ?? []).filter((item) => item.severity === "critical").length,
    [alerts],
  );

  function retryAll() {
    refetchDecisionConfig();
    refetchDaily();
    refetchAlerts();
  }

  return {
    selectedHorizonId,
    setSelectedHorizonId,
    selectedHorizon,
    availableHorizons,
    orderedForecast,
    topAlerts,
    criticalCount,
    alerts,
    alertsLoading,
    alertsError,
    forecastLoading,
    forecastError,
    configLoading,
    configError,
    retryAll,
  };
}
