"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useApiGet,
  useApiGetPaginated,
  useApiPatch,
  useApiPost,
} from "@/hooks/use-api";
import {
  decomposeForecast,
  extractFeatureImportance,
  type DailyForecastData,
} from "@/lib/forecast-decomposition";
import {
  formatAlertStatus,
  formatHorizon,
  formatSeverity,
} from "@/lib/formatters";

const SAMPLE_FORECAST: DailyForecastData[] = [
  {
    forecastDate: "2026-02-09",
    predictedDemand: 100,
    predictedCapacity: 95,
    capacityPlannedCurrent: 92,
    capacityPlannedPredicted: 96,
    capacityOptimalPredicted: 98,
    gap: -5,
    riskScore: 0.7,
    confidenceLower: 90,
    confidenceUpper: 110,
  },
  {
    forecastDate: "2026-02-10",
    predictedDemand: 104,
    predictedCapacity: 98,
    capacityPlannedCurrent: 95,
    capacityPlannedPredicted: 99,
    capacityOptimalPredicted: 101,
    gap: -6,
    riskScore: 0.72,
    confidenceLower: 94,
    confidenceUpper: 114,
  },
  {
    forecastDate: "2026-02-11",
    predictedDemand: 96,
    predictedCapacity: 97,
    capacityPlannedCurrent: 94,
    capacityPlannedPredicted: 98,
    capacityOptimalPredicted: 100,
    gap: 1,
    riskScore: 0.4,
    confidenceLower: 86,
    confidenceUpper: 106,
  },
];

export default function CoverageHarnessPage() {
  const ranRef = useRef(false);

  const nullableGet = useApiGet<unknown>(null);
  const failingGet = useApiGet<unknown>("/api/v1/__coverage_missing_get__");
  const failingPaginated = useApiGetPaginated<unknown>(
    "/api/v1/__coverage_missing_paginated__",
    1,
    10,
  );

  const failingPost = useApiPost<Record<string, unknown>, unknown>(
    "/api/v1/__coverage_missing_post__",
  );
  const failingPatch = useApiPatch<Record<string, unknown>, unknown>(
    "/api/v1/__coverage_missing_patch__",
  );

  const decomposition = useMemo(() => decomposeForecast(SAMPLE_FORECAST), []);
  const decompositionEmpty = useMemo(() => decomposeForecast([]), []);
  const drivers = useMemo(
    () =>
      extractFeatureImportance([
        { driversJson: ["pic_activite", "formation"] },
        { driversJson: ["pic_activite"] },
        { driversJson: [] },
      ]),
    [],
  );
  const noDrivers = useMemo(() => extractFeatureImportance([]), []);

  const formatted = useMemo(
    () => ({
      severityKnown: formatSeverity("critical"),
      severityUnknown: formatSeverity("unexpected"),
      horizonKnown: formatHorizon("j7"),
      horizonUnknown: formatHorizon("j99"),
      statusKnown: formatAlertStatus("open"),
      statusUnknown: formatAlertStatus("noop"),
    }),
    [],
  );

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    nullableGet.refetch();
    failingGet.refetch();
    failingPaginated.refetch();

    void failingPost.mutate({ source: "coverage" }).finally(() => {
      failingPost.reset();
    });

    void failingPatch.mutate({ source: "coverage" }).finally(() => {
      failingPatch.reset();
    });
  }, [failingGet, failingPaginated, failingPatch, failingPost, nullableGet]);

  return (
    <main className="space-y-2 p-6" aria-label="Coverage harness webapp">
      <h1 className="text-2xl font-semibold">Coverage Harness Webapp</h1>
      <p>do not use in production</p>

      <div id="decomposition-trend-count">{decomposition.trend.length}</div>
      <div id="decomposition-empty-count">
        {decompositionEmpty.trend.length}
      </div>
      <div id="drivers-count">{drivers.length}</div>
      <div id="drivers-empty-count">{noDrivers.length}</div>

      <div id="format-severity-known">{formatted.severityKnown}</div>
      <div id="format-severity-unknown">{formatted.severityUnknown}</div>
      <div id="format-horizon-known">{formatted.horizonKnown}</div>
      <div id="format-horizon-unknown">{formatted.horizonUnknown}</div>
      <div id="format-status-known">{formatted.statusKnown}</div>
      <div id="format-status-unknown">{formatted.statusUnknown}</div>

      <div id="api-null-loading">{String(nullableGet.loading)}</div>
      <div id="api-failing-error">{failingGet.error ?? "none"}</div>
      <div id="api-paginated-error">{failingPaginated.error ?? "none"}</div>
      <div id="api-post-error">{failingPost.error ?? "none"}</div>
      <div id="api-patch-error">{failingPatch.error ?? "none"}</div>
    </main>
  );
}
