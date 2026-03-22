import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import type { DecisionContract } from "@praedixa/shared-types/domain";
import type { DecisionContractStudioAuditEntryResponse } from "@praedixa/shared-types/api";

import {
  DecisionContractRuntimeError,
  cloneValue,
  normalizeOptionalText,
} from "./decision-contract-runtime-support.js";

type DbContractRow = {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  contract_id: string;
  contract_version: number;
  payload: DecisionContract;
  created_at: string | Date;
  updated_at: string | Date;
};

type DbAuditRow = {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  contract_id: string;
  contract_version: number | null;
  action: string;
  actor_user_id: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string | Date;
};

export interface StoredContract {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  contract: DecisionContract;
}

const CREATE_CONTRACT_VERSIONS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS decision_contract_versions (
    organization_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    contract_version INTEGER NOT NULL CHECK (contract_version >= 1),
    id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'testing', 'approved', 'published', 'archived')),
    pack TEXT NOT NULL CHECK (pack IN ('coverage', 'flow', 'allocation', 'core')),
    workspace_id TEXT NULL,
    payload JSONB NOT NULL,
    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, contract_id, contract_version)
  );
`;
const CREATE_CONTRACT_ID_INDEX_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_decision_contract_versions_id
  ON decision_contract_versions (id);
`;
const CREATE_CONTRACT_SCOPE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_decision_contract_versions_scope
  ON decision_contract_versions (
    organization_id,
    workspace_id,
    status,
    pack,
    updated_at DESC
  );
`;
const CREATE_CONTRACT_AUDIT_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS decision_contract_audit (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    workspace_id TEXT NULL,
    contract_id TEXT NOT NULL,
    contract_version INTEGER NULL,
    action TEXT NOT NULL,
    actor_user_id TEXT NULL,
    reason TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;
const CREATE_CONTRACT_AUDIT_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_decision_contract_audit_scope
  ON decision_contract_audit (
    organization_id,
    contract_id,
    contract_version,
    created_at DESC
  );
`;
const RECONCILE_CONTRACT_VERSIONS_SCHEMA_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'decision_contract_versions'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_versions'
          AND column_name = 'contract_json'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_versions'
          AND column_name = 'payload'
      ) THEN
        ALTER TABLE decision_contract_versions
          RENAME COLUMN contract_json TO payload;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_versions'
          AND column_name = 'organization_id'
          AND data_type = 'uuid'
      ) THEN
        ALTER TABLE decision_contract_versions
          ALTER COLUMN organization_id TYPE TEXT
          USING organization_id::text;
      END IF;

      ALTER TABLE decision_contract_versions
        ADD COLUMN IF NOT EXISTS id TEXT,
        ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
        ADD COLUMN IF NOT EXISTS payload JSONB,
        ADD COLUMN IF NOT EXISTS created_by TEXT NULL,
        ADD COLUMN IF NOT EXISTS updated_by TEXT NULL,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
    END IF;
  END $$;
