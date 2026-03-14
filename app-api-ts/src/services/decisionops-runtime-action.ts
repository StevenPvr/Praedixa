import type {
  ActionDispatchDecisionRequest,
  ActionDispatchDecisionResponse,
} from "@praedixa/shared-types/api";
import type {
  ActionDispatchRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import {
  appendActionDispatchAttempt,
  appendActionDispatchRetry,
  shouldRetryActionDispatch,
} from "./action-mesh.js";
import {
  loadActionById,
  loadLatestLedgerByRecommendation,
  saveActionRecord,
  saveLedgerRecord,
} from "./decisionops-runtime-store.js";
import {
  PersistenceError,
  isUuidString,
  mapPersistenceError,
  toIsoDateTime,
  withTransaction,
} from "./persistence.js";

interface ActionDispatchDecisionInput {
  organizationId: string;
  actionId: string;
  actorUserId: string;
  actorRole: string;
  request: ActionDispatchDecisionRequest;
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

function assertOrganizationId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "organizationId must be a UUID.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

function assertActionId(value: string): void {
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
      "INVALID_ACTION_OCCURRED_AT",
    );
  }
  return normalized;
}

function normalizeActionInput(input: ActionDispatchDecisionInput): {
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
    },
    occurredAt: normalizeOccurredAt(input.request.occurredAt),
  };
}

function prepareActionDecision(
  request: ActionDispatchDecisionRequest,
): PreparedActionDecision {
  const comment = normalizeOptionalText(request.comment);
  const reasonCode = request.reasonCode.trim();

  return {
    comment,
    errorCode: normalizeOptionalText(request.errorCode) ?? reasonCode,
    errorMessage: normalizeOptionalText(request.errorMessage) ?? comment,
  };
}

function appendDispatchAttempt(
  record: ActionDispatchRecord,
  input: ActionDispatchDecisionInput,
  occurredAt: string,
  prepared: PreparedActionDecision,
  outcome: TerminalActionOutcome,
): ActionDispatchRecord {
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

function applyActionDecision(
  record: ActionDispatchRecord,
  input: ActionDispatchDecisionInput,
  occurredAt: string,
): ActionDispatchRecord {
  const prepared = prepareActionDecision(input.request);

  try {
    switch (input.request.outcome) {
      case "dispatched":
      case "acknowledged":
      case "failed":
      case "canceled":
        return appendDispatchAttempt(
          record,
          input,
          occurredAt,
          prepared,
          input.request.outcome,
        );
      case "retried":
        return appendActionDispatchRetry(record, {
          retriedAt: occurredAt,
          errorCode: prepared.errorCode,
          errorMessage: prepared.errorMessage,
        });
    }

    throw new PersistenceError(
      "Action dispatch decision outcome is invalid.",
      400,
      "INVALID_ACTION_DISPATCH_DECISION",
    );
  } catch (error) {
    throw new PersistenceError(
      error instanceof Error
        ? error.message
        : "Action dispatch decision is invalid.",
      400,
      "INVALID_ACTION_DISPATCH_DECISION",
    );
  }
}

async function syncLatestLedgerForAction(
  client: Parameters<typeof loadLatestLedgerByRecommendation>[0],
  organizationId: string,
  currentAction: ActionDispatchRecord,
  nextAction: ActionDispatchRecord,
  occurredAt: string,
): Promise<LedgerEntry["status"] | null> {
  const latestLedger = await loadLatestLedgerByRecommendation(
    client,
    organizationId,
    currentAction.recommendationId,
  );
  if (!latestLedger) {
    return null;
  }

  const syncedLedger = syncLedgerForAction(latestLedger, nextAction);
  await saveLedgerRecord(client, organizationId, syncedLedger, occurredAt);
  return syncedLedger.status;
}

function buildActionDecisionResponse(
  nextAction: ActionDispatchRecord,
  occurredAt: string,
  ledgerStatus: LedgerEntry["status"] | null,
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
    retryEligible: shouldRetryActionDispatch(nextAction),
  };
}

function syncLedgerForAction(
  ledger: LedgerEntry,
  action: ActionDispatchRecord,
): LedgerEntry {
  const lastAttempt = action.attempts[action.attempts.length - 1];
  const bindingConstraints = new Set(
    ledger.explanation.bindingConstraints.filter(
      (value) =>
        value !== "dispatch_pending" &&
        value !== "dispatch_failed" &&
        value !== "dispatch_canceled" &&
        value !== "fallback_prepared",
    ),
  );

  if (action.status === "pending") {
    bindingConstraints.add("dispatch_pending");
  }
  if (action.status === "failed") {
    bindingConstraints.add("dispatch_failed");
  }
  if (action.status === "canceled") {
    bindingConstraints.add("dispatch_canceled");
  }
  if (action.fallback?.status === "prepared") {
    bindingConstraints.add("fallback_prepared");
  }

  return {
    ...ledger,
    status:
      action.status === "acknowledged" && ledger.status === "open"
        ? "measuring"
        : ledger.status,
    action: {
      ...ledger.action,
      status: action.status,
      targetReference:
        lastAttempt?.targetReference ?? ledger.action.targetReference,
      lastAttemptAt: lastAttempt?.dispatchedAt ?? ledger.action.lastAttemptAt,
    },
    explanation: {
      ...ledger.explanation,
      bindingConstraints: [...bindingConstraints].sort((left, right) =>
        left.localeCompare(right),
      ),
    },
  };
}

export async function decidePersistentActionDispatch(
  input: ActionDispatchDecisionInput,
): Promise<ActionDispatchDecisionResponse> {
  assertOrganizationId(input.organizationId);
  assertActionId(input.actionId);
  const { normalizedInput, occurredAt } = normalizeActionInput(input);

  try {
    return await withTransaction(async (client) => {
      const currentAction = await loadActionById(
        client,
        normalizedInput.organizationId,
        normalizedInput.actionId,
      );
      const nextAction = applyActionDecision(
        currentAction,
        normalizedInput,
        occurredAt,
      );
      await saveActionRecord(
        client,
        normalizedInput.organizationId,
        nextAction,
        occurredAt,
      );
      const ledgerStatus = await syncLatestLedgerForAction(
        client,
        normalizedInput.organizationId,
        currentAction,
        nextAction,
        occurredAt,
      );
      return buildActionDecisionResponse(nextAction, occurredAt, ledgerStatus);
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "ACTION_DISPATCH_DECISION_FAILED",
      "Action dispatch decision persistence failed.",
    );
  }
}
