import type { ISODateTimeString } from "../utils/common.js";

export type DatasetHealthReadiness = "ready" | "degraded" | "stale" | "error";

export interface DatasetHealthFreshnessInput {
  lastRefreshedAt: ISODateTimeString | null;
  maxAgeMinutes: number;
}

export interface DatasetHealthLineageInput {
  upstreamDatasets?: readonly string[];
  missingUpstreamDatasets?: readonly string[];
  brokenUpstreamDatasets?: readonly string[];
}

export interface DatasetHealthProcessedVolumeInput {
  processedRows: number;
  expectedMinRows?: number | null;
}

export interface DatasetHealthErrorRateInput {
  failedRuns: number;
  totalRuns: number;
  degradedThresholdPct?: number;
  errorThresholdPct?: number;
}

export interface DatasetHealthLastSuccessfulRunInput {
  completedAt: ISODateTimeString | null;
  runId?: string | null;
  maxAgeMinutes?: number | null;
}

export interface DatasetHealthInput {
  datasetKey: string;
  datasetLabel?: string | null;
  evaluatedAt: ISODateTimeString;
  freshness: DatasetHealthFreshnessInput;
  lineage?: DatasetHealthLineageInput;
  processedVolume: DatasetHealthProcessedVolumeInput;
  errorRate: DatasetHealthErrorRateInput;
  lastSuccessfulRun: DatasetHealthLastSuccessfulRunInput;
}

export interface DatasetHealthFreshnessSignal {
  status: "ready" | "stale";
  lastRefreshedAt: ISODateTimeString | null;
  ageMinutes: number | null;
  maxAgeMinutes: number;
  isFresh: boolean;
}

export interface DatasetHealthLineageSignal {
  status: "ready" | "error";
  upstreamDatasets: string[];
  missingUpstreamDatasets: string[];
  brokenUpstreamDatasets: string[];
  upstreamCount: number;
  readyUpstreamCount: number;
  missingCount: number;
  brokenCount: number;
}

export interface DatasetHealthProcessedVolumeSignal {
  status: "ready" | "degraded";
  processedRows: number;
  expectedMinRows: number | null;
  deficitRows: number;
}

export interface DatasetHealthErrorRateSignal {
  status: "ready" | "degraded" | "error";
  failedRuns: number;
  totalRuns: number;
  errorRatePct: number;
  degradedThresholdPct: number;
  errorThresholdPct: number;
}

export interface DatasetHealthLastSuccessfulRunSignal {
  status: "ready" | "stale" | "error";
  completedAt: ISODateTimeString | null;
  runId: string | null;
  ageMinutes: number | null;
  maxAgeMinutes: number | null;
}

export type DatasetHealthIssueCode =
  | "lineage_broken_dependencies"
  | "lineage_missing_dependencies"
  | "last_success_missing"
  | "last_success_stale"
  | "freshness_stale"
  | "error_rate_high"
  | "error_rate_elevated"
  | "processed_volume_low";

export interface DatasetHealthIssue {
  code: DatasetHealthIssueCode;
  severity: Exclude<DatasetHealthReadiness, "ready">;
  message: string;
}

export interface DatasetHealthView {
  datasetKey: string;
  datasetLabel: string | null;
  evaluatedAt: ISODateTimeString;
  readiness: DatasetHealthReadiness;
  freshness: DatasetHealthFreshnessSignal;
  lineage: DatasetHealthLineageSignal;
  processedVolume: DatasetHealthProcessedVolumeSignal;
  errorRate: DatasetHealthErrorRateSignal;
  lastSuccessfulRun: DatasetHealthLastSuccessfulRunSignal;
  issues: DatasetHealthIssue[];
}

const DEFAULT_ERROR_RATE_DEGRADED_THRESHOLD_PCT = 5;
const DEFAULT_ERROR_RATE_ERROR_THRESHOLD_PCT = 20;

const READINESS_RANK: Record<DatasetHealthReadiness, number> = {
  ready: 0,
  degraded: 1,
  stale: 2,
  error: 3,
};

function requireTimestamp(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    throw new TypeError(`${field} must be a valid ISO datetime string`);
  }
  return timestamp;
}

