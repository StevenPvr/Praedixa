import type {
  ActionDispatchDecisionRequest,
  ActionDispatchDecisionResponse,
  ActionDispatchFallbackRequest,
  ActionDispatchFallbackResponse,
} from "@praedixa/shared-types/api";
import type {
  ActionDispatchRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import { appendActionDispatchAttempt } from "./action-mesh.js";
import {
  PersistenceError,
  isUuidString,
  toIsoDateTime,
} from "./persistence.js";

export interface ActionDispatchDecisionInput {
  organizationId: string;
  actionId: string;
  actorUserId: string;
  actorRole: string;
  actorPermissions: readonly string[];
  request: ActionDispatchDecisionRequest;
}

export interface ActionDispatchFallbackInput {
  organizationId: string;
  actionId: string;
  actorUserId: string;
  actorRole: string;
  actorPermissions: readonly string[];
  request: ActionDispatchFallbackRequest;
}

type TerminalActionOutcome = Extract<
  ActionDispatchDecisionRequest["outcome"],
  "dispatched" | "acknowledged" | "failed" | "canceled"
>;

interface PreparedActionDecision {
  comment?: string;
  errorCode: string;
  errorMessage?: string;
}

export function assertOrganizationId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "organizationId must be a UUID.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

export function assertActionId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "actionId must be a UUID.",
      400,
      "INVALID_ACTION_ID",
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

export function normalizeOptionalText(
  value: string | undefined,
): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function normalizeReasonCode(value: string, code: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError("reasonCode is required.", 400, code);
  }
  return normalized;
}

function normalizePermissionKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeActorPermissions(values: readonly string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizePermissionKey(value))
        .filter((value) => value.length > 0),
    ),
  );
}

function normalizeOccurredAt(value: string | undefined): string {
  const normalized = toIsoDateTime(value ?? new Date().toISOString());
  if (!normalized) {
    throw new PersistenceError(
      "occurredAt must be a valid ISO datetime.",
      400,
      "INVALID_ACTION_OCCURRED_AT",
    );
  }
  return normalized;
}

export function normalizeActionInput(input: ActionDispatchDecisionInput): {
  normalizedInput: ActionDispatchDecisionInput;
  occurredAt: string;
} {
  return {
    normalizedInput: {
      ...input,
      actorUserId: normalizeActor(
        input.actorUserId,
        "INVALID_ACTION_ACTOR_USER_ID",
        "actorUserId",
      ),
      actorRole: normalizeActor(
        input.actorRole,
        "INVALID_ACTION_ACTOR_ROLE",
        "actorRole",
      ),
      actorPermissions: normalizeActorPermissions(input.actorPermissions),
    },
    occurredAt: normalizeOccurredAt(input.request.occurredAt),
  };
}

export function normalizeActionFallbackInput(
  input: ActionDispatchFallbackInput,
): {
  normalizedInput: ActionDispatchFallbackInput;
  occurredAt: string;
} {
  return {
    normalizedInput: {
      ...input,
      actorUserId: normalizeActor(
        input.actorUserId,
        "INVALID_ACTION_ACTOR_USER_ID",
        "actorUserId",
      ),
      actorRole: normalizeActor(
        input.actorRole,
        "INVALID_ACTION_ACTOR_ROLE",
        "actorRole",
      ),
      actorPermissions: normalizeActorPermissions(input.actorPermissions),
    },
    occurredAt: normalizeOccurredAt(input.request.occurredAt),
  };
}

export function assertActionWritebackAuthorized(
  record: ActionDispatchRecord,
  input: Pick<ActionDispatchDecisionInput, "actorPermissions">,
): void {
  if (!record.permissionsContext.allowedByContract) {
    throw new PersistenceError(
      `DecisionContract ${record.contractId} does not allow write-back for this dispatch.`,
      403,
      "ACTION_DISPATCH_PERMISSION_DENIED",
      {
        contractId: record.contractId,
        destinationType: record.destination.targetResourceType,
      },
    );
  }

  const requiredPermissions = record.permissionsContext.permissionKeys.map(
    (value) => normalizePermissionKey(value),
  );
  const actorPermissionSet = new Set(input.actorPermissions);
  const missingPermissions = requiredPermissions.filter(
    (permission) => !actorPermissionSet.has(permission),
  );

  if (missingPermissions.length > 0) {
    throw new PersistenceError(
      `Action dispatch write-back requires ${missingPermissions.join(", ")}.`,
      403,
      "ACTION_DISPATCH_PERMISSION_DENIED",
      {
        contractId: record.contractId,
        destinationType: record.destination.targetResourceType,
        missingPermissions,
      },
    );
  }
}

export function prepareActionDecisionFields(
  request: ActionDispatchDecisionRequest,
): PreparedActionDecision {
  const comment = normalizeOptionalText(request.comment);
  const reasonCode = normalizeReasonCode(
    request.reasonCode,
    "INVALID_ACTION_REASON_CODE",
  );

  return {
    comment,
    errorCode: normalizeOptionalText(request.errorCode) ?? reasonCode,
    errorMessage: normalizeOptionalText(request.errorMessage) ?? comment,
  };
}

export function appendDispatchAttempt(
  record: ActionDispatchRecord,
  input: ActionDispatchDecisionInput,
  occurredAt: string,
  outcome: TerminalActionOutcome,
): ActionDispatchRecord {
  const prepared = prepareActionDecisionFields(input.request);
  const canStoreError = outcome === "failed" || outcome === "canceled";

  return appendActionDispatchAttempt(record, {
    attemptNumber: record.attempts.length + 1,
    status: outcome,
    dispatchedAt: occurredAt,
    latencyMs: input.request.latencyMs,
    targetReference: normalizeOptionalText(input.request.targetReference),
    errorCode: canStoreError ? prepared.errorCode : undefined,
    errorMessage: canStoreError ? prepared.errorMessage : undefined,
  });
}

export function buildActionDecisionResponse(
  nextAction: ActionDispatchRecord,
  occurredAt: string,
  ledgerStatus: LedgerEntry["status"] | null,
  retryEligible: boolean,
): ActionDispatchDecisionResponse {
  return {
    actionId: nextAction.actionId,
    recommendationId: nextAction.recommendationId,
    occurredAt,
    actionStatus: nextAction.status,
    latestAttemptStatus:
      nextAction.attempts[nextAction.attempts.length - 1]?.status ?? null,
    ledgerStatus,
    fallbackStatus: nextAction.fallback?.status ?? null,
    retryEligible,
  };
}

export function buildActionFallbackResponse(
  nextAction: ActionDispatchRecord,
  occurredAt: string,
  ledgerStatus: LedgerEntry["status"] | null,
  retryEligible: boolean,
): ActionDispatchFallbackResponse {
  return {
    actionId: nextAction.actionId,
    recommendationId: nextAction.recommendationId,
    occurredAt,
    actionStatus: nextAction.status,
    fallbackStatus: nextAction.fallback?.status ?? "not_needed",
    fallbackPreparedAt: nextAction.fallback?.preparedAt,
    fallbackExecutedAt: nextAction.fallback?.executedAt,
    ledgerStatus,
    retryEligible,
  };
}
