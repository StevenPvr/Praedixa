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
  // Request types
  ListForecastsRequest,
  RequestForecastRequest,
  ListDecisionsRequest,
  ReviewDecisionRequest,
  RecordDecisionOutcomeRequest,
  WhatIfScenarioRequest,
  ExportRequest,
  ExportResponse,
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
  return apiGet<Organization>("/api/v1/organization", token);
}

export function getDepartments(
  token: GetAccessToken,
): Promise<ApiResponse<Department[]>> {
  return apiGet<Department[]>("/api/v1/organization/departments", token);
}

export function getSites(token: GetAccessToken): Promise<ApiResponse<Site[]>> {
  return apiGet<Site[]>("/api/v1/organization/sites", token);
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
    `/api/v1/forecasts/${forecastId}/summary`,
    token,
  );
}

export function getDailyForecasts(
  forecastId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DailyForecast[]>> {
  return apiGet<DailyForecast[]>(
    `/api/v1/forecasts/${forecastId}/daily`,
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
  return apiGet<Decision>(`/api/v1/decisions/${decisionId}`, token);
}

export function reviewDecision(
  decisionId: string,
  body: ReviewDecisionRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return apiPatch<Decision>(
    `/api/v1/decisions/${decisionId}/review`,
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
    `/api/v1/decisions/${decisionId}/outcome`,
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
    `/api/v1/alerts/${alertId}/dismiss`,
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
  return apiPost<ExportResponse>(`/api/v1/exports/${resource}`, body, token);
}

export { ApiError };
