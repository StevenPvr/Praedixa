import type {
  ApiResponse,
  PaginatedResponse,
  HealthCheckResponse,
  // Domain types
  Organization,
  Department,
  Site,
  ForecastRun,
  ForecastSummary,
  DailyForecast,
  Decision,
  DecisionSummary,
  DashboardAlert,
  CostImpactAnalysis,
  WhatIfResult,
  ArbitrageResult,
  DatasetSummary,
  DatasetColumn,
  // Operational domain types
  CanonicalRecord,
  CanonicalQualityDashboard,
  CoverageAlert,
  ParetoFrontierResponse,
  OperationalDecision,
  OverrideStatistics,
  CostParameter,
  ProofPack,
  ProofPackSummary,
  // Request types
  ListForecastsRequest,
  RequestForecastRequest,
  ListDecisionsRequest,
  ReviewDecisionRequest,
  RecordDecisionOutcomeRequest,
  ValidateArbitrageRequest,
  WhatIfScenarioRequest,
  ExportRequest,
  ExportResponse,
  ListDatasetsRequest,
  // Response types
  DatasetDetailResponse,
  DatasetDataPreviewResponse,
  IngestionHistoryResponse,
} from "@praedixa/shared-types";
import { apiGet, apiGetPaginated, apiPost, apiPatch, ApiError } from "./client";

type GetAccessToken = () => Promise<string | null>;

function qs(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (entries.length === 0) return "";
  return (
    "?" +
    new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()
  );
}

// ─────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────

export function getHealth(): Promise<HealthCheckResponse> {
  const noAuth = () => Promise.resolve(null);
  return apiGet<HealthCheckResponse>("/api/v1/health", noAuth).then(
    (r) => r.data,
  );
}

// ─────────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────────

export function getOrganization(
  token: GetAccessToken,
): Promise<ApiResponse<Organization>> {
  return apiGet<Organization>("/api/v1/organizations/me", token);
}

export function getDepartments(
  token: GetAccessToken,
): Promise<ApiResponse<Department[]>> {
  return apiGet<Department[]>("/api/v1/departments", token);
}

export function getSites(token: GetAccessToken): Promise<ApiResponse<Site[]>> {
  return apiGet<Site[]>("/api/v1/sites", token);
}

// ─────────────────────────────────────────────────
// Forecasts
// ─────────────────────────────────────────────────

export function listForecasts(
  params: Partial<ListForecastsRequest>,
  token: GetAccessToken,
): Promise<PaginatedResponse<ForecastRun>> {
  return apiGetPaginated<ForecastRun>(`/api/v1/forecasts${qs(params)}`, token);
}