`;
const BACKFILL_CONTRACT_VERSIONS_SCHEMA_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'decision_contract_versions'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_versions'
          AND column_name = 'contract_json'
      ) THEN
        EXECUTE '
          UPDATE decision_contract_versions
          SET payload = COALESCE(payload, contract_json)
          WHERE payload IS NULL
        ';
      END IF;

      UPDATE decision_contract_versions
      SET payload = '{}'::jsonb
      WHERE payload IS NULL;

      UPDATE decision_contract_versions
      SET workspace_id = NULLIF(payload ->> ''workspaceId'', '')
      WHERE workspace_id IS NULL;

      UPDATE decision_contract_versions
      SET created_by = NULLIF(payload #>> ''{audit,createdBy}'', '')
      WHERE created_by IS NULL;

      UPDATE decision_contract_versions
      SET updated_by = NULLIF(payload #>> ''{audit,updatedBy}'', '')
      WHERE updated_by IS NULL;

      UPDATE decision_contract_versions
      SET created_at = COALESCE(
        created_at,
        NULLIF(payload #>> ''{audit,createdAt}'', '''')::timestamptz,
        updated_at,
        NOW()
      )
      WHERE created_at IS NULL;

      UPDATE decision_contract_versions
      SET updated_at = COALESCE(
        updated_at,
        NULLIF(payload #>> ''{audit,updatedAt}'', '''')::timestamptz,
        created_at,
        NOW()
      )
      WHERE updated_at IS NULL;

      UPDATE decision_contract_versions
      SET id = organization_id || '':''
        || contract_id
        || '':v''
        || contract_version::text
      WHERE id IS NULL OR id = '''';

      ALTER TABLE decision_contract_versions
        ALTER COLUMN id SET NOT NULL,
        ALTER COLUMN payload SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL,
        ALTER COLUMN updated_at SET NOT NULL;
    END IF;
  END $$;
`;
const RECONCILE_CONTRACT_AUDIT_SCHEMA_SQL = `
  DO $$
  DECLARE
    constraint_name TEXT;
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'decision_contract_audit'
    ) THEN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_audit'
          AND column_name = 'audit_id'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_audit'
          AND column_name = 'id'
      ) THEN
        ALTER TABLE decision_contract_audit
          RENAME COLUMN audit_id TO id;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_audit'
          AND column_name = 'event_type'
      ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_audit'
          AND column_name = 'action'
      ) THEN
        ALTER TABLE decision_contract_audit
          RENAME COLUMN event_type TO action;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'decision_contract_audit'
          AND column_name = 'organization_id'
          AND data_type = 'uuid'
      ) THEN
        ALTER TABLE decision_contract_audit
          ALTER COLUMN organization_id TYPE TEXT
          USING organization_id::text;
      END IF;

      FOR constraint_name IN
        SELECT c.conname
        FROM pg_constraint c
        INNER JOIN pg_class t
          ON t.oid = c.conrelid
        INNER JOIN pg_namespace n
          ON n.oid = t.relnamespace
        WHERE n.nspname = 'public'
          AND t.relname = 'decision_contract_audit'
          AND c.contype = 'c'
      LOOP
        EXECUTE format(
          'ALTER TABLE decision_contract_audit DROP CONSTRAINT %I',
          constraint_name
        );
      END LOOP;

      ALTER TABLE decision_contract_audit
        ADD COLUMN IF NOT EXISTS workspace_id TEXT NULL,
        ADD COLUMN IF NOT EXISTS action TEXT,
        ADD COLUMN IF NOT EXISTS actor_user_id TEXT NULL,
        ADD COLUMN IF NOT EXISTS reason TEXT,
        ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
    END IF;
  END $$;
`;
const BACKFILL_CONTRACT_AUDIT_SCHEMA_SQL = `
  DO $$
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'decision_contract_audit'
    ) THEN
      UPDATE decision_contract_audit
      SET workspace_id = COALESCE(
        workspace_id,
        NULLIF(metadata ->> 'workspaceId', '')
      )
      WHERE workspace_id IS NULL;

      UPDATE decision_contract_audit
      SET action = COALESCE(NULLIF(action, ''), 'legacy_audit_entry')
      WHERE action IS NULL OR action = '';

      UPDATE decision_contract_audit
      SET reason = COALESCE(NULLIF(reason, ''), metadata ->> 'reason', action)
      WHERE reason IS NULL OR reason = '';

      UPDATE decision_contract_audit
      SET created_at = COALESCE(created_at, NOW())
      WHERE created_at IS NULL;

      ALTER TABLE decision_contract_audit
        ALTER COLUMN action SET NOT NULL,
        ALTER COLUMN reason SET NOT NULL,
        ALTER COLUMN created_at SET NOT NULL;
    END IF;
  END $$;
`;
const UPSERT_CONTRACT_VERSION_SQL = `
  INSERT INTO decision_contract_versions (
    organization_id,
    contract_id,
    contract_version,
    id,
    pack,
    status,
    workspace_id,
    payload,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  ON CONFLICT (organization_id, contract_id, contract_version)
  DO UPDATE SET
    id = decision_contract_versions.id,
    workspace_id = EXCLUDED.workspace_id,
    pack = EXCLUDED.pack,
    status = EXCLUDED.status,
    payload = EXCLUDED.payload,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at
`;

