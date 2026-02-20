import {
  MOCK_ACTIONS,
  MOCK_ALERTS,
  MOCK_DATASETS,
  MOCK_DECISIONS,
  MOCK_FORECAST_POINTS,
  MOCK_GENERATED_AT,
  MOCK_GOVERNANCE,
  MOCK_KPIS,
} from "./mock-data";
import type {
  DemoActionsPayload,
  DemoDashboardPayload,
  DemoDatasetsPayload,
  DemoForecastsPayload,
  DemoMockResponse,
  DemoSettingsPayload,
} from "./types";

const MOCK_LATENCY_MS = 220;

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function withMockLatency<T>(data: T): Promise<DemoMockResponse<T>> {
  await delay(MOCK_LATENCY_MS);
  return {
    data: clone(data),
    generatedAt: MOCK_GENERATED_AT,
  };
}

export function getDashboardPayload() {
  const payload: DemoDashboardPayload = {
    kpis: MOCK_KPIS,
    alerts: MOCK_ALERTS,
    decisions: MOCK_DECISIONS,
  };
  return withMockLatency(payload);
}

export function getForecastsPayload() {
  const payload: DemoForecastsPayload = {
    points: MOCK_FORECAST_POINTS,
    confidenceWindow: "86%-94%",
  };
  return withMockLatency(payload);
}

export function getActionsPayload() {
  const payload: DemoActionsPayload = {
    actions: MOCK_ACTIONS,
  };
  return withMockLatency(payload);
}

export function getDatasetsPayload() {
  const payload: DemoDatasetsPayload = {
    datasets: MOCK_DATASETS,
  };
  return withMockLatency(payload);
}

export function getSettingsPayload() {
  const payload: DemoSettingsPayload = {
    governance: MOCK_GOVERNANCE,
  };
  return withMockLatency(payload);
}
