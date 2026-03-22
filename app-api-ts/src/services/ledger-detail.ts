import type {
  LedgerDetailDeltaMetric,
  LedgerDetailDeltaSummary,
  LedgerDetailExportBlocker,
  LedgerDetailExportFormat,
  LedgerDetailExportReadiness,
  LedgerDetailFinanceValidationBanner,
  LedgerDetailRequest,
  LedgerDetailResponse,
  LedgerDetailRevisionLineageNode,
  LedgerDetailRoiComponentDrillDown,
} from "@praedixa/shared-types/api";
import type {
  LedgerEntry,
  LedgerMetricValue,
  LedgerRoiComponent,
} from "@praedixa/shared-types/domain";

import { calculateLedgerPercentage } from "./decision-ledger.js";

export type {
  LedgerDetailDeltaMetric,
  LedgerDetailDeltaSummary,
  LedgerDetailExportBlocker,
  LedgerDetailExportFormat,
  LedgerDetailExportReadiness,
  LedgerDetailFinanceValidationBanner,
  LedgerDetailRequest,
  LedgerDetailResponse,
  LedgerDetailRevisionLineageNode,
  LedgerDetailRoiComponentDrillDown,
};

const DEFAULT_EXPORT_FORMATS: readonly LedgerDetailExportFormat[] = [
  "csv",
  "json",
  "xlsx",
];

const EXPORT_FORMAT_ORDER: Record<LedgerDetailExportFormat, number> = {
  csv: 0,
  json: 1,
  xlsx: 2,
};

function getExportFormatOrder(format: LedgerDetailExportFormat): number {
  return EXPORT_FORMAT_ORDER[format];
}

type LedgerDetailErrorCode =
  | "ledger_history_missing"
  | "ledger_id_mismatch"
  | "duplicate_revision"
  | "revision_not_found"
  | "lineage_broken"
  | "required_component_missing";

export class LedgerDetailError extends Error {
  readonly code: LedgerDetailErrorCode;

  constructor(code: LedgerDetailErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "LedgerDetailError";
  }
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function normalizeRequiredComponentKeys(keys?: readonly string[]): string[] {
  return [...new Set(keys ?? [])].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizeExportFormats(
  formats?: readonly LedgerDetailExportFormat[],
): LedgerDetailExportFormat[] {
  return [...new Set(formats ?? DEFAULT_EXPORT_FORMATS)].sort((left, right) => {
    return getExportFormatOrder(left) - getExportFormatOrder(right);
  });
}

function assertLedgerHistory(
  entries: readonly LedgerEntry[],
  ledgerId: string,
): LedgerEntry[] {
  if (entries.length === 0) {
    throw new LedgerDetailError(
      "ledger_history_missing",
      "Ledger detail requires at least one ledger revision",
    );
  }

  const history = entries.filter((entry) => entry.ledgerId === ledgerId);
  if (history.length !== entries.length || history.length === 0) {
    throw new LedgerDetailError(
      "ledger_id_mismatch",
      "Ledger detail history must contain exactly one ledger identifier",
    );
  }

  const revisions = new Set<number>();
  for (const entry of history) {
    if (revisions.has(entry.revision)) {
      throw new LedgerDetailError(
        "duplicate_revision",
        `Ledger detail history contains duplicate revision ${entry.revision}`,
      );
    }
    revisions.add(entry.revision);
  }

  return [...history].sort((left, right) => left.revision - right.revision);
}

function assertRevisionLineage(history: readonly LedgerEntry[]): void {
  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1]!;
    const current = history[index]!;

    if (current.revision !== previous.revision + 1) {
      throw new LedgerDetailError(
        "lineage_broken",
        "Ledger detail lineage must be contiguous by revision",
      );
    }

    if (
      current.supersedes?.ledgerId !== previous.ledgerId ||
      current.supersedes?.revision !== previous.revision
    ) {
      throw new LedgerDetailError(
        "lineage_broken",
        `Ledger revision ${current.revision} must supersede revision ${previous.revision}`,
      );
    }
  }
}

function selectLedgerRevision(
  history: readonly LedgerEntry[],
  revision?: number,
): LedgerEntry {
  if (revision == null) {
    return history[history.length - 1]!;
  }

  const selected = history.find((entry) => entry.revision === revision);
  if (selected == null) {
    throw new LedgerDetailError(
      "revision_not_found",
      `Ledger revision ${revision} is not available`,
    );
  }

  return selected;
}

