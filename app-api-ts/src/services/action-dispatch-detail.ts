import { createHash } from "node:crypto";

import type {
  ActionDispatchAttempt,
  ActionDispatchRecord,
} from "@praedixa/shared-types/domain";
import type {
  ActionDispatchDetailAttempt as ActionDispatchDetailAttemptView,
  ActionDispatchDetailDedupeInsight,
  ActionDispatchDetailFallbackSummary,
  ActionDispatchDetailPayloadRef,
  ActionDispatchDetailPayloadRefSource,
  ActionDispatchDetailRequest,
  ActionDispatchDetailResponse,
  ActionDispatchDetailRetryBlocker,
  ActionDispatchDetailRetryEligibility,
  ActionDispatchDetailRetryPolicySummary,
  ActionDispatchDetailTerminalReason,
  ActionDispatchDetailTerminalReasonCode,
  ActionDispatchDetailTimelineEntry,
  ActionDispatchDetailTimelineKind,
} from "@praedixa/shared-types/api";

import { shouldRetryActionDispatch } from "./action-mesh.js";

export type {
  ActionDispatchDetailAttemptView as ActionDispatchDetailAttempt,
  ActionDispatchDetailDedupeInsight,
  ActionDispatchDetailFallbackSummary,
  ActionDispatchDetailPayloadRef,
  ActionDispatchDetailRequest,
  ActionDispatchDetailResponse,
  ActionDispatchDetailRetryEligibility,
  ActionDispatchDetailRetryPolicySummary,
  ActionDispatchDetailTerminalReason,
  ActionDispatchDetailTimelineEntry,
};

const TIMELINE_KIND_ORDER: Record<ActionDispatchDetailTimelineKind, number> = {
  created: 0,
  attempt: 1,
  fallback_prepared: 2,
  fallback_executed: 3,
};

function getTimelineKindOrder(kind: ActionDispatchDetailTimelineKind): number {
  return TIMELINE_KIND_ORDER[kind];
}

type ActionDispatchDetailErrorCode =
  | "dispatch_not_found"
  | "duplicate_action_id";

interface RawTimelineEntry extends Omit<
  ActionDispatchDetailTimelineEntry,
  "terminal"
> {}

export class ActionDispatchDetailError extends Error {
  readonly code: ActionDispatchDetailErrorCode;

  constructor(code: ActionDispatchDetailErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "ActionDispatchDetailError";
  }
}

function getLastAttempt(
  record: ActionDispatchRecord,
): ActionDispatchAttempt | undefined {
  return record.attempts[record.attempts.length - 1];
}

function getExecutionAttemptCount(record: ActionDispatchRecord): number {
  return record.attempts.filter((attempt) => attempt.status !== "retried")
    .length;
}

function getRemainingAttempts(record: ActionDispatchRecord): number {
  const remaining =
    record.retryPolicy.maxAttempts - getExecutionAttemptCount(record);
  return Math.max(0, remaining);
}

function sortUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildAttemptViews(
  record: ActionDispatchRecord,
): ActionDispatchDetailAttemptView[] {
  const latestAttemptNumber = getLastAttempt(record)?.attemptNumber;
  return record.attempts.map((attempt) => ({
    ...attempt,
    isLatest: attempt.attemptNumber === latestAttemptNumber,
  }));
}

function getPayloadKind(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value === "object" ? "object" : typeof value;
}

function collectPayloadShape(
  value: unknown,
  path: string,
  fieldPaths: Set<string>,
  descriptors: Set<string>,
): void {
  const kind = getPayloadKind(value);
  const descriptorPath = path.length > 0 ? path : "$";
  descriptors.add(`${descriptorPath}:${kind}`);

  if (path.length > 0) {
    fieldPaths.add(path);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPayloadShape(item, `${path}[]`, fieldPaths, descriptors);
    }
    return;
  }

  if (kind !== "object") {
    return;
  }

  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const childPath = path.length > 0 ? `${path}.${key}` : key;
    collectPayloadShape(
      (value as Record<string, unknown>)[key],
      childPath,
      fieldPaths,
      descriptors,
    );
  }
}

