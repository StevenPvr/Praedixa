import type {
  DatasetHealthInput,
  DatasetHealthIssueCode,
  DatasetHealthView,
} from "@praedixa/shared-types/domain";
import type {
  DatasetHealthApiDataset,
  DatasetHealthApiGroup,
  DatasetHealthApiGroupBy,
  DatasetHealthApiIdentity,
  DatasetHealthApiRecommendedAction,
  DatasetHealthApiRequest,
  DatasetHealthApiResolvedRequest,
  DatasetHealthApiResponse,
  DatasetHealthApiSeverity,
  DatasetHealthApiSort,
  DatasetHealthApiSortDirection,
  DatasetHealthApiSummary,
  DatasetHealthApiSummaryCounts,
} from "@praedixa/shared-types/api";

import { aggregateDatasetHealthList } from "./data-health.js";

export type {
  DatasetHealthApiDataset,
  DatasetHealthApiGroup,
  DatasetHealthApiGroupBy,
  DatasetHealthApiIdentity,
  DatasetHealthApiRecommendedAction,
  DatasetHealthApiRequest,
  DatasetHealthApiResolvedRequest,
  DatasetHealthApiResponse,
  DatasetHealthApiSeverity,
  DatasetHealthApiSort,
  DatasetHealthApiSortDirection,
  DatasetHealthApiSummary,
  DatasetHealthApiSummaryCounts,
};

const DEFAULT_REQUEST: DatasetHealthApiResolvedRequest = {
  filter: {
    search: null,
    severities: [],
    sourceKeys: [],
    systemKeys: [],
    datasetKeys: [],
    issueCodes: [],
  },
  sort: {
    field: "severity",
    direction: "desc",
  },
  groupBy: "source",
};

const SEVERITY_RANK: Record<DatasetHealthApiSeverity, number> = {
  ready: 0,
  degraded: 1,
  stale: 2,
  error: 3,
};

function getSeverityRank(severity: DatasetHealthApiSeverity): number {
  return SEVERITY_RANK[severity];
}

const RECOMMENDED_ACTIONS: Record<
  DatasetHealthIssueCode,
  Omit<DatasetHealthApiRecommendedAction, "severity" | "issueCodes">
> = {
  lineage_broken_dependencies: {
    code: "repairLineage",
    title: "Repair broken lineage",
    description:
      "Restore or replace broken upstream dependencies before using this dataset.",
  },
  lineage_missing_dependencies: {
    code: "repairLineage",
    title: "Complete missing lineage",
    description:
      "Backfill or reconnect the missing upstream datasets referenced by lineage.",
  },
  last_success_missing: {
    code: "restoreSuccessfulRun",
    title: "Restore a successful run",
    description: "Recover a successful refresh before trusting this dataset.",
  },
  last_success_stale: {
    code: "triggerRefresh",
    title: "Trigger a fresh run",
    description:
      "Run or backfill the dataset again to refresh the last successful timestamp.",
  },
  freshness_stale: {
    code: "triggerRefresh",
    title: "Refresh stale data",
    description:
      "Refresh the dataset because the freshness window has expired.",
  },
  error_rate_high: {
    code: "reduceErrorRate",
    title: "Reduce error rate",
    description:
      "Investigate failing runs and stabilise the pipeline before the next execution.",
  },
  error_rate_elevated: {
    code: "reduceErrorRate",
    title: "Watch elevated errors",
    description:
      "Investigate recent failures before the error rate becomes critical.",
  },
  processed_volume_low: {
    code: "reviewProcessedVolume",
    title: "Review processed volume",
    description:
      "Check source completeness or adjust the minimum expected processed volume.",
  },
};

interface DatasetHealthKeyParts {
  sourceKey: string;
  systemKey: string | null;
  datasetName: string;
}

function normalizeList<T extends string>(
  values: readonly T[] | undefined,
): T[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ] as T[];
}

function normalizeIssueCodeList(
  values: readonly DatasetHealthIssueCode[] | undefined,
): DatasetHealthIssueCode[] {
  return [...new Set(values ?? [])];
}

function compareText(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  return (left ?? "").localeCompare(right ?? "");
}

function compareNullableNumber(
  left: number | null | undefined,
  right: number | null | undefined,
): number {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;
  return leftValue - rightValue;
}

function compareNullableTimestamp(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftValue = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightValue = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return leftValue - rightValue;
}

function sortWithDirection(
  left: number,
  direction: DatasetHealthApiSortDirection,
): number {
  return direction === "asc" ? left : -left;
}

function parseDatasetKey(datasetKey: string): DatasetHealthKeyParts {
  const parts = datasetKey
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("datasetKey must contain at least one non-empty segment");
  }

  if (parts.length === 1) {
    return {
      sourceKey: parts[0]!,
      systemKey: null,
      datasetName: parts[0]!,
    };
  }

  if (parts.length === 2) {
    return {
      sourceKey: parts[0]!,
      systemKey: null,
      datasetName: parts[1]!,
    };
  }

  return {
    sourceKey: parts[0]!,
    systemKey: parts[1]!,
    datasetName: parts.slice(2).join("."),
  };
}

