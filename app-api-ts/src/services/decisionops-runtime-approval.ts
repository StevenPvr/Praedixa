import type { PoolClient, QueryResultRow } from "pg";

import type {
  ApprovalDecisionResponse,
  ApprovalDecisionRequest,
} from "@praedixa/shared-types/api";
import type {
  ActionDispatchRecord,
  ApprovalRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import { appendActionDispatchAttempt } from "./action-mesh.js";
import {
  buildApprovalInboxItem,
  requiresApprovalJustification,
} from "./approval-inbox.js";
import { transitionApprovalRecord } from "./approval-workflow.js";
import {
  PersistenceError,
  isUuidString,
  mapPersistenceError,
  toIsoDateTime,
  withTransaction,
} from "./persistence.js";

interface DecisionApprovalRow extends QueryResultRow {
  approval_id: string;
  contract_id: string;
  contract_version: number;
  status: ApprovalRecord["status"];
  approver_role: string;
  rule_step_order: number;
  record_json: unknown;
}

interface ActionDispatchRow extends QueryResultRow {
  action_id: string;
  status: ActionDispatchRecord["status"];
  dispatch_mode: ActionDispatchRecord["dispatchMode"];
  contract_id: string;
  contract_version: number;
  record_json: unknown;
}

interface LedgerEntryRow extends QueryResultRow {
  ledger_id: string;
  revision: number;
  status: LedgerEntry["status"];
  validation_status: LedgerEntry["roi"]["validationStatus"];
  contract_id: string;
  contract_version: number;
  record_json: unknown;
}

interface ApprovalDecisionInput {
  organizationId: string;
  approvalId: string;
  actorUserId: string;
  actorRole: string;
  request: ApprovalDecisionRequest;
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

function assertApprovalId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "approvalId must be a UUID.",
      400,
      "INVALID_APPROVAL_ID",
    );
  }
}

function normalizeActorUserId(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError(
      "actorUserId is required.",
      400,
      "INVALID_ACTOR_USER_ID",
    );
  }
  return normalized;
}

function normalizeActorRole(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError(
      "actorRole is required.",
      400,
      "INVALID_ACTOR_ROLE",
    );
  }
  return normalized;
}

function normalizeReasonCode(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PersistenceError(
      "reasonCode is required.",
      400,
      "INVALID_REASON_CODE",
    );
  }
  return normalized;
}

function normalizeComment(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function toOccurredAt(value: string | undefined): string {
  const normalized = toIsoDateTime(value ?? new Date().toISOString());
  if (!normalized) {
    throw new PersistenceError(
      "decidedAt must be a valid ISO datetime.",
      400,
      "INVALID_DECIDED_AT",
    );
  }
  return normalized;
}

function asPlainObject<T>(value: unknown, code: string, label: string): T {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceError(
      `${label} is invalid in persistent storage.`,
      500,
      code,
    );
  }
  return structuredClone(value as T);
}

function mapApprovalRow(row: DecisionApprovalRow): ApprovalRecord {
  const record = asPlainObject<ApprovalRecord>(
    row.record_json,
    "INVALID_APPROVAL_RECORD",
    "Approval record",
  );
  if (
    record.approvalId !== row.approval_id ||
    record.contractId !== row.contract_id ||
    record.contractVersion !== Number(row.contract_version) ||
    record.status !== row.status ||
    record.rule.approverRole !== row.approver_role ||
    record.rule.stepOrder !== Number(row.rule_step_order)
  ) {
    throw new PersistenceError(
      "Approval storage invariants are inconsistent.",
      500,
      "APPROVAL_RECORD_MISMATCH",
    );
  }
  return record;
}

function mapActionRow(row: ActionDispatchRow): ActionDispatchRecord {
  const record = asPlainObject<ActionDispatchRecord>(
    row.record_json,
    "INVALID_ACTION_DISPATCH_RECORD",
    "Action dispatch record",
  );
  if (
    record.actionId !== row.action_id ||
    record.contractId !== row.contract_id ||
    record.contractVersion !== Number(row.contract_version) ||
    record.status !== row.status ||
    record.dispatchMode !== row.dispatch_mode
  ) {
    throw new PersistenceError(
      "Action dispatch storage invariants are inconsistent.",
      500,
      "ACTION_DISPATCH_RECORD_MISMATCH",
    );
  }
  return record;
}