function buildPayloadRef(
  source: ActionDispatchDetailPayloadRefSource,
  payload?: Record<string, unknown>,
): ActionDispatchDetailPayloadRef {
  if (payload == null) {
    return {
      source,
      available: false,
      fieldCount: 0,
      fieldPaths: [],
    };
  }

  const fieldPaths = new Set<string>();
  const descriptors = new Set<string>();
  collectPayloadShape(payload, "", fieldPaths, descriptors);
  const sortedPaths = sortUnique([...fieldPaths]);
  const fingerprint = createHash("sha256")
    .update(sortUnique([...descriptors]).join("\n"))
    .digest("hex")
    .slice(0, 16);

  return {
    source,
    available: true,
    fingerprint,
    fieldCount: sortedPaths.length,
    fieldPaths: sortedPaths,
  };
}

export function buildActionDispatchDedupeInsight(
  records: readonly ActionDispatchRecord[],
  record: ActionDispatchRecord,
): ActionDispatchDetailDedupeInsight {
  const related = records.filter(
    (candidate) => candidate.idempotencyKey === record.idempotencyKey,
  );
  const relatedActionIds = sortUnique(
    related.map((candidate) => candidate.actionId),
  ) as ActionDispatchRecord["actionId"][];

  return {
    key: record.idempotencyKey,
    status:
      relatedActionIds.length > 1
        ? "collision"
        : related.length > 1
          ? "replayed"
          : "unique",
    relatedDispatchCount: related.length,
    distinctActionCount: relatedActionIds.length,
    relatedActionIds,
  };
}

function hasActiveFallback(record: ActionDispatchRecord): boolean {
  return (
    record.fallback?.status === "prepared" ||
    record.fallback?.status === "executed"
  );
}

export function evaluateActionDispatchRetryEligibility(
  record: ActionDispatchRecord,
): ActionDispatchDetailRetryEligibility {
  const blockedBy = new Set<ActionDispatchDetailRetryBlocker>();
  const lastErrorCode = getLastAttempt(record)?.errorCode;

  if (record.status !== "failed") {
    blockedBy.add("status_not_failed");
  }
  if (!record.destination.capabilities.supportsRetry) {
    blockedBy.add("destination_retry_disabled");
  }
  if (getRemainingAttempts(record) === 0) {
    blockedBy.add("max_attempts_reached");
  }
  if (hasActiveFallback(record)) {
    blockedBy.add("fallback_active");
  }
  if (
    record.status === "failed" &&
    record.retryPolicy.retryableErrorCodes.length > 0 &&
    lastErrorCode != null &&
    !record.retryPolicy.retryableErrorCodes.includes(lastErrorCode)
  ) {
    blockedBy.add("error_not_retryable");
  }

  const eligible =
    blockedBy.size === 0 && shouldRetryActionDispatch(record, lastErrorCode);
  return {
    eligible,
    blockedBy: [...blockedBy],
    remainingAttempts: getRemainingAttempts(record),
    nextAttemptNumber: eligible ? record.attempts.length + 1 : undefined,
    retryableErrorCode: lastErrorCode,
  };
}

export function buildActionDispatchFallbackSummary(
  record: ActionDispatchRecord,
): ActionDispatchDetailFallbackSummary {
  if (!record.destination.capabilities.supportsHumanFallback) {
    return {
      supported: false,
      status: "unsupported",
      humanRequired: false,
      nextStep: "none",
    };
  }

  const fallback = record.fallback;
  if (fallback == null) {
    return {
      supported: true,
      status: "not_needed",
      humanRequired: false,
      nextStep:
        record.status === "failed" || record.status === "retried"
          ? "prepare"
          : "none",
    };
  }

  const nextStep =
    fallback.status === "prepared"
      ? "execute"
      : fallback.status === "executed"
        ? "monitor"
        : "none";

  return {
    supported: true,
    status: fallback.status,
    channel: fallback.channel,
    reference: fallback.reference,
    preparedAt: fallback.preparedAt,
    executedAt: fallback.executedAt,
    activatedBy: fallback.activatedBy,
    activationReason: fallback.activationReason,
    humanRequired: fallback.humanRequired ?? false,
    nextStep,
  };
}

