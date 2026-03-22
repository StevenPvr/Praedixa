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

function getData<T>(
  path: string,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return getEndpoint<T>(path, token);
}

function getDataList<T>(
  path: string,
  token: GetAccessToken,
): Promise<PaginatedResponse<T>> {
  return getPaginatedEndpoint<T>(path, token);
}

function postData<T>(
  path: string,
  body: unknown,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return postEndpoint<T>(path, body, token);
}

function patchData<T>(
  path: string,
  body: unknown,
  token: GetAccessToken,
): Promise<ApiResponse<T>> {
  return patchEndpoint<T>(path, body, token);
}

function datasetsPath(): string {
  return "/api/v1/datasets";
}

function datasetPath(datasetId: string): string {
  return `${datasetsPath()}/${encodePathSegment(datasetId)}`;
}

function livePath(path: string): string {
  return `/api/v1/live/${path}`;
}

function coverageAlertActionPath(
  alertId: string,
  action: "acknowledge" | "resolve",
) {
  return `/api/v1/coverage-alerts/${encodePathSegment(alertId)}/${action}`;
}

export function listDatasets(
  params: Partial<ListDatasetsRequest>,
  token: GetAccessToken,
): Promise<PaginatedResponse<DatasetSummary>> {
  return getDataList<DatasetSummary>(`${datasetsPath()}${qs(params)}`, token);
}

export function getDataset(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDetailResponse>> {
  return getData<DatasetDetailResponse>(datasetPath(datasetId), token);
}

export function getDatasetData(
  datasetId: string,
  params: { page?: number; pageSize?: number },
  token: GetAccessToken,
): Promise<ApiResponse<DatasetDataPreviewResponse>> {
  return getData<DatasetDataPreviewResponse>(
    `${datasetPath(datasetId)}/data${qs(params)}`,
    token,
  );
}

export function getDatasetColumns(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DatasetColumn[]>> {
  return getData<DatasetColumn[]>(`${datasetPath(datasetId)}/columns`, token);
}

export function getIngestionLog(
  datasetId: string,
  token: GetAccessToken,
): Promise<ApiResponse<IngestionHistoryResponse>> {
  return getData<IngestionHistoryResponse>(
    `${datasetPath(datasetId)}/ingestion-log`,
    token,
  );
}

export function listCanonical(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<CanonicalRecord>> {
  return getDataList<CanonicalRecord>(
    `${livePath("canonical")}${qs(params)}`,
    token,
  );
}

export function getCanonicalQuality(
  token: GetAccessToken,
): Promise<ApiResponse<CanonicalQualityDashboard>> {
  return getData<CanonicalQualityDashboard>(
    livePath("canonical/quality"),
    token,
  );
}

export function listCoverageAlerts(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert[]>> {
  return getData<CoverageAlert[]>(
    `${livePath("coverage-alerts")}${qs(params)}`,
    token,
  );
}

export function listDecisionQueue(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<DecisionQueueItem[]>> {
  return getData<DecisionQueueItem[]>(
    `${livePath("coverage-alerts/queue")}${qs(params)}`,
    token,
  );
}

export function acknowledgeCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return patchData<CoverageAlert>(
    coverageAlertActionPath(alertId, "acknowledge"),
    {},
    token,
  );
}

export function resolveCoverageAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<CoverageAlert>> {
  return patchData<CoverageAlert>(
    coverageAlertActionPath(alertId, "resolve"),
    {},
    token,
  );
}

export function getScenariosForAlert(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return getData<ParetoFrontierResponse>(
    livePath(`scenarios/alert/${encodePathSegment(alertId)}`),
    token,
  );
}

export function getDecisionWorkspace(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<DecisionWorkspace>> {
  return getData<DecisionWorkspace>(
    livePath(`decision-workspace/${encodePathSegment(alertId)}`),
    token,
  );
}

export function generateScenarios(
  alertId: string,
  token: GetAccessToken,
): Promise<ApiResponse<ParetoFrontierResponse>> {
  return postData<ParetoFrontierResponse>(
    `/api/v1/scenarios/generate/${encodePathSegment(alertId)}`,
    {},
    token,
  );
}

export function listOperationalDecisions(
  params: Record<string, unknown>,
  token: GetAccessToken,
): Promise<PaginatedResponse<OperationalDecision>> {
  return getDataList<OperationalDecision>(
    `/api/v1/operational-decisions${qs(params)}`,
    token,
  );
}

export function getOverrideStats(
  token: GetAccessToken,
): Promise<ApiResponse<OverrideStatistics>> {
  return getData<OverrideStatistics>(
    "/api/v1/operational-decisions/override-stats",
    token,
  );
}

export function listCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return getData<CostParameter[]>("/api/v1/cost-parameters", token);
}

export function getEffectiveCostParameters(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter>> {
  return getData<CostParameter>("/api/v1/cost-parameters/effective", token);
}

export function getCostParameterHistory(
  token: GetAccessToken,
): Promise<ApiResponse<CostParameter[]>> {
  return getData<CostParameter[]>("/api/v1/cost-parameters/history", token);
}

export function listProofPacks(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack[]>> {
  return getData<ProofPack[]>("/api/v1/proof", token);
}

export function getProofSummary(
  token: GetAccessToken,
): Promise<ApiResponse<ProofPackSummary>> {
  return getData<ProofPackSummary>("/api/v1/proof/summary", token);
}

export function generateProof(
  body: Record<string, unknown>,
  token: GetAccessToken,
): Promise<ApiResponse<ProofPack>> {
  return postData<ProofPack>("/api/v1/proof/generate", body, token);
}

export function getUserUxPreferences(
  token: GetAccessToken,
): Promise<ApiResponse<UserUxPreferences>> {
  return getData<UserUxPreferences>("/api/v1/users/me/preferences", token);
}

export function patchUserUxPreferences(
  body: UserUxPreferencesPatch,
  token: GetAccessToken,
): Promise<ApiResponse<UserUxPreferences>> {
  return patchData<UserUxPreferences>(
    "/api/v1/users/me/preferences",
    body,
    token,
  );
}

export function postProductEvents(
  events: ProductEvent[],
  token: GetAccessToken,
): Promise<ApiResponse<{ accepted: number }>> {
  return postData<{ accepted: number }>(
    "/api/v1/product-events/batch",
    { events },
    token,
  );
}
