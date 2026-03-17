import type { PoolClient, QueryResultRow } from "pg";

import type {
  ActionDispatchRecord,
  ApprovalRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";
import type {
  ActionDispatchDetailResponse,
  ApprovalInboxRequest,
  ApprovalInboxResponse,
  LedgerDetailRequest,
  LedgerDetailResponse,
} from "@praedixa/shared-types/api";

import { buildApprovalInboxResponse } from "./approval-inbox.js";
import { resolveActionDispatchDetail } from "./action-dispatch-detail.js";
import {
  buildActionDispatchRecord,
  buildApprovalRecords,
  buildLedgerEntry,
  type DecisionOpsRuntimeSeedInput,
} from "./decisionops-runtime-seed-records.js";
import { resolveLedgerDetail } from "./ledger-detail.js";
import {
  PersistenceError,
  isUuidString,
  mapPersistenceError,
  queryRows,
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

function assertOrganizationId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "organizationId must be a UUID.",
      400,
      "INVALID_ORGANIZATION_ID",
    );
  }
}

function assertRecommendationId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "recommendationId must be a UUID.",
      400,
      "INVALID_RECOMMENDATION_ID",
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

function assertLedgerId(value: string): void {
  if (!isUuidString(value)) {
    throw new PersistenceError(
      "ledgerId must be a UUID.",
      400,
      "INVALID_LEDGER_ID",
    );
  }
}

function asPlainObject<T>(value: unknown, errorCode: string, label: string): T {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    throw new PersistenceError(
      `${label} is invalid in persistent storage.`,
      500,
      errorCode,
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

async function insertApprovalRecords(
  client: PoolClient,
  organizationId: string,
  approvals: readonly ApprovalRecord[],
): Promise<void> {
  for (const approval of approvals) {
    await client.query(
      `
        INSERT INTO decision_approvals (
          organization_id,
          approval_id,
          recommendation_id,
          site_id,
          contract_id,
          contract_version,
          status,
          approver_role,
          rule_step_order,
          requested_at,
          deadline_at,
          record_json
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::uuid,
          $4,
          $5,
          $6::int,
          $7::approvalruntimestatus,
          $8,
          $9::int,
          $10::timestamptz,
          $11::timestamptz,
          $12::jsonb
        )
      `,
      [
        organizationId,
        approval.approvalId,
        approval.recommendationId,
        approval.scope.selector.ids?.[0] ?? null,
        approval.contractId,
        approval.contractVersion,
        approval.status,
        approval.rule.approverRole,
        approval.rule.stepOrder,
        approval.requestedAt,
        approval.deadlineAt ?? null,
        JSON.stringify(approval),
      ],
    );
  }
}

const INSERT_ACTION_DISPATCH_SQL = `
  INSERT INTO action_dispatches (
    organization_id,
    action_id,
    recommendation_id,
    approval_id,
    site_id,
    contract_id,
    contract_version,
    status,
    dispatch_mode,
    destination_system,
    destination_type,
    target_resource_id,
    idempotency_key,
    record_json
  )
  VALUES (
    $1::uuid,
    $2::uuid,
    $3::uuid,
    $4::uuid,
    $5,
    $6,
    $7::int,
    $8::actiondispatchruntimestatus,
    $9::actiondispatchruntimemode,
    $10,
    $11,
    $12,
    $13,
    $14::jsonb
  )
`;

function buildActionDispatchInsertValues(
  organizationId: string,
  action: ActionDispatchRecord,
) {
  return [
    organizationId,
    action.actionId,
    action.recommendationId,
    action.approvalId ?? null,
    action.destination.targetResourceId ?? null,
    action.contractId,
    action.contractVersion,
    action.status,
    action.dispatchMode,
    action.destination.system,
    action.destination.targetResourceType,
    action.destination.targetResourceId ?? null,
    action.idempotencyKey,
    JSON.stringify(action),
  ];
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "23505",
  );
}

async function insertActionDispatch(
  client: PoolClient,
  organizationId: string,
  action: ActionDispatchRecord,
): Promise<void> {
  try {
    await client.query(
      INSERT_ACTION_DISPATCH_SQL,
      buildActionDispatchInsertValues(organizationId, action),
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PersistenceError(
        `Idempotency key ${action.idempotencyKey} is already assigned to another dispatch.`,
        409,
        "ACTION_DISPATCH_IDEMPOTENCY_CONFLICT",
      );
    }
    throw error;
  }
}

async function assertActionDispatchIdempotencyAvailable(
  client: PoolClient,
  organizationId: string,
  action: ActionDispatchRecord,
): Promise<void> {
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
        AND idempotency_key = $2
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [organizationId, action.idempotencyKey],
  );

  const existingRow = result.rows[0];
  if (!existingRow) {
    return;
  }

  const existing = mapActionRow(existingRow);
  if (existing.actionId !== action.actionId) {
    throw new PersistenceError(
      `Idempotency key ${action.idempotencyKey} is already assigned to action ${existing.actionId}.`,
      409,
      "ACTION_DISPATCH_IDEMPOTENCY_CONFLICT",
    );
  }
}

