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

function applyLedgerDecision(
  entry: LedgerEntry,
  input: LedgerDecisionInput,
  occurredAt: string,
): LedgerEntry {
  const reasonCode = normalizeReasonCode(input.request.reasonCode);
  const comment = normalizeOptionalText(input.request.comment);

  if (input.request.operation === "validate") {
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
        input.request.validationStatus,
        occurredAt,
        input.request.validationStatus === "validated"
          ? input.actorUserId
          : undefined,
      ),
      explanation: appendLedgerDecisionNote(
        entry,
        "validate",
        occurredAt,
        input.actorRole,
        reasonCode,
        comment,
      ),
    };
  }

  const actual = buildActualSnapshot(entry, input.request, occurredAt);
  const roi = buildRoi(entry, input.request);

  if (input.request.operation === "close") {
    const nextEntry = closeLedgerEntry(entry, actual, occurredAt, roi);
    return {
      ...nextEntry,
      explanation: setClosedOrRecalculatedExplanation(
        nextEntry,
        "close",
        occurredAt,
        input.actorRole,
        reasonCode,
        comment,
      ),
    };
  }

  const recalculated = recalculateLedgerEntry(entry, actual, occurredAt, roi);
  return {
    ...recalculated,
    explanation: setClosedOrRecalculatedExplanation(
      recalculated,
      "recalculate",
      occurredAt,
      input.actorRole,
      reasonCode,
      comment,
    ),
  };
}

export async function decidePersistentLedger(
  input: LedgerDecisionInput,
): Promise<LedgerDecisionResponse> {
  assertOrganizationId(input.organizationId);
  assertLedgerId(input.ledgerId);
  const actorUserId = normalizeActor(
    input.actorUserId,
    "INVALID_LEDGER_ACTOR_USER_ID",
    "actorUserId",
  );
  const actorRole = normalizeActor(
    input.actorRole,
    "INVALID_LEDGER_ACTOR_ROLE",
    "actorRole",
  );
  const occurredAt = normalizeOccurredAt(input.request.occurredAt);
  const normalizedInput: LedgerDecisionInput = {
    ...input,
    actorUserId,
    actorRole,
  };

  try {
    return await withTransaction(async (client) => {
      const history = await loadLedgerHistoryById(
        client,
        normalizedInput.organizationId,
        normalizedInput.ledgerId,
      );
      const current = selectLatestLedger(history, normalizedInput.ledgerId);
      const next = applyLedgerDecision(current, normalizedInput, occurredAt);

      if (normalizedInput.request.operation === "recalculate") {
        await insertLedgerRecord(client, normalizedInput.organizationId, next);
      } else {
        await saveLedgerRecord(
          client,
          normalizedInput.organizationId,
          next,
          occurredAt,
        );
      }

      const exportReadyFormats = buildLedgerExportReadiness(next)
        .filter((item) => item.status === "ready")
        .map((item) => item.format);

      return {
        ledgerId: next.ledgerId,
        recommendationId: next.recommendationId,
        operation: normalizedInput.request.operation,
        occurredAt,
        selectedRevision: next.revision,
        latestRevision: next.revision,
        status: next.status,
        validationStatus: next.roi.validationStatus,
        exportReadyFormats,
      };
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "LEDGER_DECISION_FAILED",
      "Ledger decision persistence failed.",
    );
  }
}
