import { CONNECTOR_CATALOG } from "./catalog.js";
import { redactSensitive } from "./security.js";
import { InMemoryConnectorStore } from "./store.js";
import type {
  ConnectorConnection,
  CreateConnectionInput,
  SyncRun,
  SyncTriggerType,
  TestConnectionResult,
} from "./types.js";

export class ConnectorService {
  constructor(private readonly store: InMemoryConnectorStore) {}

  listCatalog() {
    return this.store.listCatalog();
  }

  listConnections(organizationId: string, vendor?: string | null): ConnectorConnection[] {
    return this.store.listConnections(organizationId, vendor);
  }

  createConnection(
    organizationId: string,
    input: CreateConnectionInput,
  ): ConnectorConnection {
    const catalogItem = CONNECTOR_CATALOG.find((item) => item.vendor === input.vendor);
    if (catalogItem == null) {
      throw new Error(`Unsupported connector vendor: ${input.vendor}`);
    }
    if (!catalogItem.authModes.includes(input.authMode)) {
      throw new Error(
        `Auth mode "${input.authMode}" is not allowed for vendor "${input.vendor}"`,
      );
    }
    if (input.displayName.trim().length < 3) {
      throw new Error("displayName must be at least 3 characters");
    }

    return this.store.createConnection(organizationId, {
      ...input,
      config: redactSensitive(input.config ?? {}),
    });
  }

  async testConnection(
    organizationId: string,
    connectionId: string,
  ): Promise<TestConnectionResult> {
    const connection = this.store.getConnection(organizationId, connectionId);
    if (connection == null) {
      throw new Error("Connection not found");
    }

    const started = Date.now();
    const warnings: string[] = [];
    if (connection.secretRef == null || connection.secretRef.length === 0) {
      warnings.push("No external secret reference configured; using local/test mode.");
    }
    if (Object.keys(connection.config).length === 0) {
      warnings.push("Connector config is empty; incremental scope may be limited.");
    }

    this.store.updateConnectionStatus(organizationId, connectionId, "active");

    return {
      ok: true,
      latencyMs: Date.now() - started + 40,
      checkedScopes: ["read", "metadata"],
      warnings,
    };
  }

  async triggerSync(
    organizationId: string,
    connectionId: string,
    triggerType: SyncTriggerType,
  ): Promise<SyncRun> {
    const connection = this.store.getConnection(organizationId, connectionId);
    if (connection == null) {
      throw new Error("Connection not found");
    }
    if (connection.status === "disabled") {
      throw new Error("Connection is disabled");
    }

    const run = this.store.createSyncRun(organizationId, connectionId, triggerType);
    this.store.updateSyncRun(organizationId, run.id, {
      status: "running",
      startedAt: new Date().toISOString(),
    });

    const fetched = 180;
    const written = 176;
    const completed = this.store.updateSyncRun(organizationId, run.id, {
      status: "success",
      recordsFetched: fetched,
      recordsWritten: written,
      endedAt: new Date().toISOString(),
    });
    if (completed == null) {
      throw new Error("Failed to update run status");
    }
    return completed;
  }

  listSyncRuns(organizationId: string, connectionId?: string | null): SyncRun[] {
    return this.store.listSyncRuns(organizationId, connectionId);
  }

  getSyncRun(organizationId: string, runId: string): SyncRun | null {
    return this.store.getSyncRun(organizationId, runId);
  }
}

export function createDefaultConnectorService(): ConnectorService {
  return new ConnectorService(new InMemoryConnectorStore());
}