async function insertLedgerEntry(
  client: PoolClient,
  organizationId: string,
  ledger: LedgerEntry,
): Promise<void> {
  await client.query(
    `
      INSERT INTO decision_ledger_entries (
        organization_id,
        ledger_id,
        revision,
        recommendation_id,
        action_id,
        site_id,
        contract_id,
        contract_version,
        status,
        validation_status,
        opened_at,
        closed_at,
        record_json
      )
      VALUES (
        $1::uuid,
        $2::uuid,
        $3::int,
        $4::uuid,
        $5::uuid,
        $6,
        $7,
        $8::int,
        $9::ledgerruntimestatus,
        $10::ledgerruntimevalidationstatus,
        $11::timestamptz,
        $12::timestamptz,
        $13::jsonb
      )
    `,
    [
      organizationId,
      ledger.ledgerId,
      ledger.revision,
      ledger.recommendationId,
      ledger.action.actionId,
      ledger.scope.selector.ids?.[0] ?? null,
      ledger.contractId,
      ledger.contractVersion,
      ledger.status,
      ledger.roi.validationStatus,
      ledger.openedAt,
      ledger.closedAt ?? null,
      JSON.stringify(ledger),
    ],
  );
}

export async function initializePersistentDecisionOpsRuntime(
  client: PoolClient,
  input: DecisionOpsRuntimeSeedInput,
): Promise<void> {
  assertOrganizationId(input.organizationId);
  assertRecommendationId(input.recommendationId);

  const approvals = buildApprovalRecords(input);
  const action = buildActionDispatchRecord(input, approvals[0]?.approvalId);
  const ledger = buildLedgerEntry(input, action);

  try {
    await assertActionDispatchIdempotencyAvailable(
      client,
      input.organizationId,
      action,
    );
    await insertApprovalRecords(client, input.organizationId, approvals);
    await insertActionDispatch(client, input.organizationId, action);
    await insertLedgerEntry(client, input.organizationId, ledger);
  } catch (error) {
    throw mapPersistenceError(
      error,
      "DECISIONOPS_RUNTIME_INIT_FAILED",
      "DecisionOps runtime persistence failed.",
    );
  }
}

export async function listPersistentApprovalInbox(input: {
  organizationId: string;
  request?: ApprovalInboxRequest;
}): Promise<ApprovalInboxResponse> {
  assertOrganizationId(input.organizationId);
  const rows = await queryRows<DecisionApprovalRow>(
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
      ORDER BY requested_at DESC, rule_step_order ASC, approval_id DESC
    `,
    [input.organizationId],
  );

  return buildApprovalInboxResponse(rows.map(mapApprovalRow), input.request);
}

export async function getPersistentActionDispatchDetail(input: {
  organizationId: string;
  actionId: string;
}): Promise<ActionDispatchDetailResponse> {
  assertOrganizationId(input.organizationId);
  assertActionId(input.actionId);

  const rows = await queryRows<ActionDispatchRow>(
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
        AND action_id = $2::uuid
      ORDER BY created_at DESC, id DESC
    `,
    [input.organizationId, input.actionId],
  );

  if (rows.length === 0) {
    throw new PersistenceError(
      `Action dispatch ${input.actionId} was not found.`,
      404,
      "ACTION_DISPATCH_NOT_FOUND",
    );
  }

  return resolveActionDispatchDetail(rows.map(mapActionRow), {
    actionId: input.actionId,
  });
}

export async function getPersistentLedgerDetail(input: {
  organizationId: string;
  request: LedgerDetailRequest;
}): Promise<LedgerDetailResponse> {
  assertOrganizationId(input.organizationId);
  assertLedgerId(input.request.ledgerId);
  if (
    input.request.revision != null &&
    (!Number.isInteger(input.request.revision) || input.request.revision <= 0)
  ) {
    throw new PersistenceError(
      "revision must be a positive integer.",
      400,
      "INVALID_LEDGER_REVISION",
    );
  }

  const rows = await queryRows<LedgerEntryRow>(
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
        AND ledger_id = $2::uuid
      ORDER BY revision ASC
    `,
    [input.organizationId, input.request.ledgerId],
  );

  if (rows.length === 0) {
    throw new PersistenceError(
      `Ledger ${input.request.ledgerId} was not found.`,
      404,
      "LEDGER_NOT_FOUND",
    );
  }

  return resolveLedgerDetail(rows.map(mapLedgerRow), input.request);
}
