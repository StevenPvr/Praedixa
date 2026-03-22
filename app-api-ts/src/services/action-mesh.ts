import type {
  ActionDispatchAttempt as SharedActionDispatchAttempt,
  ActionDispatchRecord as SharedActionDispatchRecord,
  ActionDispatchStatus,
  ActionFallback as SharedActionFallback,
} from "@praedixa/shared-types/domain";

export type { ActionDispatchStatus } from "@praedixa/shared-types/domain";

export type ActionDispatchAttemptStatus = SharedActionDispatchAttempt["status"];
export type ActionFallbackStatus = SharedActionFallback["status"];
export type ActionFallbackChannel = SharedActionFallback["channel"];

export interface ActionDispatchRetryPolicy {
  maxAttempts: number;
  retryableErrorCodes: readonly string[];
  backoffStrategy: "fixed" | "exponential";
  initialDelayMs: number;
  maxDelayMs?: number;
}

export interface ActionDestinationCapabilities {
  supportsDryRun: boolean;
  supportsSandbox: boolean;
  supportsAcknowledgement: boolean;
  supportsCancellation: boolean;
  supportsRetry: boolean;
  supportsIdempotencyKeys: boolean;
  supportsHumanFallback: boolean;
  requiresHumanFallbackOnFailure?: boolean;
}

export interface ActionDispatchAttempt extends SharedActionDispatchAttempt {
  status: ActionDispatchAttemptStatus;
}

export interface ActionFallback extends SharedActionFallback {
  activatedBy?: "system" | "human";
  activationReason?: string;
  humanRequired?: boolean;
}

export interface ActionDispatchRecord extends Omit<
  SharedActionDispatchRecord,
  "destination" | "fallback"
> {
  destination: SharedActionDispatchRecord["destination"] & {
    capabilities: ActionDestinationCapabilities;
  };
  retryPolicy: ActionDispatchRetryPolicy;
  fallback?: ActionFallback;
}

const ACTION_TRANSITIONS: Record<
  ActionDispatchStatus,
  readonly ActionDispatchStatus[]
> = {
  dry_run: [],
  pending: ["dispatched", "failed", "canceled"],
  dispatched: ["acknowledged", "failed", "canceled"],
  acknowledged: [],
  failed: ["retried", "canceled"],
  retried: ["dispatched", "failed", "canceled"],
  canceled: [],
};

interface ActionDispatchRecordInput extends Omit<
  ActionDispatchRecord,
  "status" | "attempts" | "fallback"
> {
  fallback?: ActionFallback;
}

interface RetryMarkerInput {
  retriedAt: string;
  errorCode?: string;
  errorMessage?: string;
}

interface HumanFallbackInput {
  channel: ActionFallbackChannel;
  preparedAt: string;
  activatedBy: "system" | "human";
  activationReason: string;
  reference?: string;
}

function getNextAttemptNumber(record: ActionDispatchRecord): number {
  return record.attempts.length + 1;
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

function validateRetryPolicy(policy: ActionDispatchRetryPolicy): void {
  if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1) {
    throw new Error("Retry policy maxAttempts must be a positive integer.");
  }

  if (!Number.isInteger(policy.initialDelayMs) || policy.initialDelayMs < 0) {
    throw new Error(
      "Retry policy initialDelayMs must be a non-negative integer.",
    );
  }

  if (
    policy.maxDelayMs != null &&
    (!Number.isInteger(policy.maxDelayMs) ||
      policy.maxDelayMs < policy.initialDelayMs)
  ) {
    throw new Error(
      "Retry policy maxDelayMs must be an integer greater than or equal to initialDelayMs.",
    );
  }
}

function validateDispatchMode(record: ActionDispatchRecordInput): void {
  const { dispatchMode, destination } = record;
  if (dispatchMode === "dry_run" && !destination.capabilities.supportsDryRun) {
    throw new Error("Destination does not support dry-run dispatches.");
  }

  if (dispatchMode === "sandbox" && !destination.capabilities.supportsSandbox) {
    throw new Error("Destination does not support sandbox dispatches.");
  }
}

function isRetryableError(
  record: ActionDispatchRecord,
  errorCode?: string,
): boolean {
  const retryableErrorCodes = record.retryPolicy.retryableErrorCodes;
  if (retryableErrorCodes.length === 0) {
    return true;
  }

  return errorCode != null && retryableErrorCodes.includes(errorCode);
}

function buildFallbackNotNeeded(): ActionFallback {
  return {
    status: "not_needed",
    channel: "notification",
    humanRequired: false,
  };
}

function appendAttemptInternal(
  record: ActionDispatchRecord,
  attempt: ActionDispatchAttempt,
): ActionDispatchRecord {
  if (record.status === "dry_run") {
    throw new Error("Dry-run dispatches cannot accept attempt history.");
  }

  if (attempt.attemptNumber !== getNextAttemptNumber(record)) {
    throw new Error(
      `Dispatch attempts must be sequential. Expected ${getNextAttemptNumber(record)}.`,
    );
  }

  if (!canTransitionActionDispatch(record.status, attempt.status)) {
    throw new Error(
      `Invalid action dispatch transition: ${record.status} -> ${attempt.status}.`,
    );
  }

  if (
    attempt.status === "acknowledged" &&
    !record.destination.capabilities.supportsAcknowledgement
  ) {
    throw new Error("Destination does not support acknowledgements.");
  }

  if (
    attempt.status === "canceled" &&
    !record.destination.capabilities.supportsCancellation
  ) {
    throw new Error("Destination does not support cancellation.");
  }

  const nextFallback =
    attempt.status === "acknowledged"
      ? buildFallbackNotNeeded()
      : record.fallback;

  return {
    ...record,
    status: attempt.status,
    attempts: [...record.attempts, attempt],
    ...(nextFallback !== undefined ? { fallback: nextFallback } : {}),
    updatedAt: attempt.dispatchedAt,
  };
}