function buildIdentity(view: DatasetHealthView): DatasetHealthApiIdentity {
  const parts = parseDatasetKey(view.datasetKey);
  return {
    datasetKey: view.datasetKey,
    datasetLabel: view.datasetLabel,
    sourceKey: parts.sourceKey,
    systemKey: parts.systemKey,
    datasetName: parts.datasetName,
  };
}

function buildRecommendedActions(
  view: DatasetHealthView,
): readonly DatasetHealthApiRecommendedAction[] {
  const grouped = new Map<
    DatasetHealthApiRecommendedAction["code"],
    DatasetHealthApiRecommendedAction
  >();

  for (const issue of view.issues) {
    const template = RECOMMENDED_ACTIONS[issue.code];
    if (template == null) {
      throw new Error(`Unsupported dataset health issue code ${issue.code}`);
    }
    const current = grouped.get(template.code);
    if (!current) {
      grouped.set(template.code, {
        ...template,
        severity: issue.severity,
        issueCodes: [issue.code],
      });
      continue;
    }

    grouped.set(template.code, {
      ...current,
      severity:
        getSeverityRank(issue.severity) > getSeverityRank(current.severity)
          ? issue.severity
          : current.severity,
      issueCodes: [...current.issueCodes, issue.code].sort(),
    });
  }

  return [...grouped.values()].sort((left, right) => {
    const severityDiff =
      getSeverityRank(right.severity) - getSeverityRank(left.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return left.code.localeCompare(right.code);
  });
}

function buildLineage(
  view: DatasetHealthView,
): DatasetHealthApiDataset["lineage"] {
  const upstream = new Map<string, "ready" | "missing" | "broken">();

  for (const datasetKey of view.lineage.upstreamDatasets) {
    upstream.set(datasetKey, "ready");
  }
  for (const datasetKey of view.lineage.missingUpstreamDatasets) {
    upstream.set(datasetKey, "missing");
  }
  for (const datasetKey of view.lineage.brokenUpstreamDatasets) {
    upstream.set(datasetKey, "broken");
  }

  return {
    status: view.lineage.status,
    upstream: [...upstream.entries()]
      .map(([datasetKey, status]) => ({ datasetKey, status }))
      .sort((left, right) => left.datasetKey.localeCompare(right.datasetKey)),
    upstreamCount: view.lineage.upstreamCount,
    readyUpstreamCount: view.lineage.readyUpstreamCount,
    missingCount: view.lineage.missingCount,
    brokenCount: view.lineage.brokenCount,
  };
}

function normalizeRequest(
  request: DatasetHealthApiRequest | undefined,
): DatasetHealthApiResolvedRequest {
  return {
    filter: {
      search: request?.filter?.search?.trim() || null,
      severities: normalizeList(request?.filter?.severities),
      sourceKeys: normalizeList(request?.filter?.sourceKeys),
      systemKeys: normalizeList(request?.filter?.systemKeys),
      datasetKeys: normalizeList(request?.filter?.datasetKeys),
      issueCodes: normalizeIssueCodeList(request?.filter?.issueCodes),
    },
    sort: request?.sort ?? DEFAULT_REQUEST.sort,
    groupBy: request?.groupBy ?? DEFAULT_REQUEST.groupBy,
  };
}

function matchesFilter(
  dataset: DatasetHealthApiDataset,
  filter: DatasetHealthApiResolvedRequest["filter"],
): boolean {
  if (
    filter.severities.length > 0 &&
    !filter.severities.includes(dataset.severity)
  ) {
    return false;
  }
  if (
    filter.sourceKeys.length > 0 &&
    !filter.sourceKeys.includes(dataset.identity.sourceKey)
  ) {
    return false;
  }
  if (
    filter.systemKeys.length > 0 &&
    !filter.systemKeys.includes(dataset.identity.systemKey ?? "unassigned")
  ) {
    return false;
  }
  if (
    filter.datasetKeys.length > 0 &&
    !filter.datasetKeys.includes(dataset.identity.datasetKey)
  ) {
    return false;
  }
  if (
    filter.issueCodes.length > 0 &&
    !filter.issueCodes.some((code) =>
      dataset.issues.some((issue) => issue.code === code),
    )
  ) {
    return false;
  }

  if (!filter.search) {
    return true;
  }

  const haystack = [
    dataset.identity.datasetKey,
    dataset.identity.datasetLabel ?? "",
    dataset.identity.sourceKey,
    dataset.identity.systemKey ?? "",
    dataset.identity.datasetName,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(filter.search.toLowerCase());
}

function compareDatasets(
  left: DatasetHealthApiDataset,
  right: DatasetHealthApiDataset,
  sort: DatasetHealthApiSort,
): number {
  let diff = 0;
  switch (sort.field) {
    case "severity":
      diff = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
      break;
    case "datasetKey":
      diff = compareText(left.identity.datasetKey, right.identity.datasetKey);
      break;
    case "sourceKey":
      diff = compareText(left.identity.sourceKey, right.identity.sourceKey);
      break;
    case "systemKey":
      diff = compareText(left.identity.systemKey, right.identity.systemKey);
      break;
    case "freshnessAgeMinutes":
      diff = compareNullableNumber(
        left.freshness.ageMinutes,
        right.freshness.ageMinutes,
      );
      break;
    case "errorRatePct":
      diff = left.errorRate.errorRatePct - right.errorRate.errorRatePct;
      break;
    case "processedRows":
      diff = left.volume.processedRows - right.volume.processedRows;
      break;
    case "lastSuccessAt":
      diff = compareNullableTimestamp(
        left.lastSuccess.completedAt,
        right.lastSuccess.completedAt,
      );
      break;
  }

  if (diff !== 0) {
    return sortWithDirection(diff, sort.direction);
  }

  return left.identity.datasetKey.localeCompare(right.identity.datasetKey);
}

function summarizeCounts(
  datasets: readonly DatasetHealthApiDataset[],
): DatasetHealthApiSummaryCounts {
  const counts: DatasetHealthApiSummaryCounts = {
    totalDatasets: datasets.length,
    ready: 0,
    degraded: 0,
    stale: 0,
    error: 0,
  };

  for (const dataset of datasets) {
    counts[dataset.severity] += 1;
  }

  return counts;
}

export function calculateDatasetHealthSeverity(
  view: DatasetHealthView,
): DatasetHealthApiSeverity {
  return view.readiness;
}

export function summarizeDatasetHealthApi(
  datasets: readonly DatasetHealthApiDataset[],
): DatasetHealthApiSummary {
  const counts = summarizeCounts(datasets);
  const highestSeverity =
    counts.error > 0
      ? "error"
      : counts.stale > 0
        ? "stale"
        : counts.degraded > 0
          ? "degraded"
          : counts.ready > 0
            ? "ready"
            : null;

  return {
    ...counts,
    highestSeverity,
  };
}

export function buildDatasetHealthApiDataset(
  view: DatasetHealthView,
): DatasetHealthApiDataset {
  return {
    identity: buildIdentity(view),
    severity: calculateDatasetHealthSeverity(view),
    readiness: view.readiness,
    evaluatedAt: view.evaluatedAt,
    freshness: view.freshness,
    lineage: buildLineage(view),
    volume: view.processedVolume,
    errorRate: view.errorRate,
    lastSuccess: view.lastSuccessfulRun,
    issues: view.issues,
    recommendedActions: buildRecommendedActions(view),
  };
}

export function groupDatasetHealthApiDatasets(
  datasets: readonly DatasetHealthApiDataset[],
  groupBy: DatasetHealthApiGroupBy,
): DatasetHealthApiGroup[] {
  const grouped = new Map<string, DatasetHealthApiDataset[]>();

  for (const dataset of datasets) {
    const groupKey =
      groupBy === "source"
        ? dataset.identity.sourceKey
        : groupBy === "system"
          ? (dataset.identity.systemKey ?? "unassigned")
          : dataset.identity.datasetName;

    const existing = grouped.get(groupKey) ?? [];
    grouped.set(groupKey, [...existing, dataset]);
  }

  return [...grouped.entries()]
    .map(([groupKey, groupDatasets]) => {
      const summary = summarizeDatasetHealthApi(groupDatasets);
      return {
        groupBy,
        groupKey,
        groupLabel: groupKey,
        severity: summary.highestSeverity,
        summary,
        datasets: [...groupDatasets],
      };
    })
    .sort((left, right) => {
      const leftRank =
        left.severity == null ? -1 : getSeverityRank(left.severity);
      const rightRank =
        right.severity == null ? -1 : getSeverityRank(right.severity);
      const severityDiff = rightRank - leftRank;
      if (severityDiff !== 0) {
        return severityDiff;
      }
      return left.groupKey.localeCompare(right.groupKey);
    });
}

export function buildDatasetHealthApiResponse(
  views: readonly DatasetHealthView[],
  request?: DatasetHealthApiRequest,
): DatasetHealthApiResponse {
  const resolvedRequest = normalizeRequest(request);
  const datasets = views
    .map((view) => buildDatasetHealthApiDataset(view))
    .filter((dataset) => matchesFilter(dataset, resolvedRequest.filter))
    .sort((left, right) => compareDatasets(left, right, resolvedRequest.sort));

  return {
    request: resolvedRequest,
    summary: summarizeDatasetHealthApi(datasets),
    datasets,
    groups: groupDatasetHealthApiDatasets(datasets, resolvedRequest.groupBy),
  };
}

export function buildDatasetHealthApiResponseFromInputs(
  inputs: readonly DatasetHealthInput[],
  request?: DatasetHealthApiRequest,
): DatasetHealthApiResponse {
  return buildDatasetHealthApiResponse(
    aggregateDatasetHealthList(inputs),
    request,
  );
}
