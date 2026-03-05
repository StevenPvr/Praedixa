import { randomUUID } from "node:crypto";

import { CONNECTOR_CATALOG } from "./catalog.js";
import type {
  ConnectionStatus,
  ConnectorConnection,
  CreateConnectionInput,
  SyncRun,
  SyncStatus,
  SyncTriggerType,
} from "./types.js";

type RunUpdate = {
  status: SyncStatus;
  recordsFetched?: number;
  recordsWritten?: number;
  errorClass?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
};

export class InMemoryConnectorStore {
  private readonly connections = new Map<string, ConnectorConnection>();
  private readonly runs = new Map<string, SyncRun>();

  listCatalog() {
    return CONNECTOR_CATALOG;
  }

  listConnections(
    organizationId: string,
    vendor?: string | null,
  ): ConnectorConnection[] {
    const rows = Array.from(this.connections.values()).filter((connection) => {
      if (connection.organizationId !== organizationId) {
        return false;
      }
      if (vendor != null && vendor.length > 0 && connection.vendor !== vendor) {
        return false;
      }
      return true;
    });
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createConnection(
    organizationId: string,
    input: CreateConnectionInput,
  ): ConnectorConnection {
    const now = new Date().toISOString();
    const connection: ConnectorConnection = {
      id: randomUUID(),
      organizationId,
      vendor: input.vendor,
      displayName: input.displayName.trim(),
      status: "pending",
      authMode: input.authMode,
      config: input.config ?? {},
      secretRef: input.secretRef ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.connections.set(connection.id, connection);
    return connection;
  }

  getConnection(
    organizationId: string,
    connectionId: string,
  ): ConnectorConnection | null {
    const row = this.connections.get(connectionId);
    if (row == null || row.organizationId !== organizationId) {
      return null;
    }
    return row;
  }

  updateConnectionStatus(
    organizationId: string,
    connectionId: string,
    status: ConnectionStatus,
  ): ConnectorConnection | null {
    const row = this.getConnection(organizationId, connectionId);
    if (row == null) {
      return null;
    }
    const next: ConnectorConnection = {
      ...row,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.connections.set(connectionId, next);
    return next;
  }

  createSyncRun(
    organizationId: string,
    connectionId: string,
    triggerType: SyncTriggerType,
  ): SyncRun {
    const now = new Date().toISOString();
    const run: SyncRun = {
      id: randomUUID(),
      organizationId,
      connectionId,
      triggerType,
      status: "queued",
      recordsFetched: 0,
      recordsWritten: 0,
      errorClass: null,
      errorMessage: null,
      startedAt: null,
      endedAt: null,
      createdAt: now,
    };
    this.runs.set(run.id, run);
    return run;
  }

  updateSyncRun(
    organizationId: string,
    runId: string,
    patch: RunUpdate,
  ): SyncRun | null {
    const previous = this.runs.get(runId);
    if (previous == null || previous.organizationId !== organizationId) {
      return null;
    }
    const next: SyncRun = {
      ...previous,
      status: patch.status,
      recordsFetched: patch.recordsFetched ?? previous.recordsFetched,
      recordsWritten: patch.recordsWritten ?? previous.recordsWritten,
      errorClass: patch.errorClass ?? previous.errorClass,
      errorMessage: patch.errorMessage ?? previous.errorMessage,
      startedAt: patch.startedAt ?? previous.startedAt,
      endedAt: patch.endedAt ?? previous.endedAt,
    };
    this.runs.set(runId, next);
    return next;
  }

  getSyncRun(organizationId: string, runId: string): SyncRun | null {
    const row = this.runs.get(runId);
    if (row == null || row.organizationId !== organizationId) {
      return null;
    }
    return row;
  }

  listSyncRuns(
    organizationId: string,
    connectionId?: string | null,
  ): SyncRun[] {
    const rows = Array.from(this.runs.values()).filter((run) => {
      if (run.organizationId !== organizationId) {
        return false;
      }
      if (
        connectionId != null &&
        connectionId.length > 0 &&
        run.connectionId !== connectionId
      ) {
        return false;
      }
      return true;
    });
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