function mapLedgerRow(row: LedgerEntryRow): LedgerEntry {
  const record = asPlainObject<LedgerEntry>(
    row.record_json,
    "INVALID_LEDGER_RECORD",
    "Ledger record",
  );
  if (
    record.ledgerId !== row.ledger_id ||
    record.revision !== Number(row.revision) ||
    record.contractId !== row.contract_id ||
    record.contractVersion !== Number(row.contract_version) ||
    record.status !== row.status ||
    record.roi.validationStatus !== row.validation_status
  ) {
    throw new PersistenceError(
      "Ledger storage invariants are inconsistent.",
      500,
      "LEDGER_RECORD_MISMATCH",
    );
  }
  return record;
}

async function loadApprovalById(
  client: PoolClient,
  organizationId: string,
  approvalId: string,
): Promise<ApprovalRecord> {
  const result = await client.query<DecisionApprovalRow>(
    `
      SELECT
        approval_id::text AS approval_id,
        contract_id,
        contract_version,
        status::text AS status,
        approver_role,
        rule_step_order,
        record_json
      FROM decision_approvals
      WHERE organization_id = $1::uuid
        AND approval_id = $2::uuid
      LIMIT 1
    `,
    [organizationId, approvalId],
  );
  const row = result.rows[0];
  if (!row) {
    throw new PersistenceError(
      `Approval ${approvalId} was not found.`,
      404,
      "APPROVAL_NOT_FOUND",
    );
  }
  return mapApprovalRow(row);
}

async function loadApprovalsByRecommendation(
  client: PoolClient,
  organizationId: string,
  recommendationId: string,
): Promise<ApprovalRecord[]> {
  const result = await client.query<DecisionApprovalRow>(
    `
      SELECT
        approval_id::text AS approval_id,
        contract_id,
        contract_version,
        status::text AS status,
        approver_role,
        rule_step_order,
        record_json
      FROM decision_approvals
      WHERE organization_id = $1::uuid
        AND recommendation_id = $2::uuid
      ORDER BY rule_step_order ASC, requested_at ASC, approval_id ASC
    `,
    [organizationId, recommendationId],
  );
  return result.rows.map(mapApprovalRow);
}

