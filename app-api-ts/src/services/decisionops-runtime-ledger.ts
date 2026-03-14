import type {
  LedgerDecisionRequest,
  LedgerDecisionResponse,
} from "@praedixa/shared-types/api";
import type {
  LedgerEntry,
  LedgerMetricSnapshot,
  LedgerRoiComponent,
} from "@praedixa/shared-types/domain";

import { buildLedgerExportReadiness } from "./ledger-detail.js";
import {
  closeLedgerEntry,
  computeLedgerRoi,
  recalculateLedgerEntry,
  setLedgerValidationStatus,
} from "./decision-ledger.js";
import {
  insertLedgerRecord,
  loadLedgerHistoryById,
  saveLedgerRecord,
} from "./decisionops-runtime-store.js";
import {
  PersistenceError,
  isUuidString,
  mapPersistenceError,
  toIsoDateTime,
  withTransaction,
} from "./persistence.js";

interface LedgerDecisionInput {
  organizationId: string;
  ledgerId: string;
  actorUserId: string;
  actorRole: string;
  request: LedgerDecisionRequest;
}

interface NormalizedLedgerDecision {
  normalizedInput: LedgerDecisionInput;
  occurredAt: string;
}

function assertOrganizationId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "organizationId must be a UUID.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

function assertLedgerId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "ledgerId must be a UUID.",
      400,
      "INVALID_LEDGER_ID",
    );
  }
}

function normalizeActor(value: string, code: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError(`${label} is required.`, 400, code);
  }
  return normalized;
}

function normalizeReasonCode(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError(
      "reasonCode is required.",
      400,
      "INVALID_LEDGER_REASON_CODE",
    );
  }
  return normalized;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeOccurredAt(value: string | undefined): string {
  const normalized = toIsoDateTime(value ?? new Date().toISOString());
  if (!normalized) {
    throw new PersistenceError(
      "occurredAt must be a valid ISO datetime.",
      400,
      "INVALID_LEDGER_OCCURRED_AT",
    );
  }
  return normalized;
}

function normalizeLedgerInput(
  input: LedgerDecisionInput,
): NormalizedLedgerDecision {
  return {
    normalizedInput: {
      ...input,
      actorUserId: normalizeActor(
        input.actorUserId,
        "INVALID_LEDGER_ACTOR_USER_ID",
        "actorUserId",
      ),
      actorRole: normalizeActor(
        input.actorRole,
        "INVALID_LEDGER_ACTOR_ROLE",
        "actorRole",
      ),
    },
    occurredAt: normalizeOccurredAt(input.request.occurredAt),
  };
}

function buildActualSnapshot(
  entry: LedgerEntry,
  request: Extract<
    LedgerDecisionRequest,
    { operation: "close" | "recalculate" }
  >,
  occurredAt: string,
): LedgerMetricSnapshot {
  const recordedAt = toIsoDateTime(request.actual.recordedAt ?? occurredAt);
  if (!recordedAt) {
    throw new PersistenceError(
      "actual.recordedAt must be a valid ISO datetime.",
      400,
      "INVALID_LEDGER_ACTUAL_RECORDED_AT",
    );
  }

  const metricKeys = Object.keys(request.actual.values);
  if (metricKeys.length === 0) {
    throw new PersistenceError(
      "actual.values must contain at least one metric.",
      400,
      "INVALID_LEDGER_ACTUAL_VALUES",
    );
  }

  return {
    recordedAt,
    values: structuredClone(request.actual.values),
  };
}

function buildRoi(
  entry: LedgerEntry,
  request: Extract<
    LedgerDecisionRequest,
    { operation: "close" | "recalculate" }
  >,
): LedgerEntry["roi"] {
  const requestedCurrency = request.roi.currency?.trim();
  const currency =
    requestedCurrency && requestedCurrency.length > 0
      ? requestedCurrency.toUpperCase()
      : entry.roi.currency;

  if (requestedCurrency && currency !== entry.roi.currency) {
    throw new PersistenceError(
      "Ledger currency cannot change across revisions.",
      400,
      "INVALID_LEDGER_CURRENCY",
    );
  }

  return computeLedgerRoi(
    request.roi.components.map<LedgerRoiComponent>((component) => ({
      ...component,
      key: component.key.trim(),
      label: component.label.trim(),
    })),
    request.roi.validationStatus,
    currency,
  );
}

function appendLedgerDecisionNote(
  entry: LedgerEntry,
  operation: LedgerDecisionRequest["operation"],
  occurredAt: string,
  actorRole: string,
  reasonCode: string,
  comment?: string,
): LedgerEntry["explanation"] {
  const line =
    `[${occurredAt}] ${operation} by ${actorRole} (${reasonCode})` +
    (comment ? ` - ${comment}` : "");
  const existing = entry.explanation.notes?.trim();

  return {
    ...entry.explanation,
    notes: existing ? `${existing}\n${line}` : line,
  };
}

