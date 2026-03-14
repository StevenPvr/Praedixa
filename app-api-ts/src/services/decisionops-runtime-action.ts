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

function applyActionDecision(
  record: ActionDispatchRecord,
  input: ActionDispatchDecisionInput,
  occurredAt: string,
): ActionDispatchRecord {
  const comment = normalizeOptionalText(input.request.comment);
  const reasonCode = input.request.reasonCode.trim();
  const errorCode =
    normalizeOptionalText(input.request.errorCode) ?? reasonCode;
  const errorMessage =
    normalizeOptionalText(input.request.errorMessage) ?? comment;

  try {
    switch (input.request.outcome) {
      case "dispatched":
      case "acknowledged":
      case "failed":
      case "canceled":
        return appendActionDispatchAttempt(record, {
          attemptNumber: record.attempts.length + 1,
          status: input.request.outcome,
          dispatchedAt: occurredAt,
          latencyMs: input.request.latencyMs,
          targetReference: normalizeOptionalText(input.request.targetReference),
          errorCode:
            input.request.outcome === "failed" ||
            input.request.outcome === "canceled"
              ? errorCode
              : undefined,
          errorMessage:
            input.request.outcome === "failed" ||
            input.request.outcome === "canceled"
              ? errorMessage
              : undefined,
        });
      case "retried":
        return appendActionDispatchRetry(record, {
          retriedAt: occurredAt,
          errorCode,
          errorMessage,
        });
    }
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
  const actorUserId = normalizeActor(
    input.actorUserId,
    "INVALID_ACTION_ACTOR_USER_ID",
    "actorUserId",
  );
  const actorRole = normalizeActor(
    input.actorRole,
    "INVALID_ACTION_ACTOR_ROLE",
    "actorRole",
  );
  const occurredAt = normalizeOccurredAt(input.request.occurredAt);
  const normalizedInput: ActionDispatchDecisionInput = {
    ...input,
    actorUserId,
    actorRole,
  };

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

      const latestLedger = await loadLatestLedgerByRecommendation(
        client,
        normalizedInput.organizationId,
        currentAction.recommendationId,
      );

      let ledgerStatus: LedgerEntry["status"] | null = null;
      if (latestLedger) {
        const syncedLedger = syncLedgerForAction(latestLedger, nextAction);
        ledgerStatus = syncedLedger.status;
        await saveLedgerRecord(
          client,
          normalizedInput.organizationId,
          syncedLedger,
          occurredAt,
        );
      }

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
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "ACTION_DISPATCH_DECISION_FAILED",
      "Action dispatch decision persistence failed.",
    );
  }
}