function buildTerminalReasonMessage(
  code: ActionDispatchDetailTerminalReasonCode,
  retryableErrorCode?: string,
): string {
  switch (code) {
    case "acknowledged":
      return "Dispatch has been acknowledged by the destination.";
    case "canceled":
      return "Dispatch has been canceled.";
    case "dry_run_only":
      return "Dispatch stopped after dry-run validation.";
    case "awaiting_dispatch":
      return "Dispatch is waiting for an execution result.";
    case "retry_scheduled":
      return "Dispatch has been marked for a retry attempt.";
    case "retry_available":
      return "Dispatch can be retried under the configured retry policy.";
    case "retry_exhausted":
      return "Dispatch has exhausted its retry budget.";
    case "non_retryable_error":
      return retryableErrorCode != null
        ? `Dispatch failed with non-retryable error ${retryableErrorCode}.`
        : "Dispatch failed with a non-retryable error.";
    case "human_fallback_prepared":
      return "Human fallback has been prepared and awaits execution.";
    case "human_fallback_executed":
      return "Human fallback has been executed.";
  }

  const unreachable: never = code;
  return unreachable;
}

export function buildActionDispatchTerminalReason(
  record: ActionDispatchRecord,
  retryEligibility: ActionDispatchDetailRetryEligibility,
  fallbackSummary: ActionDispatchDetailFallbackSummary,
): ActionDispatchDetailTerminalReason {
  const lastErrorCode = getLastAttempt(record)?.errorCode;

  let code: ActionDispatchDetailTerminalReasonCode;
  let terminal: boolean;

  switch (record.status) {
    case "dry_run":
      code = "dry_run_only";
      terminal = true;
      break;
    case "pending":
    case "dispatched":
      code = "awaiting_dispatch";
      terminal = false;
      break;
    case "acknowledged":
      code = "acknowledged";
      terminal = true;
      break;
    case "canceled":
      code = "canceled";
      terminal = true;
      break;
    case "retried":
      code = "retry_scheduled";
      terminal = false;
      break;
    case "failed":
      if (fallbackSummary.status === "executed") {
        code = "human_fallback_executed";
        terminal = true;
        break;
      }
      if (fallbackSummary.status === "prepared") {
        code = "human_fallback_prepared";
        terminal = false;
        break;
      }
      if (retryEligibility.eligible) {
        code = "retry_available";
        terminal = false;
        break;
      }
      code = retryEligibility.blockedBy.includes("error_not_retryable")
        ? "non_retryable_error"
        : "retry_exhausted";
      terminal = true;
      break;
  }

  return {
    terminal,
    code,
    message: buildTerminalReasonMessage(code, lastErrorCode),
  };
}

function compareTimelineEntries(
  left: RawTimelineEntry,
  right: RawTimelineEntry,
): number {
  const occurredAtOrder = left.occurredAt.localeCompare(right.occurredAt);
  if (occurredAtOrder !== 0) {
    return occurredAtOrder;
  }

  const kindOrder =
    getTimelineKindOrder(left.kind) - getTimelineKindOrder(right.kind);
  if (kindOrder !== 0) {
    return kindOrder;
  }

  const attemptOrder = (left.attemptNumber ?? 0) - (right.attemptNumber ?? 0);
  if (attemptOrder !== 0) {
    return attemptOrder;
  }

  return left.sequence - right.sequence;
}

function buildAttemptTimelineEntries(
  attempts: readonly ActionDispatchAttempt[],
  baseSequence: number,
): RawTimelineEntry[] {
  return attempts.map((attempt, index) => ({
    sequence: baseSequence + index,
    occurredAt: attempt.dispatchedAt,
    kind: "attempt",
    label: `Attempt ${attempt.attemptNumber} ${attempt.status}`,
    status: attempt.status,
    attemptNumber: attempt.attemptNumber,
    errorCode: attempt.errorCode,
    errorMessage: attempt.errorMessage,
  }));
}

