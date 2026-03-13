import type {
  DatasetHealthIssue,
  DatasetHealthIssueCode,
  DatasetHealthReadiness,
  DatasetHealthView,
} from "../domain/dataset-health.js";

export type DatasetHealthApiSeverity = DatasetHealthReadiness;

export type DatasetHealthApiGroupBy = "source" | "system" | "dataset";

export type DatasetHealthApiSortField =
  | "severity"
  | "datasetKey"
  | "sourceKey"
  | "systemKey"
  | "freshnessAgeMinutes"
  | "errorRatePct"
  | "processedRows"
  | "lastSuccessAt";

export type DatasetHealthApiSortDirection = "asc" | "desc";

export type DatasetHealthApiActionCode =
  | "repairLineage"
  | "triggerRefresh"
  | "restoreSuccessfulRun"
  | "reduceErrorRate"
  | "reviewProcessedVolume";

export interface DatasetHealthApiFilter {
  search?: string;
  severities?: readonly DatasetHealthApiSeverity[];
  sourceKeys?: readonly string[];
  systemKeys?: readonly string[];
  datasetKeys?: readonly string[];
  issueCodes?: readonly DatasetHealthIssueCode[];
}

export interface DatasetHealthApiSort {
  field: DatasetHealthApiSortField;
  direction: DatasetHealthApiSortDirection;
}

export interface DatasetHealthApiRequest {
  filter?: DatasetHealthApiFilter;
  sort?: DatasetHealthApiSort;
  groupBy?: DatasetHealthApiGroupBy;
}

export interface DatasetHealthApiResolvedRequest {
  filter: {
    search: string | null;
    severities: readonly DatasetHealthApiSeverity[];
    sourceKeys: readonly string[];
    systemKeys: readonly string[];
    datasetKeys: readonly string[];
    issueCodes: readonly DatasetHealthIssueCode[];
  };
  sort: DatasetHealthApiSort;
  groupBy: DatasetHealthApiGroupBy;
}

export interface DatasetHealthApiIdentity {
  datasetKey: string;
  datasetLabel: string | null;
  sourceKey: string;
  systemKey: string | null;
  datasetName: string;
}

export interface DatasetHealthApiLineageDependency {
  datasetKey: string;
  status: "ready" | "missing" | "broken";
}

export interface DatasetHealthApiLineage {
  status: DatasetHealthView["lineage"]["status"];
  upstream: readonly DatasetHealthApiLineageDependency[];
  upstreamCount: number;
  readyUpstreamCount: number;
  missingCount: number;
  brokenCount: number;
}

export interface DatasetHealthApiRecommendedAction {
  code: DatasetHealthApiActionCode;
  severity: DatasetHealthApiSeverity;
  title: string;
  description: string;
  issueCodes: readonly DatasetHealthIssueCode[];
}

export interface DatasetHealthApiDataset {
  identity: DatasetHealthApiIdentity;
  severity: DatasetHealthApiSeverity;
  readiness: DatasetHealthView["readiness"];
  evaluatedAt: DatasetHealthView["evaluatedAt"];
  freshness: DatasetHealthView["freshness"];
  lineage: DatasetHealthApiLineage;
  volume: DatasetHealthView["processedVolume"];
  errorRate: DatasetHealthView["errorRate"];
  lastSuccess: DatasetHealthView["lastSuccessfulRun"];
  issues: readonly DatasetHealthIssue[];
  recommendedActions: readonly DatasetHealthApiRecommendedAction[];
}

export interface DatasetHealthApiSummaryCounts {
  totalDatasets: number;
  ready: number;
  degraded: number;
  stale: number;
  error: number;
}

export interface DatasetHealthApiSummary extends DatasetHealthApiSummaryCounts {
  highestSeverity: DatasetHealthApiSeverity | null;
}

export interface DatasetHealthApiGroup {
  groupBy: DatasetHealthApiGroupBy;
  groupKey: string;
  groupLabel: string;
  severity: DatasetHealthApiSeverity | null;
  summary: DatasetHealthApiSummary;
  datasets: readonly DatasetHealthApiDataset[];
}

export interface DatasetHealthApiResponse {
  request: DatasetHealthApiResolvedRequest;
  summary: DatasetHealthApiSummary;
  datasets: readonly DatasetHealthApiDataset[];
  groups: readonly DatasetHealthApiGroup[];
}