async function loadActionByRecommendation(
  client: PoolClient,
  organizationId: string,
  recommendationId: string,
): Promise<ActionDispatchRecord | null> {
  const result = await client.query<ActionDispatchRow>(
    `
      SELECT
        action_id::text AS action_id,
        status::text AS status,
        dispatch_mode::text AS dispatch_mode,
        contract_id,
        contract_version,
        record_json
      FROM action_dispatches
      WHERE organization_id = $1::uuid
        AND recommendation_id = $2::uuid
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [organizationId, recommendationId],
  );
  return result.rows[0] ? mapActionRow(result.rows[0]) : null;
}

async function loadLatestLedgerByRecommendation(
  client: PoolClient,
  organizationId: string,
  recommendationId: string,
): Promise<LedgerEntry | null> {
  const result = await client.query<LedgerEntryRow>(
    `
      SELECT
        ledger_id::text AS ledger_id,
        revision,
        status::text AS status,
        validation_status::text AS validation_status,
        contract_id,
        contract_version,
        record_json
      FROM decision_ledger_entries
      WHERE organization_id = $1::uuid
        AND recommendation_id = $2::uuid
      ORDER BY revision DESC, created_at DESC, id DESC
      LIMIT 1
    `,
    [organizationId, recommendationId],
  );
  return result.rows[0] ? mapLedgerRow(result.rows[0]) : null;
}

async function saveApprovalRecord(
  client: PoolClient,
  organizationId: string,
  record: ApprovalRecord,
  updatedAt: string,
): Promise<void> {
  await client.query(
    `
      UPDATE decision_approvals
      SET
        status = $3::approvalruntimestatus,
        record_json = $4::jsonb,
        updated_at = $5::timestamptz
      WHERE organization_id = $1::uuid
        AND approval_id = $2::uuid
    `,
    [
      organizationId,
      record.approvalId,
      record.status,
      JSON.stringify(record),
      updatedAt,
    ],
  );
}

async function saveActionRecord(
  client: PoolClient,
  organizationId: string,
  record: ActionDispatchRecord,
  updatedAt: string,
): Promise<void> {
  await client.query(
    `
      UPDATE action_dispatches
      SET
        status = $3::actiondispatchruntimestatus,
        record_json = $4::jsonb,
        updated_at = $5::timestamptz
      WHERE organization_id = $1::uuid
        AND action_id = $2::uuid
    `,
    [
      organizationId,
      record.actionId,
      record.status,
      JSON.stringify(record),
      updatedAt,
    ],
  );
}

async function saveLedgerRecord(
  client: PoolClient,
  organizationId: string,
  record: LedgerEntry,
  updatedAt: string,
): Promise<void> {
  await client.query(
    `
      UPDATE decision_ledger_entries
      SET
        status = $4::ledgerruntimestatus,
        validation_status = $5::ledgerruntimevalidationstatus,
        closed_at = $6::timestamptz,
        record_json = $7::jsonb,
        updated_at = $8::timestamptz
      WHERE organization_id = $1::uuid
        AND ledger_id = $2::uuid
        AND revision = $3::int
    `,
    [
      organizationId,
      record.ledgerId,
      record.revision,
      record.status,
      record.roi.validationStatus,
      record.closedAt ?? null,
      JSON.stringify(record),
      updatedAt,
    ],
  );
}

function buildLedgerApprovalSummaries(
  approvals: readonly ApprovalRecord[],
): LedgerEntry["approvals"] {
  return approvals
    .flatMap((record) => {
      if (!record.decision) {
        return [];
      }
      return [
        {
          approvalId: record.approvalId,
          outcome: record.decision.outcome,
          actorRole: record.decision.actorRole,
          actorUserId: record.decision.actorUserId,
          decidedAt: record.decision.decidedAt,
        },
      ];
    })
    .sort((left, right) => left.decidedAt.localeCompare(right.decidedAt));
}

function buildBindingConstraints(
  ledger: LedgerEntry,
  approvals: readonly ApprovalRecord[],
  actionStatus: ActionDispatchRecord["status"] | undefined,
): LedgerEntry["explanation"]["bindingConstraints"] {
  const next = new Set(
    ledger.explanation.bindingConstraints.filter(
      (value) =>
        value !== "approval_required" &&
        value !== "approval_rejected" &&
        value !== "dispatch_pending",
    ),
  );

  if (approvals.some((record) => record.status === "requested")) {
    next.add("approval_required");
  }
  if (approvals.some((record) => record.status === "rejected")) {
    next.add("approval_rejected");
  }
  if (actionStatus === "pending") {
    next.add("dispatch_pending");
  }

  return [...next].sort((left, right) => left.localeCompare(right));
}

function syncLedgerDecisionState(
  ledger: LedgerEntry,
  approvals: readonly ApprovalRecord[],
  action: ActionDispatchRecord | null,
): LedgerEntry {
  const latestAttempt = action?.attempts[action.attempts.length - 1];
  return {
    ...ledger,
    approvals: buildLedgerApprovalSummaries(approvals),
    action: {
      ...ledger.action,
      status: action?.status ?? ledger.action.status,
      targetReference:
        latestAttempt?.targetReference ?? ledger.action.targetReference,
      lastAttemptAt: latestAttempt?.dispatchedAt ?? ledger.action.lastAttemptAt,
    },
    explanation: {
      ...ledger.explanation,
      bindingConstraints: buildBindingConstraints(
        ledger,
        approvals,
        action?.status,
      ),
    },
  };
}

function cancelPendingActionForRejection(
  action: ActionDispatchRecord | null,
  occurredAt: string,
  comment: string | undefined,
): ActionDispatchRecord | null {
  if (!action || action.status !== "pending") {
    return action;
  }

  return appendActionDispatchAttempt(action, {
    attemptNumber: action.attempts.length + 1,
    status: "canceled",
    dispatchedAt: occurredAt,
    errorCode: "APPROVAL_REJECTED",
    errorMessage: comment ?? "Approval rejected before dispatch.",
  });
}

function applyApprovalDecision(
  record: ApprovalRecord,
  input: ApprovalDecisionInput,
  occurredAt: string,
): ApprovalRecord {
  const comment = normalizeComment(input.request.comment);
  const justificationRequired = requiresApprovalJustification(record);

  try {
    return transitionApprovalRecord(record, {
      nextStatus: input.request.outcome,
      actorId: input.actorUserId,
      actorRole: input.actorRole,
      occurredAt,
      decision: {
        outcome: input.request.outcome,
        actorUserId: input.actorUserId,
        actorRole: input.actorRole,
        reasonCode: normalizeReasonCode(input.request.reasonCode),
        comment,
        decidedAt: occurredAt,
      },
      justificationRequired,
    });
  } catch (error) {
    throw new PersistenceError(
      error instanceof Error ? error.message : "Approval decision is invalid.",
      400,
      "INVALID_APPROVAL_DECISION",
    );
  }
}

function cancelSiblingApproval(
  record: ApprovalRecord,
  actorUserId: string,
  actorRole: string,
  occurredAt: string,
): ApprovalRecord {
  try {
    return transitionApprovalRecord(record, {
      nextStatus: "canceled",
      actorId: actorUserId,
      actorRole,
      occurredAt,
    });
  } catch (error) {
    throw new PersistenceError(
      error instanceof Error
        ? error.message
        : "Approval cancellation is invalid.",
      400,
      "INVALID_APPROVAL_CANCELLATION",
    );
  }
}

export async function decidePersistentApproval(
  input: ApprovalDecisionInput,
): Promise<ApprovalDecisionResponse> {
  assertOrganizationId(input.organizationId);
  assertApprovalId(input.approvalId);
  const actorUserId = normalizeActorUserId(input.actorUserId);
  const actorRole = normalizeActorRole(input.actorRole);
  const occurredAt = toOccurredAt(input.request.decidedAt);
  const normalizedInput: ApprovalDecisionInput = {
    ...input,
    actorUserId,
    actorRole,
  };

  try {
    return await withTransaction(async (client) => {
      const currentApproval = await loadApprovalById(
        client,
        input.organizationId,
        input.approvalId,
      );
      const approvals = await loadApprovalsByRecommendation(
        client,
        input.organizationId,
        currentApproval.recommendationId,
      );

      const decidedApproval = applyApprovalDecision(
        currentApproval,
        normalizedInput,
        occurredAt,
      );
      const nextApprovals = approvals.map((record) => {
        if (record.approvalId === decidedApproval.approvalId) {
          return decidedApproval;
        }
        if (
          input.request.outcome === "rejected" &&
          record.status === "requested"
        ) {
          return cancelSiblingApproval(
            record,
            actorUserId,
            actorRole,
            occurredAt,
          );
        }
        return record;
      });

      for (const approval of nextApprovals) {
        await saveApprovalRecord(
          client,
          input.organizationId,
          approval,
          occurredAt,
        );
      }

      let action = await loadActionByRecommendation(
        client,
        input.organizationId,
        currentApproval.recommendationId,
      );
      if (input.request.outcome === "rejected") {
        action = cancelPendingActionForRejection(
          action,
          occurredAt,
          normalizeComment(input.request.comment),
        );
        if (action) {
          await saveActionRecord(
            client,
            input.organizationId,
            action,
            occurredAt,
          );
        }
      }

      const ledger = await loadLatestLedgerByRecommendation(
        client,
        input.organizationId,
        currentApproval.recommendationId,
      );
      let nextLedgerStatus: LedgerEntry["status"] | null = null;
      if (ledger) {
        const syncedLedger = syncLedgerDecisionState(
          ledger,
          nextApprovals,
          action,
        );
        nextLedgerStatus = syncedLedger.status;
        await saveLedgerRecord(
          client,
          input.organizationId,
          syncedLedger,
          occurredAt,
        );
      }

      const allApprovalsGranted =
        nextApprovals.length > 0 &&
        nextApprovals.every((record) => record.status === "granted");
      const allApprovalsResolved = nextApprovals.every(
        (record) => record.status !== "requested",
      );

      return {
        approval: buildApprovalInboxItem(decidedApproval, occurredAt),
        recommendationId: decidedApproval.recommendationId,
        allApprovalsGranted,
        allApprovalsResolved,
        actionStatus: action?.status ?? null,
        ledgerStatus: nextLedgerStatus,
      };
    });
  } catch (error) {
    throw mapPersistenceError(
      error,
      "APPROVAL_DECISION_FAILED",
      "Approval decision persistence failed.",
    );
  }
}