export function buildActionDispatchTimeline(
  record: ActionDispatchRecord,
  terminalReason: ActionDispatchDetailTerminalReason,
): ActionDispatchDetailTimelineEntry[] {
  const entries: RawTimelineEntry[] = [
    {
      sequence: 0,
      occurredAt: record.createdAt,
      kind: "created",
      label: "Dispatch created",
      status: record.status === "dry_run" ? "dry_run" : "pending",
    },
    ...buildAttemptTimelineEntries(record.attempts, 1),
  ];

  if (record.fallback?.preparedAt != null) {
    entries.push({
      sequence: entries.length + 1,
      occurredAt: record.fallback.preparedAt,
      kind: "fallback_prepared",
      label: "Human fallback prepared",
      status: "prepared",
    });
  }

  if (record.fallback?.executedAt != null) {
    entries.push({
      sequence: entries.length + 1,
      occurredAt: record.fallback.executedAt,
      kind: "fallback_executed",
      label: "Human fallback executed",
      status: "prepared",
    });
  }

  const sortedEntries = [...entries].sort(compareTimelineEntries);
  const terminalIndex = terminalReason.terminal ? sortedEntries.length - 1 : -1;

  return sortedEntries.map((entry, index) => ({
    ...entry,
    terminal: index === terminalIndex,
  }));
}

function buildRetryPolicySummary(
  record: ActionDispatchRecord,
  eligibility: ActionDispatchDetailRetryEligibility,
): ActionDispatchDetailRetryPolicySummary {
  return {
    ...record.retryPolicy,
    executionAttemptCount: getExecutionAttemptCount(record),
    remainingAttempts: eligibility.remainingAttempts,
    eligibility,
  };
}

function buildPayloadRefs(
  record: ActionDispatchRecord,
  includePayloadRefs: boolean,
): ActionDispatchDetailPayloadRef[] {
  if (!includePayloadRefs) {
    return [];
  }

  return [
    buildPayloadRef("payloadPreview", record.payloadPreview),
    buildPayloadRef("payloadFinal", record.payloadFinal),
  ];
}

function findActionDispatchRecord(
  records: readonly ActionDispatchRecord[],
  actionId: string,
): ActionDispatchRecord {
  const matches = records.filter((record) => record.actionId === actionId);
  if (matches.length === 0) {
    throw new ActionDispatchDetailError(
      "dispatch_not_found",
      `Action dispatch ${actionId} was not found.`,
    );
  }
  if (matches.length > 1) {
    throw new ActionDispatchDetailError(
      "duplicate_action_id",
      `Action dispatch ${actionId} is duplicated in the provided history.`,
    );
  }
  return matches[0]!;
}

export function resolveActionDispatchDetail(
  records: readonly ActionDispatchRecord[],
  request: ActionDispatchDetailRequest,
): ActionDispatchDetailResponse {
  const record = findActionDispatchRecord(records, request.actionId);
  const retryEligibility = evaluateActionDispatchRetryEligibility(record);
  const fallback = buildActionDispatchFallbackSummary(record);
  const terminalReason = buildActionDispatchTerminalReason(
    record,
    retryEligibility,
    fallback,
  );

  return {
    kind: "ActionDispatchDetail",
    actionId: record.actionId,
    contractId: record.contractId,
    contractVersion: record.contractVersion,
    recommendationId: record.recommendationId,
    approvalId: record.approvalId,
    status: record.status,
    dispatchMode: record.dispatchMode,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    destination: {
      system: record.destination.system,
      connectorId: record.destination.connectorId,
      targetResourceType: record.destination.targetResourceType,
      targetResourceId: record.destination.targetResourceId,
      sandbox: record.destination.sandbox ?? false,
      capabilities: record.destination.capabilities,
    },
    idempotency: buildActionDispatchDedupeInsight(records, record),
    attempts: buildAttemptViews(record),
    retryPolicy: buildRetryPolicySummary(record, retryEligibility),
    fallback,
    terminalReason,
    timeline: buildActionDispatchTimeline(record, terminalReason),
    payloadRefs: buildPayloadRefs(record, request.includePayloadRefs !== false),
  };
}