function toIso(value: string | Date): string {
  return typeof value === "string"
    ? new Date(value).toISOString()
    : value.toISOString();
}

function toStoredContract(row: DbContractRow): StoredContract {
  return {
    id: row.id,
    organizationId: row.organization_id,
    workspaceId: row.workspace_id,
    contract: cloneValue(row.payload),
  };
}

function toAuditEntry(
  row: DbAuditRow,
): DecisionContractStudioAuditEntryResponse {
  return {
    auditId: row.id,
    action: row.action,
    actorUserId: row.actor_user_id,
    targetContractVersion: row.contract_version,
    reason: row.reason,
    createdAt: toIso(row.created_at),
    metadata: cloneValue(row.metadata ?? {}),
  };
}

export class DecisionContractRuntimeStore {
  private readonly pool: Pool | null;

  private readonly schemaReady: Promise<void>;

  private readonly memoryContracts: StoredContract[] = [];

  private readonly memoryAudit: DecisionContractStudioAuditEntryResponse[] = [];

  constructor(databaseUrl: string | null) {
    this.pool = databaseUrl
      ? new Pool({ connectionString: databaseUrl })
      : null;
    this.schemaReady = this.ensureSchema();
  }

  private async ensureSchema(): Promise<void> {
    if (!this.pool) {
      return;
    }

    await this.pool.query(CREATE_CONTRACT_VERSIONS_TABLE_SQL);
    await this.pool.query(RECONCILE_CONTRACT_VERSIONS_SCHEMA_SQL);
    await this.pool.query(BACKFILL_CONTRACT_VERSIONS_SCHEMA_SQL);
    await this.pool.query(CREATE_CONTRACT_ID_INDEX_SQL);
    await this.pool.query(CREATE_CONTRACT_SCOPE_INDEX_SQL);
    await this.pool.query(CREATE_CONTRACT_AUDIT_TABLE_SQL);
    await this.pool.query(RECONCILE_CONTRACT_AUDIT_SCHEMA_SQL);
    await this.pool.query(BACKFILL_CONTRACT_AUDIT_SCHEMA_SQL);
    await this.pool.query(CREATE_CONTRACT_AUDIT_INDEX_SQL);
  }

  private async ready(): Promise<void> {
    await this.schemaReady;
  }

  async listStoredContracts(
    organizationId: string,
    workspaceId?: string | null,
  ): Promise<StoredContract[]> {
    await this.ready();
    const normalizedWorkspaceId = normalizeOptionalText(workspaceId);
    if (!this.pool) {
      return this.memoryContracts
        .filter((item) => item.organizationId === organizationId)
        .filter((item) =>
          workspaceId === undefined
            ? true
            : item.workspaceId === normalizedWorkspaceId,
        )
        .map((item) => ({
          ...item,
          contract: cloneValue(item.contract),
        }));
    }

    const result = await this.pool.query<DbContractRow>(
      `
      SELECT
        id,
        organization_id,
        workspace_id,
        contract_id,
        contract_version,
        payload,
        created_at,
        updated_at
      FROM decision_contract_versions
      WHERE organization_id = $1
        AND ($2::text IS NULL OR workspace_id IS NOT DISTINCT FROM $2::text)
      ORDER BY updated_at DESC, contract_id ASC, contract_version DESC
      `,
      [
        organizationId,
        workspaceId === undefined ? null : normalizedWorkspaceId,
      ],
    );
    return result.rows.map(toStoredContract);
  }

