import type {
  ApiResponse,
  CanonicalQualityDashboard,
  CanonicalRecord,
  CostParameter,
  CoverageAlert,
  DatasetColumn,
  DatasetDataPreviewResponse,
  DatasetDetailResponse,
  DatasetSummary,
  DecisionQueueItem,
  DecisionWorkspace,
  IngestionHistoryResponse,
  ListDatasetsRequest,
  OperationalDecision,
  OverrideStatistics,
  PaginatedResponse,
  ParetoFrontierResponse,
  ProductEvent,
  ProofPack,
  ProofPackSummary,
  UserUxPreferences,
  UserUxPreferencesPatch,
} from "@praedixa/shared-types";
import {
  encodePathSegment,
  getEndpoint,
  getPaginatedEndpoint,
  patchEndpoint,
  postEndpoint,
  qs,
  type GetAccessToken,
} from "./shared";

export function listDatasets(
  params: Partial<ListDatasetsRequest>,
  token: GetAccessToken,
): Promise<PaginatedResponse<DatasetSummary>> {
  return getPaginatedEndpoint<DatasetSummary>(
    `/api/v1/datasets${qs(params)}`,
    token,
  );
}

export function getDataset(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDetailResponse>> {
  return getEndpoint<DatasetDetailResponse>(
    `/api/v1/datasets/${encodePathSegment(datasetId)}`,
    token,
  );
}

export function getDatasetData(
  datasetId: string,
  params: { page?: number; pageSize?: number },
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDataPreviewResponse>> {
  return getEndpoint<DatasetDataPreviewResponse>(
    `/api/v1/datasets/${encodePathSegment(datasetId)}/data${qs(params)}`,
    token,
  );
}

export function getDatasetColumns(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetColumn[]>> {
  return getEndpoint<DatasetColumn[]>(
    `/api/v1/datasets/${encodePathSegment(datasetId)}/columns`,
    token,
  );
}

export function getIngestionLog(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<IngestionHistoryResponse>> {
  return getEndpoint<IngestionHistoryResponse>(
    `/api/v1/datasets/${encodePathSegment(datasetId)}/ingestion-log`,
    token,
  );
}

export function listCanonical(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<CanonicalRecord>> {
  return getPaginatedEndpoint<CanonicalRecord>(
    `/api/v1/live/canonical${qs(params)}`,
    token,
  );
}

export function getCanonicalQuality(
  token: GetAccessToken,
): Promise<ApiResponse<CanonicalQualityDashboard>> {
  return getEndpoint<CanonicalQualityDashboard>(
    "/api/v1/live/canonical/quality",
    token,
  );
}

export function listCoverageAlerts(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert[]>> {
  return getEndpoint<CoverageAlert[]>(
    `/api/v1/live/coverage-alerts${qs(params)}`,
    token,
  );
}

export function listDecisionQueue(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<DecisionQueueItem[]>> {
  return getEndpoint<DecisionQueueItem[]>(
    `/api/v1/live/coverage-alerts/queue${qs(params)}`,
    token,
  );
}

export function acknowledgeCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return patchEndpoint<CoverageAlert>(
    `/api/v1/coverage-alerts/${encodePathSegment(alertId)}/acknowledge`,
    {},
    token,
  );
}

export function resolveCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return patchEndpoint<CoverageAlert>(
    `/api/v1/coverage-alerts/${encodePathSegment(alertId)}/resolve`,
    {},
    token,
  );
}

export function getScenariosForAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return getEndpoint<ParetoFrontierResponse>(
    `/api/v1/live/scenarios/alert/${encodePathSegment(alertId)}`,
    token,
  );
}

export function getDecisionWorkspace(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DecisionWorkspace>> {
  return getEndpoint<DecisionWorkspace>(
    `/api/v1/live/decision-workspace/${encodePathSegment(alertId)}`,
    token,
  );
}

export function generateScenarios(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return postEndpoint<ParetoFrontierResponse>(
    `/api/v1/scenarios/generate/${encodePathSegment(alertId)}`,
    {},
    token,
  );
}

export function listOperationalDecisions(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<OperationalDecision>> {
  return getPaginatedEndpoint<OperationalDecision>(
    `/api/v1/operational-decisions${qs(params)}`,
    token,
  );
}

export function getOverrideStats(
  token: GetAccessToken,
): Promise<ApiResponse<OverrideStatistics>> {
  return getEndpoint<OverrideStatistics>(
    "/api/v1/operational-decisions/override-stats",
    token,
  );
}

export function listCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return getEndpoint<CostParameter[]>("/api/v1/cost-parameters", token);
}

export function getEffectiveCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter>> {
  return getEndpoint<CostParameter>("/api/v1/cost-parameters/effective", token);
}

export function getCostParameterHistory(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return getEndpoint<CostParameter[]>("/api/v1/cost-parameters/history", token);
}

export function listProofPacks(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack[]>> {
  return getEndpoint<ProofPack[]>("/api/v1/proof", token);
}

export function getProofSummary(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPackSummary>> {
  return getEndpoint<ProofPackSummary>("/api/v1/proof/summary", token);
}

export function generateProof(
  body: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack>> {
  return postEndpoint<ProofPack>("/api/v1/proof/generate", body, token);
}

export function getUserUxPreferences(
  token: GetAccessToken,
): Promise<ApiResponse<UserUxPreferences>> {
  return getEndpoint<UserUxPreferences>("/api/v1/users/me/preferences", token);
}

export function patchUserUxPreferences(
  body: UserUxPreferencesPatch,
  token: GetAccessToken,
): Promise<ApiResponse<UserUxPreferences>> {
  return patchEndpoint<UserUxPreferences>(
    "/api/v1/users/me/preferences",
    body,
    token,
  );
}

export function postProductEvents(
  events: ProductEvent[],
  token: GetAccessToken,
): Promise<ApiResponse<{ accepted: number }>> {
  return postEndpoint<{ accepted: number }>(
    "/api/v1/product-events/batch",
    { events },
    token,
  );
}
