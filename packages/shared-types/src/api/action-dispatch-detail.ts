import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  ActionDispatchAttemptStatus,
  ActionDispatchMode,
  ActionDispatchRecord,
  ActionDispatchStatus,
  ActionFallbackActor,
  ActionFallbackChannel,
  ActionFallbackStatus,
  ActionRetryBackoffStrategy,
} from "../domain/action-dispatch.js";

export type ActionDispatchDetailDedupeStatus =
  | "unique"
  | "replayed"
  | "collision";

export type ActionDispatchDetailRetryBlocker =
  | "status_not_failed"
  | "destination_retry_disabled"
  | "max_attempts_reached"
  | "error_not_retryable"
  | "fallback_active";

export type ActionDispatchDetailFallbackNextStep =
  | "none"
  | "prepare"
  | "execute"
  | "monitor";

export type ActionDispatchDetailTimelineKind =
  | "created"
  | "attempt"
  | "fallback_prepared"
  | "fallback_executed";

export type ActionDispatchDetailPayloadRefSource =
  | "payloadPreview"
  | "payloadFinal";

export type ActionDispatchDetailTerminalReasonCode =
  | "acknowledged"
  | "canceled"
  | "dry_run_only"
  | "awaiting_dispatch"
  | "retry_scheduled"
  | "retry_available"
  | "retry_exhausted"
  | "non_retryable_error"
  | "human_fallback_prepared"
  | "human_fallback_executed";

export interface ActionDispatchDetailRequest {
  actionId: UUID;
  includePayloadRefs?: boolean;
}

export interface ActionDispatchDetailDestination {
  system: string;
  connectorId?: UUID;
  targetResourceType: string;
  targetResourceId?: string;
  sandbox: boolean;
  capabilities: ActionDispatchRecord["destination"]["capabilities"];
}

export interface ActionDispatchDetailAttempt {
  attemptNumber: number;
  status: ActionDispatchAttemptStatus;
  dispatchedAt: ISODateTimeString;
  latencyMs?: number;
  targetReference?: string;
  errorCode?: string;
  errorMessage?: string;
  isLatest: boolean;
}

export interface ActionDispatchDetailDedupeInsight {
  key: string;
  status: ActionDispatchDetailDedupeStatus;
  relatedDispatchCount: number;
  distinctActionCount: number;
  relatedActionIds: readonly UUID[];
}

export interface ActionDispatchDetailRetryEligibility {
  eligible: boolean;
  blockedBy: readonly ActionDispatchDetailRetryBlocker[];
  remainingAttempts: number;
  nextAttemptNumber?: number;
  retryableErrorCode?: string;
}

export interface ActionDispatchDetailRetryPolicySummary {
  maxAttempts: number;
  retryableErrorCodes: readonly string[];
  backoffStrategy: ActionRetryBackoffStrategy;
  initialDelayMs: number;
  maxDelayMs?: number;
  executionAttemptCount: number;
  remainingAttempts: number;
  eligibility: ActionDispatchDetailRetryEligibility;
}

export interface ActionDispatchDetailFallbackSummary {
  supported: boolean;
  status: ActionFallbackStatus | "unsupported";
  channel?: ActionFallbackChannel;
  reference?: string;
  preparedAt?: ISODateTimeString;
  executedAt?: ISODateTimeString;
  activatedBy?: ActionFallbackActor;
  activationReason?: string;
  humanRequired: boolean;
  nextStep: ActionDispatchDetailFallbackNextStep;
}

export interface ActionDispatchDetailTerminalReason {
  terminal: boolean;
  code: ActionDispatchDetailTerminalReasonCode;
  message: string;
}

export interface ActionDispatchDetailTimelineEntry {
  sequence: number;
  occurredAt: ISODateTimeString;
  kind: ActionDispatchDetailTimelineKind;
  label: string;
  status: ActionDispatchStatus | ActionDispatchAttemptStatus | "prepared";
  attemptNumber?: number;
  errorCode?: string;
  errorMessage?: string;
  terminal: boolean;
}

export interface ActionDispatchDetailPayloadRef {
  source: ActionDispatchDetailPayloadRefSource;
  available: boolean;
  fingerprint?: string;
  fieldCount: number;
  fieldPaths: readonly string[];
}

export interface ActionDispatchDetailPermissionSummary {
  allowedByContract: boolean;
  permissionKeys: readonly string[];
}

export interface ActionDispatchDetailResponse {
  kind: "ActionDispatchDetail";
  actionId: UUID;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  approvalId?: UUID;
  status: ActionDispatchStatus;
  dispatchMode: ActionDispatchMode;
  createdAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  destination: ActionDispatchDetailDestination;
  permissions: ActionDispatchDetailPermissionSummary;
  idempotency: ActionDispatchDetailDedupeInsight;
  attempts: readonly ActionDispatchDetailAttempt[];
  retryPolicy: ActionDispatchDetailRetryPolicySummary;
  fallback: ActionDispatchDetailFallbackSummary;
  terminalReason: ActionDispatchDetailTerminalReason;
  timeline: readonly ActionDispatchDetailTimelineEntry[];
  payloadRefs: readonly ActionDispatchDetailPayloadRef[];
}
