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
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    workspace_id TEXT NULL,
    contract_id TEXT NOT NULL,
    contract_version INTEGER NOT NULL CHECK (contract_version >= 1),
    pack TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'testing', 'approved', 'published', 'archived')),
    payload JSONB NOT NULL,
    created_by TEXT NULL,
    updated_by TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, contract_id, contract_version)
  );
`;
const CREATE_CONTRACT_SCOPE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_decision_contract_versions_scope
  ON decision_contract_versions (
    organization_id,
    workspace_id,
    status,
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
    created_at DESC
  );
`;
const UPSERT_CONTRACT_VERSION_SQL = `
  INSERT INTO decision_contract_versions (
    id,
    organization_id,
    workspace_id,
    contract_id,
    contract_version,
    pack,
    status,
    payload,
    created_by,
    updated_by,
    created_at,
    updated_at
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  ON CONFLICT (organization_id, contract_id, contract_version)
  DO UPDATE SET
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
    await this.pool.query(CREATE_CONTRACT_SCOPE_INDEX_SQL);
    await this.pool.query(CREATE_CONTRACT_AUDIT_TABLE_SQL);
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
      SELECT *
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
            entry.metadata.organizationId === organizationId &&
            entry.metadata.contractId === contractId,
        )
        .map((entry) => cloneValue(entry));
    }

    const result = await this.pool.query<DbAuditRow>(
      `
      SELECT *
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
      stored.id,
      stored.organizationId,
      stored.workspaceId,
      stored.contract.contractId,
      stored.contract.contractVersion,
      stored.contract.pack,
      stored.contract.status,
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