export function getForecastSummary(
  forecastId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ForecastSummary>> {
  return apiGet<ForecastSummary>(
    `/api/v1/forecasts/${encodeURIComponent(forecastId)}/summary`,
    token,
  );
}

export function getDailyForecasts(
  forecastId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DailyForecast[]>> {
  return apiGet<DailyForecast[]>(
    `/api/v1/forecasts/${encodeURIComponent(forecastId)}/daily`,
    token,
  );
}

export function requestForecast(
  body: RequestForecastRequest,
  token: GetAccessToken,
): Promise<ApiResponse<ForecastRun>> {
  return apiPost<ForecastRun>("/api/v1/forecasts", body, token);
}

export function runWhatIfScenario(
  body: WhatIfScenarioRequest,
  token: GetAccessToken,
): Promise<ApiResponse<WhatIfResult>> {
  return apiPost<WhatIfResult>("/api/v1/forecasts/what-if", body, token);
}

// ─────────────────────────────────────────────────
// Decisions / Arbitrage
// ─────────────────────────────────────────────────

export function listDecisions(
  params: Partial<ListDecisionsRequest>,
  token: GetAccessToken,
): Promise<PaginatedResponse<DecisionSummary>> {
  return apiGetPaginated<DecisionSummary>(
    `/api/v1/decisions${qs(params)}`,
    token,
  );
}

export function getDecision(
  decisionId: string,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return apiGet<Decision>(
    `/api/v1/decisions/${encodeURIComponent(decisionId)}`,
    token,
  );
}

export function reviewDecision(
  decisionId: string,
  body: ReviewDecisionRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return apiPatch<Decision>(
    `/api/v1/decisions/${encodeURIComponent(decisionId)}/review`,
    body,
    token,
  );
}

export function recordDecisionOutcome(
  decisionId: string,
  body: RecordDecisionOutcomeRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return apiPost<Decision>(
    `/api/v1/decisions/${encodeURIComponent(decisionId)}/outcome`,
    body,
    token,
  );
}

// ─────────────────────────────────────────────────
// Arbitrage
// ─────────────────────────────────────────────────

export function getArbitrageOptions(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ArbitrageResult>> {
  return apiGet<ArbitrageResult>(
    `/api/v1/arbitrage/${encodeURIComponent(alertId)}/options`,
    token,
  );
}

export function validateArbitrage(
  alertId: string,
  body: ValidateArbitrageRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return apiPost<Decision>(
    `/api/v1/arbitrage/${encodeURIComponent(alertId)}/validate`,
    body,
    token,
  );
}

// ─────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────

export function getAlerts(
  token: GetAccessToken,
): Promise<ApiResponse<DashboardAlert[]>> {
  return apiGet<DashboardAlert[]>("/api/v1/alerts", token);
}

export function dismissAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DashboardAlert>> {
  return apiPatch<DashboardAlert>(
    `/api/v1/alerts/${encodeURIComponent(alertId)}/dismiss`,
    {},
    token,
  );
}

// ─────────────────────────────────────────────────
// Cost Analysis
// ─────────────────────────────────────────────────

export function getCostAnalysis(
  params: { startDate?: string; endDate?: string; departmentId?: string },
  token: GetAccessToken,
): Promise<ApiResponse<CostImpactAnalysis>> {
  return apiGet<CostImpactAnalysis>(
    `/api/v1/analytics/costs${qs(params)}`,
    token,
  );
}

// ─────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────

export function requestExport(
  resource: string,
  body: ExportRequest,
  token: GetAccessToken,
): Promise<ApiResponse<ExportResponse>> {
  return apiPost<ExportResponse>(
    `/api/v1/exports/${encodeURIComponent(resource)}`,
    body,
    token,
  );
}

// ─────────────────────────────────────────────────
// Datasets
// ─────────────────────────────────────────────────

export function listDatasets(
  params: Partial<ListDatasetsRequest>,
  token: GetAccessToken,
): Promise<PaginatedResponse<DatasetSummary>> {
  return apiGetPaginated<DatasetSummary>(
    `/api/v1/datasets${qs(params)}`,
    token,
  );
}

export function getDataset(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDetailResponse>> {
  return apiGet<DatasetDetailResponse>(
    `/api/v1/datasets/${encodeURIComponent(datasetId)}`,
    token,
  );
}

export function getDatasetData(
  datasetId: string,
  params: { page?: number; pageSize?: number },
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDataPreviewResponse>> {
  return apiGet<DatasetDataPreviewResponse>(
    `/api/v1/datasets/${encodeURIComponent(datasetId)}/data${qs(params)}`,
    token,
  );
}

export function getDatasetColumns(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetColumn[]>> {
  return apiGet<DatasetColumn[]>(
    `/api/v1/datasets/${encodeURIComponent(datasetId)}/columns`,
    token,
  );
}

export function getIngestionLog(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<IngestionHistoryResponse>> {
  return apiGet<IngestionHistoryResponse>(
    `/api/v1/datasets/${encodeURIComponent(datasetId)}/ingestion-log`,
    token,
  );
}

// ─────────────────────────────────────────────────
// Canonical Data
// ─────────────────────────────────────────────────

export function listCanonical(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<CanonicalRecord>> {
  return apiGetPaginated<CanonicalRecord>(
    `/api/v1/canonical${qs(params)}`,
    token,
  );
}

export function getCanonicalQuality(
  token: GetAccessToken,
): Promise<ApiResponse<CanonicalQualityDashboard>> {
  return apiGet<CanonicalQualityDashboard>("/api/v1/canonical/quality", token);
}

// ─────────────────────────────────────────────────
// Coverage Alerts
// ─────────────────────────────────────────────────

export function listCoverageAlerts(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert[]>> {
  return apiGet<CoverageAlert[]>(`/api/v1/coverage-alerts${qs(params)}`, token);
}

export function acknowledgeCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return apiPatch<CoverageAlert>(
    `/api/v1/coverage-alerts/${encodeURIComponent(alertId)}/acknowledge`,
    {},
    token,
  );
}

export function resolveCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return apiPatch<CoverageAlert>(
    `/api/v1/coverage-alerts/${encodeURIComponent(alertId)}/resolve`,
    {},
    token,
  );
}

// ─────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────

export function getScenariosForAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return apiGet<ParetoFrontierResponse>(
    `/api/v1/scenarios/alert/${encodeURIComponent(alertId)}`,
    token,
  );
}

export function generateScenarios(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return apiPost<ParetoFrontierResponse>(
    `/api/v1/scenarios/generate/${encodeURIComponent(alertId)}`,
    {},
    token,
  );
}

// ─────────────────────────────────────────────────
// Operational Decisions
// ─────────────────────────────────────────────────

export function listOperationalDecisions(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<OperationalDecision>> {
  return apiGetPaginated<OperationalDecision>(
    `/api/v1/operational-decisions${qs(params)}`,
    token,
  );
}

export function getOverrideStats(
  token: GetAccessToken,
): Promise<ApiResponse<OverrideStatistics>> {
  return apiGet<OverrideStatistics>(
    "/api/v1/operational-decisions/override-stats",
    token,
  );
}

// ─────────────────────────────────────────────────
// Cost Parameters
// ─────────────────────────────────────────────────

export function listCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return apiGet<CostParameter[]>("/api/v1/cost-parameters", token);
}

export function getEffectiveCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter>> {
  return apiGet<CostParameter>("/api/v1/cost-parameters/effective", token);
}

export function getCostParameterHistory(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return apiGet<CostParameter[]>("/api/v1/cost-parameters/history", token);
}

// ─────────────────────────────────────────────────
// Proof
// ─────────────────────────────────────────────────

export function listProofPacks(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack[]>> {
  return apiGet<ProofPack[]>("/api/v1/proof", token);
}

export function getProofSummary(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPackSummary>> {
  return apiGet<ProofPackSummary>("/api/v1/proof/summary", token);
}

export function generateProof(
  body: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack>> {
  return apiPost<ProofPack>("/api/v1/proof/generate", body, token);
}

// ─────────────────────────────────────────────────
// Mock Forecast
// ─────────────────────────────────────────────────

export function triggerMockForecast(
  token: GetAccessToken,
): Promise<ApiResponse<unknown>> {
  return apiPost<unknown>("/api/v1/mock-forecast", {}, token);
}

// ─────────────────────────────────────────────────
// API Endpoint URL constants
// ─────────────────────────────────────────────────

export const API_ENDPOINTS = {
  canonical: {
    list: "/api/v1/canonical",
    quality: "/api/v1/canonical/quality",
    bulk: "/api/v1/canonical/bulk",
  },
  costParameters: {
    list: "/api/v1/cost-parameters",
    effective: "/api/v1/cost-parameters/effective",
    history: "/api/v1/cost-parameters/history",
  },
  coverageAlerts: {
    list: "/api/v1/coverage-alerts",
    acknowledge: (id: string) => `/api/v1/coverage-alerts/${id}/acknowledge`,
    resolve: (id: string) => `/api/v1/coverage-alerts/${id}/resolve`,
  },
  scenarios: {
    forAlert: (id: string) => `/api/v1/scenarios/alert/${id}`,
    generate: (id: string) => `/api/v1/scenarios/generate/${id}`,
  },
  operationalDecisions: {
    list: "/api/v1/operational-decisions",
    overrideStats: "/api/v1/operational-decisions/override-stats",
  },
  proof: {
    list: "/api/v1/proof",
    summary: "/api/v1/proof/summary",
    generate: "/api/v1/proof/generate",
    pdf: "/api/v1/proof/pdf",
  },
  mockForecast: {
    trigger: "/api/v1/mock-forecast",
  },
} as const;

export { ApiError };