function asFiniteNumber(value?: LedgerMetricValue): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? roundAmount(value)
    : undefined;
}

function buildMetricKeys(entry: LedgerEntry): string[] {
  const keys = new Set<string>();

  for (const snapshot of [entry.baseline, entry.recommended, entry.actual]) {
    if (snapshot == null) {
      continue;
    }

    for (const [key, value] of Object.entries(snapshot.values)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        keys.add(key);
      }
    }
  }

  return [...keys].sort((left, right) => left.localeCompare(right));
}

function computeDelta(left?: number, right?: number): number | undefined {
  if (left == null || right == null) {
    return undefined;
  }

  return roundAmount(right - left);
}

function assertRequiredComponents(
  components: readonly LedgerRoiComponent[],
  requiredComponentKeys: readonly string[],
): void {
  const available = new Set(components.map((component) => component.key));
  const missing = requiredComponentKeys.filter((key) => !available.has(key));

  if (missing.length > 0) {
    throw new LedgerDetailError(
      "required_component_missing",
      `Ledger detail is missing required ROI components: ${missing.join(", ")}`,
    );
  }
}

function buildExportBlockers(entry: LedgerEntry): LedgerDetailExportBlocker[] {
  const blockers: LedgerDetailExportBlocker[] = [];

  if (entry.status !== "closed" && entry.status !== "recalculated") {
    blockers.push("revision_not_finalized");
  }

  if (entry.actual == null) {
    blockers.push("missing_actual_snapshot");
  }

  if (entry.roi.validationStatus === "estimated") {
    blockers.push("roi_validation_pending");
  }

  if (entry.roi.validationStatus === "contested") {
    blockers.push("roi_validation_contested");
  }

  return blockers;
}

export function buildLedgerRoiDrillDown(
  entry: LedgerEntry,
  requiredComponentKeys: readonly string[] = [],
): LedgerDetailRoiComponentDrillDown[] {
  assertRequiredComponents(entry.roi.components, requiredComponentKeys);

  const absoluteTotal = entry.roi.components.reduce((sum, component) => {
    return sum + Math.abs(component.value);
  }, 0);
  const required = new Set(requiredComponentKeys);

  return [...entry.roi.components]
    .sort((left, right) => {
      const keyOrder = left.key.localeCompare(right.key);
      return keyOrder !== 0 ? keyOrder : left.label.localeCompare(right.label);
    })
    .map((component) => {
      const signedValue =
        component.kind === "benefit" ? component.value : -component.value;

      return {
        key: component.key,
        label: component.label,
        kind: component.kind,
        value: roundAmount(component.value),
        signedValue: roundAmount(signedValue),
        shareOfAbsoluteTotal: calculateLedgerPercentage(
          Math.abs(component.value),
          absoluteTotal,
        ),
        validationStatus: component.validationStatus,
        isRequired: required.has(component.key),
      };
    });
}

export function buildLedgerDeltaSummary(
  entry: LedgerEntry,
): LedgerDetailDeltaSummary {
  const metrics = buildMetricKeys(entry).map<LedgerDetailDeltaMetric>((key) => {
    const baselineValue = asFiniteNumber(entry.baseline.values[key]);
    const recommendedValue = asFiniteNumber(entry.recommended.values[key]);
    const actualValue = asFiniteNumber(entry.actual?.values[key]);
    const recommendedDelta = computeDelta(baselineValue, recommendedValue);
    const actualDelta = computeDelta(baselineValue, actualValue);
    const actualVsRecommendedDelta = computeDelta(
      recommendedValue,
      actualValue,
    );

    return {
      key,
      ...(baselineValue !== undefined ? { baselineValue } : {}),
      ...(recommendedValue !== undefined ? { recommendedValue } : {}),
      ...(actualValue !== undefined ? { actualValue } : {}),
      ...(recommendedDelta !== undefined ? { recommendedDelta } : {}),
      ...(actualDelta !== undefined ? { actualDelta } : {}),
      ...(actualVsRecommendedDelta !== undefined
        ? { actualVsRecommendedDelta }
        : {}),
    };
  });

  return {
    metrics,
    numericMetricCount: metrics.length,
    missingActualMetricKeys: metrics
      .filter(
        (metric) =>
          metric.actualValue == null &&
          (metric.baselineValue != null || metric.recommendedValue != null),
      )
      .map((metric) => metric.key),
  };
}