  async listAuditEntries(
    organizationId: string,
    contractId: string,
  ): Promise<DecisionContractStudioAuditEntryResponse[]> {
    await this.ready();
    if (!this.pool) {
      return this.memoryAudit
        .filter(
          (entry) =>
            entry.metadata["organizationId"] === organizationId &&
            entry.metadata["contractId"] === contractId,
        )
        .map((entry) => cloneValue(entry));
    }

    const result = await this.pool.query<DbAuditRow>(
      `
      SELECT
        id,
        organization_id,
        workspace_id,
        contract_id,
        contract_version,
        action,
        actor_user_id,
        reason,
        metadata,
        created_at
      FROM decision_contract_audit
      WHERE organization_id = $1
        AND contract_id = $2
      ORDER BY created_at DESC
      LIMIT 50
      `,
      [organizationId, contractId],
    );
    return result.rows.map(toAuditEntry);
  }

  findStoredContract(
    items: readonly StoredContract[],
    contractId: string,
    contractVersion: number,
  ): StoredContract {
    const item = items.find(
      (candidate) =>
        candidate.contract.contractId === contractId &&
        candidate.contract.contractVersion === contractVersion,
    );
    if (item) {
      return item;
    }
    throw new DecisionContractRuntimeError(
      "DECISION_CONTRACT_NOT_FOUND",
      `DecisionContract ${contractId} v${contractVersion} was not found.`,
      404,
    );
  }

  findLatestVersion(
    items: readonly StoredContract[],
    contractId: string,
  ): number {
    const versions = items
      .filter((item) => item.contract.contractId === contractId)
      .map((item) => item.contract.contractVersion);
    return versions.length > 0 ? Math.max(...versions) : 0;
  }

  async appendAuditEntry(
    entry: DecisionContractStudioAuditEntryResponse,
    organizationId: string,
    workspaceId: string | null,
    contractId: string,
  ): Promise<void> {
    if (!this.pool) {
      this.memoryAudit.unshift({
        ...entry,
        metadata: {
          ...entry.metadata,
          organizationId,
          workspaceId,
          contractId,
        },
      });
      return;
    }

    await this.pool.query(
      `
      INSERT INTO decision_contract_audit (
        id,
        organization_id,
        workspace_id,
        contract_id,
        contract_version,
        action,
        actor_user_id,
        reason,
        metadata,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `,
      [
        entry.auditId,
        organizationId,
        workspaceId,
        contractId,
        entry.targetContractVersion ?? null,
        entry.action,
        entry.actorUserId ?? null,
        entry.reason,
        entry.metadata,
        entry.createdAt,
      ],
    );
  }

  async persistStoredContract(contract: DecisionContract): Promise<void> {
    const stored: StoredContract = {
      id: randomUUID(),
      organizationId: contract.organizationId ?? "",
      workspaceId: normalizeOptionalText(contract.workspaceId),
      contract: cloneValue(contract),
    };

    if (!this.pool) {
      const index = this.memoryContracts.findIndex(
        (item) =>
          item.organizationId === stored.organizationId &&
          item.contract.contractId === stored.contract.contractId &&
          item.contract.contractVersion === stored.contract.contractVersion,
      );
      if (index >= 0) {
        this.memoryContracts[index] = stored;
      } else {
        this.memoryContracts.unshift(stored);
      }
      return;
    }

    await this.pool.query(UPSERT_CONTRACT_VERSION_SQL, [
      stored.organizationId,
      stored.contract.contractId,
      stored.contract.contractVersion,
      stored.id,
      stored.contract.pack,
      stored.contract.status,
      stored.workspaceId,
      stored.contract,
      stored.contract.audit.createdBy,
      stored.contract.audit.updatedBy,
      stored.contract.audit.createdAt,
      stored.contract.audit.updatedAt,
    ]);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }
}
