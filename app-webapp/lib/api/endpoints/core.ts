import type {
  ApiResponse,
  ArbitrageResult,
  CostImpactAnalysis,
  DailyForecast,
  DashboardAlert,
  DashboardSummary,
  Decision,
  DecisionSummary,
  Department,
  ExportRequest,
  ExportResponse,
  ForecastRun,
  ForecastSummary,
  HealthCheckResponse,
  ListDecisionsRequest,
  ListForecastsRequest,
  Organization,
  ReviewDecisionRequest,
  RequestForecastRequest,
  Site,
  ValidateArbitrageRequest,
  WhatIfResult,
  WhatIfScenarioRequest,
  RecordDecisionOutcomeRequest,
} from "@praedixa/shared-types";
import {
  encodePathSegment,
  getEndpoint,
  getPaginatedEndpoint,
  getPublicData,
  patchEndpoint,
  postEndpoint,
  qs,
  type GetAccessToken,
} from "./shared";

export function getHealth(): Promise<HealthCheckResponse> {
  return getPublicData<HealthCheckResponse>("/api/v1/health");
}

export function getDashboardSummary(
  token: GetAccessToken,
): Promise<ApiResponse<DashboardSummary>> {
  return getEndpoint<DashboardSummary>("/api/v1/live/dashboard/summary", token);
}

export function getOrganization(
  token: GetAccessToken,
): Promise<ApiResponse<Organization>> {
  return getEndpoint<Organization>("/api/v1/organizations/me", token);
}

export function getDepartments(
  token: GetAccessToken,
): Promise<ApiResponse<Department[]>> {
  return getEndpoint<Department[]>("/api/v1/departments", token);
}

export function getSites(token: GetAccessToken): Promise<ApiResponse<Site[]>> {
  return getEndpoint<Site[]>("/api/v1/sites", token);
}

export function listForecasts(
  params: Partial<ListForecastsRequest>,
  token: GetAccessToken,
) {
  return getPaginatedEndpoint<ForecastRun>(
    `/api/v1/forecasts${qs(params)}`,
    token,
  );
}

export function getForecastSummary(
  forecastId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ForecastSummary>> {
  return getEndpoint<ForecastSummary>(
    `/api/v1/forecasts/${encodePathSegment(forecastId)}/summary`,
    token,
  );
}

export function getDailyForecasts(
  forecastId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DailyForecast[]>> {
  return getEndpoint<DailyForecast[]>(
    `/api/v1/forecasts/${encodePathSegment(forecastId)}/daily`,
    token,
  );
}

export function requestForecast(
  body: RequestForecastRequest,
  token: GetAccessToken,
): Promise<ApiResponse<ForecastRun>> {
  return postEndpoint<ForecastRun>("/api/v1/forecasts", body, token);
}

export function runWhatIfScenario(
  body: WhatIfScenarioRequest,
  token: GetAccessToken,
): Promise<ApiResponse<WhatIfResult>> {
  return postEndpoint<WhatIfResult>("/api/v1/forecasts/what-if", body, token);
}

export function listDecisions(
  params: Partial<ListDecisionsRequest>,
  token: GetAccessToken,
) {
  return getPaginatedEndpoint<DecisionSummary>(
    `/api/v1/decisions${qs(params)}`,
    token,
  );
}

export function getDecision(
  decisionId: string,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return getEndpoint<Decision>(
    `/api/v1/decisions/${encodePathSegment(decisionId)}`,
    token,
  );
}

export function reviewDecision(
  decisionId: string,
  body: ReviewDecisionRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return patchEndpoint<Decision>(
    `/api/v1/decisions/${encodePathSegment(decisionId)}/review`,
    body,
    token,
  );
}

export function recordDecisionOutcome(
  decisionId: string,
  body: RecordDecisionOutcomeRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return postEndpoint<Decision>(
    `/api/v1/decisions/${encodePathSegment(decisionId)}/outcome`,
    body,
    token,
  );
}

export function getArbitrageOptions(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ArbitrageResult>> {
  return getEndpoint<ArbitrageResult>(
    `/api/v1/arbitrage/${encodePathSegment(alertId)}/options`,
    token,
  );
}

export function validateArbitrage(
  alertId: string,
  body: ValidateArbitrageRequest,
  token: GetAccessToken,
): Promise<ApiResponse<Decision>> {
  return postEndpoint<Decision>(
    `/api/v1/arbitrage/${encodePathSegment(alertId)}/validate`,
    body,
    token,
  );
}

export function getAlerts(
  token: GetAccessToken,
): Promise<ApiResponse<DashboardAlert[]>> {
  return getEndpoint<DashboardAlert[]>("/api/v1/alerts", token);
}

export function dismissAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DashboardAlert>> {
  return patchEndpoint<DashboardAlert>(
    `/api/v1/alerts/${encodePathSegment(alertId)}/dismiss`,
    {},
    token,
  );
}

export function getCostAnalysis(
  params: { startDate?: string; endDate?: string; departmentId?: string },
  token: GetAccessToken,
): Promise<ApiResponse<CostImpactAnalysis>> {
  return getEndpoint<CostImpactAnalysis>(
    `/api/v1/analytics/costs${qs(params)}`,
    token,
  );
}

export function requestExport(
  resource: string,
  body: ExportRequest,
  token: GetAccessToken,
): Promise<ApiResponse<ExportResponse>> {
  return postEndpoint<ExportResponse>(
    `/api/v1/exports/${encodePathSegment(resource)}`,
    body,
    token,
  );
}