function selectLatestLedger(
  history: readonly LedgerEntry[],
  ledgerId: string,
): LedgerEntry {
  if (history.length === 0) {
    throw new PersistenceError(
      `Ledger ${ledgerId} was not found.`,
      404,
      "LEDGER_NOT_FOUND",
    );
  }

  return history[history.length - 1]!;
}

function setClosedOrRecalculatedExplanation(
  entry: LedgerEntry,
  operation: "close" | "recalculate",
  occurredAt: string,
  actorRole: string,
  reasonCode: string,
  comment?: string,
): LedgerEntry["explanation"] {
  const explanation = appendLedgerDecisionNote(
    entry,
    operation,
    occurredAt,
    actorRole,
    reasonCode,
    comment,
  );

  const bindingConstraints = new Set(
    explanation.bindingConstraints.filter(
      (value) => value !== "dispatch_pending",
    ),
  );

  return {
    ...explanation,
    bindingConstraints: [...bindingConstraints].sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function appendValidationExplanation(
  entry: LedgerEntry,
  occurredAt: string,
  actorUserId: string,
  actorRole: string,
  request: Extract<LedgerDecisionRequest, { operation: "validate" }>,
  reasonCode: string,
  comment?: string,
): LedgerEntry {
  if (entry.status !== "closed" && entry.status !== "recalculated") {
    throw new PersistenceError(
      "Only closed or recalculated ledger revisions can be finance-validated.",
      400,
      "INVALID_LEDGER_VALIDATION_STATE",
    );
  }

  return {
    ...setLedgerValidationStatus(
      entry,
      request.validationStatus,
      occurredAt,
      request.validationStatus === "validated" ? actorUserId : undefined,
    ),
    explanation: appendLedgerDecisionNote(
      entry,
      "validate",
      occurredAt,
      actorRole,
      reasonCode,
      comment,
    ),
  };
}

function applyLedgerRevision(
  entry: LedgerEntry,
  occurredAt: string,
  actorRole: string,
  request: Extract<
    LedgerDecisionRequest,
    { operation: "close" | "recalculate" }
  >,
  reasonCode: string,
  comment?: string,
): LedgerEntry {
  const actual = buildActualSnapshot(entry, request, occurredAt);
  const roi = buildRoi(entry, request);
  const nextEntry =
    request.operation === "close"
      ? closeLedgerEntry(entry, actual, occurredAt, roi)
      : recalculateLedgerEntry(entry, actual, occurredAt, roi);

  return {
    ...nextEntry,
    explanation: setClosedOrRecalculatedExplanation(
      nextEntry,
      request.operation,
      occurredAt,
      actorRole,
      reasonCode,
      comment,
    ),
  };
}

function applyLedgerDecision(
  entry: LedgerEntry,
  input: LedgerDecisionInput,
  occurredAt: string,
): LedgerEntry {
  const reasonCode = normalizeReasonCode(input.request.reasonCode);
  const comment = normalizeOptionalText(input.request.comment);

  if (input.request.operation === "validate") {
    return appendValidationExplanation(
      entry,
      occurredAt,
      input.actorUserId,
      input.actorRole,
      input.request,
      reasonCode,
      comment,
    );
  }

  return applyLedgerRevision(
    entry,
    occurredAt,
    input.actorRole,
    input.request,
    reasonCode,
    comment,
  );
}

async function persistLedgerDecision(
  client: Parameters<typeof loadLedgerHistoryById>[0],
  input: LedgerDecisionInput,
  occurredAt: string,
): Promise<LedgerDecisionResponse> {
  const history = await loadLedgerHistoryById(
    client,
    input.organizationId,
    input.ledgerId,
  );
  const current = selectLatestLedger(history, input.ledgerId);
  const next = applyLedgerDecision(current, input, occurredAt);

  if (input.request.operation === "recalculate") {
    await insertLedgerRecord(client, input.organizationId, next);
  } else {
    await saveLedgerRecord(client, input.organizationId, next, occurredAt);
  }

  const exportReadyFormats = buildLedgerExportReadiness(next)
    .filter((item) => item.status === "ready")
    .map((item) => item.format);

  return {
    ledgerId: next.ledgerId,
    recommendationId: next.recommendationId,
    operation: input.request.operation,
    occurredAt,
    selectedRevision: next.revision,
    latestRevision: next.revision,
    status: next.status,
    validationStatus: next.roi.validationStatus,
    exportReadyFormats,
  };
}

export async function decidePersistentLedger(
  input: LedgerDecisionInput,
): Promise<LedgerDecisionResponse> {
  assertOrganizationId(input.organizationId);
  assertLedgerId(input.ledgerId);
  const { normalizedInput, occurredAt } = normalizeLedgerInput(input);

  try {
    return await withTransaction((client) =>
      persistLedgerDecision(client, normalizedInput, occurredAt),
    );
  } catch (error) {
    throw mapPersistenceError(
      error,
      "LEDGER_DECISION_FAILED",
      "Ledger decision persistence failed.",
    );
  }
}