export function buildLedgerRevisionLineage(
  history: readonly LedgerEntry[],
  selectedRevision: number,
): LedgerDetailRevisionLineageNode[] {
  assertRevisionLineage(history);

  return history.map((entry) => ({
    ledgerId: entry.ledgerId,
    revision: entry.revision,
    status: entry.status,
    validationStatus: entry.roi.validationStatus,
    openedAt: entry.openedAt,
    ...(entry.closedAt !== undefined ? { closedAt: entry.closedAt } : {}),
    ...(entry.supersedes !== undefined ? { supersedes: entry.supersedes } : {}),
    isSelected: entry.revision === selectedRevision,
  }));
}

export function buildLedgerExportReadiness(
  entry: LedgerEntry,
  exportFormats?: readonly LedgerDetailExportFormat[],
  requiredComponentKeys: readonly string[] = [],
): LedgerDetailExportReadiness[] {
  assertRequiredComponents(entry.roi.components, requiredComponentKeys);

  const blockers = buildExportBlockers(entry);
  return normalizeExportFormats(exportFormats).map((format) => ({
    format,
    status: blockers.length === 0 ? "ready" : "blocked",
    blockers,
  }));
}

export function buildLedgerFinanceValidationBanner(
  entry: LedgerEntry,
  exportReadiness: readonly LedgerDetailExportReadiness[],
): LedgerDetailFinanceValidationBanner {
  const blockers = new Set(
    exportReadiness.flatMap((readiness) => readiness.blockers),
  );

  if (blockers.has("roi_validation_contested")) {
    return {
      status: "contested",
      code: "roi_validation_contested",
      message: "ROI validation is contested and finance export is blocked.",
    };
  }

  if (blockers.has("revision_not_finalized")) {
    return {
      status: "blocked",
      code: "revision_not_finalized",
      message: "Only closed or recalculated revisions are export-ready.",
    };
  }

  if (blockers.has("missing_actual_snapshot")) {
    return {
      status: "blocked",
      code: "missing_actual_snapshot",
      message:
        "An actual snapshot is required for finance-grade detail export.",
    };
  }

  if (blockers.has("roi_validation_pending")) {
    return {
      status: "pending",
      code: "roi_validation_pending",
      message: "ROI remains estimated and requires finance validation.",
    };
  }

  return {
    status: "validated",
    code: "validated_for_export",
    message: "ROI is validated and export-ready.",
  };
}

export function resolveLedgerDetail(
  entries: readonly LedgerEntry[],
  request: LedgerDetailRequest,
): LedgerDetailResponse {
  const history = assertLedgerHistory(entries, request.ledgerId);
  const selected = selectLedgerRevision(history, request.revision);
  const requiredComponentKeys = normalizeRequiredComponentKeys(
    request.requiredComponentKeys,
  );
  const roiComponents = buildLedgerRoiDrillDown(
    selected,
    requiredComponentKeys,
  );
  const exportReadiness = buildLedgerExportReadiness(
    selected,
    request.exportFormats,
    requiredComponentKeys,
  );

  return {
    kind: "LedgerDetail",
    ledgerId: selected.ledgerId,
    ...(request.revision !== undefined
      ? { requestedRevision: request.revision }
      : {}),
    selectedRevision: selected.revision,
    latestRevision: history[history.length - 1]!.revision,
    contractId: selected.contractId,
    contractVersion: selected.contractVersion,
    recommendationId: selected.recommendationId,
    ...(selected.scenarioRunId !== undefined
      ? { scenarioRunId: selected.scenarioRunId }
      : {}),
    status: selected.status,
    validationStatus: selected.roi.validationStatus,
    scope: selected.scope,
    approvals: selected.approvals,
    action: selected.action,
    baseline: selected.baseline,
    recommended: selected.recommended,
    ...(selected.actual !== undefined ? { actual: selected.actual } : {}),
    counterfactual: selected.counterfactual,
    roi: selected.roi,
    roiComponents,
    deltaSummary: buildLedgerDeltaSummary(selected),
    validationBanner: buildLedgerFinanceValidationBanner(
      selected,
      exportReadiness,
    ),
    revisionLineage: buildLedgerRevisionLineage(history, selected.revision),
    exportReadiness,
    requiredComponentKeys,
    explanation: selected.explanation,
    openedAt: selected.openedAt,
    ...(selected.closedAt !== undefined ? { closedAt: selected.closedAt } : {}),
  };
}
