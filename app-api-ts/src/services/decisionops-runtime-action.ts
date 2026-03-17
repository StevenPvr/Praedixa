import type {
  ActionDispatchDecisionResponse,
  ActionDispatchFallbackRequest,
  ActionDispatchFallbackResponse,
} from "@praedixa/shared-types/api";
import type {
  ActionDispatchRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import {
  activateHumanFallback,
  appendActionDispatchRetry,
  executePreparedFallback,
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
  mapPersistenceError,
  withTransaction,
} from "./persistence.js";
import {
  appendDispatchAttempt,
  assertActionId,
  assertActionWritebackAuthorized,
  assertOrganizationId,
  buildActionDecisionResponse,
  buildActionFallbackResponse,
  normalizeActionFallbackInput,
  normalizeActionInput,
  normalizeOptionalText,
  normalizeReasonCode,
  prepareActionDecisionFields,
  type ActionDispatchDecisionInput,
  type ActionDispatchFallbackInput,
} from "./decisionops-runtime-action-support.js";

function applyActionDecision(
  record: ActionDispatchRecord,
  input: ActionDispatchDecisionInput,
  occurredAt: string,
): ActionDispatchRecord {
  const prepared = prepareActionDecisionFields(input.request);

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

function buildFallbackActivationReason(
  request: ActionDispatchFallbackRequest,
): string {
  const reasonCode = normalizeReasonCode(
    request.reasonCode,
    "INVALID_ACTION_FALLBACK_REASON_CODE",
  );
  const comment = normalizeOptionalText(request.comment);
  return comment ? `${reasonCode}: ${comment}` : reasonCode;
}

function applyActionFallback(
  record: ActionDispatchRecord,
  input: ActionDispatchFallbackInput,
  occurredAt: string,
): ActionDispatchRecord {
  try {
    switch (input.request.operation) {
      case "prepare":
        return activateHumanFallback(record, {
          channel: input.request.channel,
          preparedAt: occurredAt,
          activatedBy: "human",
          activationReason: buildFallbackActivationReason(input.request),
          reference: normalizeOptionalText(input.request.reference),
        });
      case "execute":
        normalizeReasonCode(
          input.request.reasonCode,
          "INVALID_ACTION_FALLBACK_REASON_CODE",
        );
        return executePreparedFallback(record, occurredAt);
    }

    throw new PersistenceError(
      "Action dispatch fallback operation is invalid.",
      400,
      "INVALID_ACTION_DISPATCH_FALLBACK",
    );
  } catch (error) {
    throw new PersistenceError(
      error instanceof Error
        ? error.message
        : "Action dispatch fallback is invalid.",
      400,
      "INVALID_ACTION_DISPATCH_FALLBACK",
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

function canRetryAction(action: ActionDispatchRecord): boolean {
  if (
    action.fallback?.status === "prepared" ||
    action.fallback?.status === "executed"
  ) {
    return false;
  }

  return shouldRetryActionDispatch(action);
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
      assertActionWritebackAuthorized(currentAction, normalizedInput);
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
      return buildActionDecisionResponse(
        nextAction,
        occurredAt,
        ledgerStatus,
        canRetryAction(nextAction),
      );
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "ACTION_DISPATCH_DECISION_FAILED",
      "Action dispatch decision persistence failed.",
    );
  }
}

export async function decidePersistentActionFallback(
  input: ActionDispatchFallbackInput,
): Promise<ActionDispatchFallbackResponse> {
  assertOrganizationId(input.organizationId);
  assertActionId(input.actionId);
  const { normalizedInput, occurredAt } = normalizeActionFallbackInput(input);

  try {
    return await withTransaction(async (client) => {
      const currentAction = await loadActionById(
        client,
        normalizedInput.organizationId,
        normalizedInput.actionId,
      );
      assertActionWritebackAuthorized(currentAction, normalizedInput);
      const nextAction = applyActionFallback(
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
      return buildActionFallbackResponse(
        nextAction,
        occurredAt,
        ledgerStatus,
        canRetryAction(nextAction),
      );
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "ACTION_DISPATCH_FALLBACK_FAILED",
      "Action dispatch fallback persistence failed.",
    );
  }
}