function parseOptionalTimestamp(
  value: string | null | undefined,
): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeThreshold(
  value: number | null | undefined,
  fallback: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

function normalizeDatasetList(values: readonly string[] | undefined): string[] {
  return [
    ...new Set((values ?? []).map((value) => value.trim()).filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right));
}

function ageMinutes(
  timestamp: string | null | undefined,
  evaluatedAtMs: number,
): number | null {
  const source = parseOptionalTimestamp(timestamp);
  if (source == null) {
    return null;
  }
  return Math.max(0, Math.floor((evaluatedAtMs - source) / 60_000));
}

function roundPct(value: number): number {
  return Number(value.toFixed(2));
}

function buildFreshnessSignal(
  input: DatasetHealthFreshnessInput,
  evaluatedAtMs: number,
): DatasetHealthFreshnessSignal {
  const maxAgeMinutes = normalizeThreshold(input.maxAgeMinutes, 0);
  const currentAgeMinutes = ageMinutes(input.lastRefreshedAt, evaluatedAtMs);
  const isFresh =
    currentAgeMinutes != null && currentAgeMinutes <= maxAgeMinutes;

  return {
    status: isFresh ? "ready" : "stale",
    lastRefreshedAt: input.lastRefreshedAt,
    ageMinutes: currentAgeMinutes,
    maxAgeMinutes,
    isFresh,
  };
}

function buildLineageSignal(
  input: DatasetHealthLineageInput | undefined,
): DatasetHealthLineageSignal {
  const upstreamDatasets = normalizeDatasetList(input?.upstreamDatasets);
  const missingUpstreamDatasets = normalizeDatasetList(
    input?.missingUpstreamDatasets,
  );
  const brokenUpstreamDatasets = normalizeDatasetList(
    input?.brokenUpstreamDatasets,
  );
  const impacted = new Set([
    ...missingUpstreamDatasets,
    ...brokenUpstreamDatasets,
  ]);

  return {
    status: impacted.size > 0 ? "error" : "ready",
    upstreamDatasets,
    missingUpstreamDatasets,
    brokenUpstreamDatasets,
    upstreamCount: upstreamDatasets.length,
    readyUpstreamCount: upstreamDatasets.filter((item) => !impacted.has(item))
      .length,
    missingCount: missingUpstreamDatasets.length,
    brokenCount: brokenUpstreamDatasets.length,
  };
}

function buildProcessedVolumeSignal(
  input: DatasetHealthProcessedVolumeInput,
): DatasetHealthProcessedVolumeSignal {
  const processedRows = normalizeCount(input.processedRows);
  const expectedMinRows =
    input.expectedMinRows == null
      ? null
      : normalizeCount(input.expectedMinRows);
  const deficitRows =
    expectedMinRows == null ? 0 : Math.max(0, expectedMinRows - processedRows);

  return {
    status: deficitRows > 0 ? "degraded" : "ready",
    processedRows,
    expectedMinRows,
    deficitRows,
  };
}

function buildErrorRateSignal(
  input: DatasetHealthErrorRateInput,
): DatasetHealthErrorRateSignal {
  const failedRuns = normalizeCount(input.failedRuns);
  const totalRuns = normalizeCount(input.totalRuns);
  const degradedThresholdPct = normalizeThreshold(
    input.degradedThresholdPct,
    DEFAULT_ERROR_RATE_DEGRADED_THRESHOLD_PCT,
  );
  const errorThresholdPct = Math.max(
    degradedThresholdPct,
    normalizeThreshold(
      input.errorThresholdPct,
      DEFAULT_ERROR_RATE_ERROR_THRESHOLD_PCT,
    ),
  );
  const errorRatePct =
    totalRuns === 0 ? 0 : roundPct((failedRuns / totalRuns) * 100);

  let status: DatasetHealthErrorRateSignal["status"] = "ready";
  if (errorRatePct >= errorThresholdPct) {
    status = "error";
  } else if (errorRatePct >= degradedThresholdPct) {
    status = "degraded";
  }

  return {
    status,
    failedRuns,
    totalRuns,
    errorRatePct,
    degradedThresholdPct,
    errorThresholdPct,
  };
}

function buildLastSuccessfulRunSignal(
  input: DatasetHealthLastSuccessfulRunInput,
  evaluatedAtMs: number,
): DatasetHealthLastSuccessfulRunSignal {
  if (!input.completedAt) {
    return {
      status: "error",
      completedAt: null,
      runId: input.runId ?? null,
      ageMinutes: null,
      maxAgeMinutes:
        input.maxAgeMinutes == null
          ? null
          : normalizeThreshold(input.maxAgeMinutes, 0),
    };
  }

  const currentAgeMinutes = ageMinutes(input.completedAt, evaluatedAtMs);
  const maxAgeMinutes =
    input.maxAgeMinutes == null
      ? null
      : normalizeThreshold(input.maxAgeMinutes, 0);
  const isStale =
    currentAgeMinutes == null
      ? true
      : maxAgeMinutes != null && currentAgeMinutes > maxAgeMinutes;

  return {
    status: isStale ? "stale" : "ready",
    completedAt: input.completedAt,
    runId: input.runId ?? null,
    ageMinutes: currentAgeMinutes,
    maxAgeMinutes,
  };
}

function buildIssues(
  view: Omit<DatasetHealthView, "readiness" | "issues">,
): DatasetHealthIssue[] {
  const issues: DatasetHealthIssue[] = [];

  if (view.lineage.brokenCount > 0) {
    issues.push({
      code: "lineage_broken_dependencies",
      severity: "error",
      message: `${view.lineage.brokenCount} dependency(ies) report a broken lineage`,
    });
  }

  if (view.lineage.missingCount > 0) {
    issues.push({
      code: "lineage_missing_dependencies",
      severity: "error",
      message: `${view.lineage.missingCount} dependency(ies) are missing from lineage`,
    });
  }

  if (view.lastSuccessfulRun.status === "error") {
    issues.push({
      code: "last_success_missing",
      severity: "error",
      message: "No successful run is available for this dataset",
    });
  } else if (view.lastSuccessfulRun.status === "stale") {
    issues.push({
      code: "last_success_stale",
      severity: "stale",
      message:
        "The last successful run is older than the allowed freshness window",
    });
  }

  if (view.freshness.status === "stale") {
    issues.push({
      code: "freshness_stale",
      severity: "stale",
      message: "The dataset freshness exceeds the allowed age",
    });
  }

  if (view.errorRate.status === "error") {
    issues.push({
      code: "error_rate_high",
      severity: "error",
      message: `The error rate reached ${view.errorRate.errorRatePct}%`,
    });
  } else if (view.errorRate.status === "degraded") {
    issues.push({
      code: "error_rate_elevated",
      severity: "degraded",
      message: `The error rate reached ${view.errorRate.errorRatePct}%`,
    });
  }

  if (view.processedVolume.status === "degraded") {
    issues.push({
      code: "processed_volume_low",
      severity: "degraded",
      message: `Processed volume is short by ${view.processedVolume.deficitRows} row(s)`,
    });
  }

  return issues.sort((left, right) => {
    const severityDiff =
      READINESS_RANK[right.severity] - READINESS_RANK[left.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return left.code.localeCompare(right.code);
  });
}

export function buildDatasetHealthView(
  input: DatasetHealthInput,
): DatasetHealthView {
  const evaluatedAtMs = requireTimestamp(input.evaluatedAt, "evaluatedAt");
  const baseView = {
    datasetKey: input.datasetKey,
    datasetLabel: input.datasetLabel?.trim() || null,
    evaluatedAt: input.evaluatedAt,
    freshness: buildFreshnessSignal(input.freshness, evaluatedAtMs),
    lineage: buildLineageSignal(input.lineage),
    processedVolume: buildProcessedVolumeSignal(input.processedVolume),
    errorRate: buildErrorRateSignal(input.errorRate),
    lastSuccessfulRun: buildLastSuccessfulRunSignal(
      input.lastSuccessfulRun,
      evaluatedAtMs,
    ),
  };
  const issues = buildIssues(baseView);

  return {
    ...baseView,
    readiness: issues[0]?.severity ?? "ready",
    issues,
  };
}

export function buildDatasetHealthViews(
  inputs: readonly DatasetHealthInput[],
): DatasetHealthView[] {
  return [...inputs]
    .map((input) => buildDatasetHealthView(input))
    .sort((left, right) => {
      const readinessDiff =
        READINESS_RANK[right.readiness] - READINESS_RANK[left.readiness];
      if (readinessDiff !== 0) {
        return readinessDiff;
      }
      return left.datasetKey.localeCompare(right.datasetKey);
    });
}
