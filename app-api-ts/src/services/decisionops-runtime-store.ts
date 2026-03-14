import type { PoolClient, QueryResultRow } from "pg";

import type {
  ActionDispatchRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import { PersistenceError } from "./persistence.js";

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

const INSERT_LEDGER_RECORD_SQL = `
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
`;

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

function toLedgerInsertParams(
  organizationId: string,
  ledger: LedgerEntry,
): [
  string,
  string,
  number,
  string,
  string,
  string | null,
  string,
  number,
  LedgerEntry["status"],
  LedgerEntry["roi"]["validationStatus"],
  string,
  string | null,
  string,
] {
  return [
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
  ];
}

export async function loadActionById(
  client: PoolClient,
  organizationId: string,
  actionId: string,
): Promise<ActionDispatchRecord> {
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
        AND action_id = $2::uuid
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [organizationId, actionId],
  );

  const row = result.rows[0];
  if (!row) {
    throw new PersistenceError(
      `Action dispatch ${actionId} was not found.`,
      404,
      "ACTION_DISPATCH_NOT_FOUND",
    );
  }

  return mapActionRow(row);
}

export async function loadLatestLedgerByRecommendation(
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

export async function loadLedgerHistoryById(
  client: PoolClient,
  organizationId: string,
  ledgerId: string,
): Promise<LedgerEntry[]> {
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
        AND ledger_id = $2::uuid
      ORDER BY revision ASC, created_at ASC, id ASC
    `,
    [organizationId, ledgerId],
  );

  return result.rows.map(mapLedgerRow);
}

export async function saveActionRecord(
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

export async function saveLedgerRecord(
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

export async function insertLedgerRecord(
  client: PoolClient,
  organizationId: string,
  ledger: LedgerEntry,
): Promise<void> {
  await client.query(
    INSERT_LEDGER_RECORD_SQL,
    toLedgerInsertParams(organizationId, ledger),
  );
}