export function listAllowedActionTransitions(
  status: ActionDispatchStatus,
): readonly ActionDispatchStatus[] {
  return ACTION_TRANSITIONS[status];
}

export function canTransitionActionDispatch(
  current: ActionDispatchStatus,
  next: ActionDispatchStatus,
): boolean {
  return ACTION_TRANSITIONS[current].includes(next);
}

export function createActionDispatchRecord(
  input: ActionDispatchRecordInput,
): ActionDispatchRecord {
  validateRetryPolicy(input.retryPolicy);
  validateDispatchMode(input);

  return {
    ...input,
    status: input.dispatchMode === "dry_run" ? "dry_run" : "pending",
    attempts: [],
    ...(input.fallback !== undefined ? { fallback: input.fallback } : {}),
  };
}

export function findActionDispatchByIdempotencyKey(
  records: readonly ActionDispatchRecord[],
  idempotencyKey: string,
): ActionDispatchRecord | undefined {
  return records.find((record) => record.idempotencyKey === idempotencyKey);
}

export function assertUniqueActionDispatchIdempotencyKey(
  records: readonly ActionDispatchRecord[],
  candidate: Pick<ActionDispatchRecord, "actionId" | "idempotencyKey">,
): void {
  const existing = findActionDispatchByIdempotencyKey(
    records,
    candidate.idempotencyKey,
  );

  if (existing != null && existing.actionId !== candidate.actionId) {
    throw new Error(
      `Idempotency key ${candidate.idempotencyKey} is already assigned to action ${existing.actionId}.`,
    );
  }
}

export function appendActionDispatchAttempt(
  record: ActionDispatchRecord,
  attempt: ActionDispatchAttempt,
): ActionDispatchRecord {
  if (attempt.status === "retried") {
    throw new Error(
      "Use appendActionDispatchRetry to record retried lifecycle markers.",
    );
  }

  return appendAttemptInternal(record, attempt);
}

export function shouldRetryActionDispatch(
  record: ActionDispatchRecord,
  errorCode?: string,
): boolean {
  if (record.status !== "failed") {
    return false;
  }

  if (!record.destination.capabilities.supportsRetry) {
    return false;
  }

  if (getExecutionAttemptCount(record) >= record.retryPolicy.maxAttempts) {
    return false;
  }

  return isRetryableError(
    record,
    errorCode ?? getLastAttempt(record)?.errorCode,
  );
}

export function appendActionDispatchRetry(
  record: ActionDispatchRecord,
  input: RetryMarkerInput,
): ActionDispatchRecord {
  if (record.status !== "failed") {
    throw new Error("Only failed dispatches can transition to retried.");
  }

  const retryErrorCode = input.errorCode ?? getLastAttempt(record)?.errorCode;
  if (!shouldRetryActionDispatch(record, retryErrorCode)) {
    throw new Error("Retry policy does not allow another dispatch attempt.");
  }
  const retryErrorMessage =
    input.errorMessage ?? getLastAttempt(record)?.errorMessage;

  return appendAttemptInternal(record, {
    attemptNumber: getNextAttemptNumber(record),
    status: "retried",
    dispatchedAt: input.retriedAt,
    ...(retryErrorCode !== undefined ? { errorCode: retryErrorCode } : {}),
    ...(retryErrorMessage !== undefined
      ? { errorMessage: retryErrorMessage }
      : {}),
  });
}

export function activateHumanFallback(
  record: ActionDispatchRecord,
  input: HumanFallbackInput,
): ActionDispatchRecord {
  if (!record.destination.capabilities.supportsHumanFallback) {
    throw new Error("Destination does not support human fallback.");
  }

  if (record.status !== "failed" && record.status !== "retried") {
    throw new Error(
      "Human fallback can only be activated after a failed or retried dispatch.",
    );
  }

  if (
    record.status === "failed" &&
    !record.destination.capabilities.requiresHumanFallbackOnFailure &&
    shouldRetryActionDispatch(record)
  ) {
    throw new Error(
      "Retry remains available before human fallback activation.",
    );
  }

  return {
    ...record,
    fallback: {
      status: "prepared",
      channel: input.channel,
      preparedAt: input.preparedAt,
      ...(input.reference !== undefined ? { reference: input.reference } : {}),
      activatedBy: input.activatedBy,
      activationReason: input.activationReason,
      humanRequired: true,
    },
    updatedAt: input.preparedAt,
  };
}

export function executePreparedFallback(
  record: ActionDispatchRecord,
  executedAt: string,
): ActionDispatchRecord {
  if (record.fallback?.status !== "prepared") {
    throw new Error("Fallback must be prepared before execution.");
  }

  return {
    ...record,
    fallback: {
      ...record.fallback,
      status: "executed",
      executedAt,
    },
    updatedAt: executedAt,
  };
}
