import { Pool } from "pg";

import { InMemoryConnectorStore } from "./store.js";
import type {
  AuthorizationSession,
  ConnectionSyncState,
  ConnectorAuditEvent,
  ConnectorConnection,
  IngestCredential,
  IngestRawEvent,
  StoredSecretRecord,
  SyncRun,
} from "./types.js";

type PersistedSnapshot = {
  auditEvents: ConnectorAuditEvent[];
  authorizationSessions: AuthorizationSession[];
  connections: ConnectorConnection[];
  ingestCredentials: IngestCredential[];
  latestSecretRefs: Array<[string, string]>;
  rawEventIndex: Array<[string, string]>;
  rawEvents: IngestRawEvent[];
  runs: SyncRun[];
  syncStates: ConnectionSyncState[];
  syncReplayIndex: Array<[string, string]>;
};

const SNAPSHOT_ROW_ID = "default";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export class PostgresBackedConnectorStore extends InMemoryConnectorStore {
  private readonly pool: Pool;
  private readonly readyPromise: Promise<void>;
  private flushPromise: Promise<void> = Promise.resolve();

  constructor(databaseUrl: string) {
    super();
    this.pool = new Pool({ connectionString: databaseUrl });
    this.readyPromise = this.initialize();
  }

  async ready(): Promise<void> {
    await this.readyPromise;
    await this.flushPromise;
  }

  async close(): Promise<void> {
    await this.ready();
    await this.pool.end();
  }

  private async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS connector_runtime_snapshots (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS connector_secret_records (
        secret_ref TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        connection_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const result = await this.pool.query<{ payload: unknown }>(
      "SELECT payload FROM connector_runtime_snapshots WHERE id = $1",
      [SNAPSHOT_ROW_ID],
    );
    const payload = result.rows[0]?.payload;
    if (payload == null || !isRecord(payload)) {
      return;
    }

    this.hydrate({
      auditEvents: asArray<ConnectorAuditEvent>(payload.auditEvents),
      authorizationSessions: asArray<AuthorizationSession>(
        payload.authorizationSessions,
      ),
      connections: asArray<ConnectorConnection>(payload.connections),
      ingestCredentials: asArray<IngestCredential>(payload.ingestCredentials),
      latestSecretRefs: asArray<[string, string]>(payload.latestSecretRefs),
      rawEventIndex: asArray<[string, string]>(payload.rawEventIndex),
      rawEvents: asArray<IngestRawEvent>(payload.rawEvents),
      runs: asArray<SyncRun>(payload.runs),
      syncStates: asArray<ConnectionSyncState>(payload.syncStates),
      syncReplayIndex: asArray<[string, string]>(payload.syncReplayIndex),
    });

    const secretResult = await this.pool.query<{ payload: StoredSecretRecord }>(
      "SELECT payload FROM connector_secret_records",
    );
    this.secretsByRef.clear();
    for (const row of secretResult.rows) {
      const payload = row.payload;
      if (payload?.secretRef) {
        this.secretsByRef.set(payload.secretRef, payload);
      }
    }
  }

  private hydrate(snapshot: PersistedSnapshot): void {
    this.connections.clear();
    for (const connection of snapshot.connections) {
      this.connections.set(connection.id, connection);
    }

    this.runs.clear();
    for (const run of snapshot.runs) {
      this.runs.set(run.id, run);
    }

    this.syncStates.clear();
    for (const state of snapshot.syncStates) {
      this.syncStates.set(
        `${state.connectionId}::${state.sourceObject}`,
        state,
      );
    }

    this.syncReplayIndex.clear();
    for (const [key, value] of snapshot.syncReplayIndex) {
      this.syncReplayIndex.set(key, value);
    }

    this.latestSecretRefByConnection.clear();
    for (const [connectionId, secretRef] of snapshot.latestSecretRefs) {
      this.latestSecretRefByConnection.set(connectionId, secretRef);
    }

    this.authorizationSessions.clear();
    for (const session of snapshot.authorizationSessions) {
      this.authorizationSessions.set(session.connectionId, session);
    }

    this.auditEvents.splice(
      0,
      this.auditEvents.length,
      ...snapshot.auditEvents,
    );

    this.ingestCredentials.clear();
    for (const credential of snapshot.ingestCredentials) {
      this.ingestCredentials.set(credential.id, credential);
    }

    this.rawEvents.clear();
    for (const rawEvent of snapshot.rawEvents) {
      this.rawEvents.set(rawEvent.id, rawEvent);
    }

    this.rawEventIndex.clear();
    for (const [key, value] of snapshot.rawEventIndex) {
      this.rawEventIndex.set(key, value);
    }
  }

  private snapshot(): PersistedSnapshot {
    return {
      auditEvents: [...this.auditEvents],
      authorizationSessions: Array.from(this.authorizationSessions.values()),
      connections: Array.from(this.connections.values()),
      ingestCredentials: Array.from(this.ingestCredentials.values()),
      latestSecretRefs: Array.from(this.latestSecretRefByConnection.entries()),
      rawEventIndex: Array.from(this.rawEventIndex.entries()),
      rawEvents: Array.from(this.rawEvents.values()),
      runs: Array.from(this.runs.values()),
      syncStates: Array.from(this.syncStates.values()),
      syncReplayIndex: Array.from(this.syncReplayIndex.entries()),
    };
  }

  private scheduleFlush(): void {
    this.flushPromise = this.flushPromise
      .catch(() => undefined)
      .then(async () => {
        await this.readyPromise;
        const payload = this.snapshot();
        await this.pool.query(
          `
            INSERT INTO connector_runtime_snapshots (id, payload, updated_at)
            VALUES ($1, $2::jsonb, now())
            ON CONFLICT (id)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
          `,
          [SNAPSHOT_ROW_ID, JSON.stringify(payload)],
        );
      });
  }

  override createConnection(
    organizationId: string,
    input: Parameters<InMemoryConnectorStore["createConnection"]>[1],
  ): ConnectorConnection {
    const created = super.createConnection(organizationId, input);
    this.scheduleFlush();
    return created;
  }

  override updateConnection(
    organizationId: string,
    connectionId: string,
    patch: Parameters<InMemoryConnectorStore["updateConnection"]>[2],
  ): ConnectorConnection | null {
    const updated = super.updateConnection(organizationId, connectionId, patch);
    if (updated != null) {
      this.scheduleFlush();
    }
    return updated;
  }

  override putSecret(secret: StoredSecretRecord): void {
    super.putSecret(secret);
    this.flushPromise = this.flushPromise
      .catch(() => undefined)
      .then(async () => {
        await this.readyPromise;
        await this.pool.query(
          `
            INSERT INTO connector_secret_records (
              secret_ref,
              organization_id,
              connection_id,
              payload,
              updated_at
            )
            VALUES ($1, $2, $3, $4::jsonb, now())
            ON CONFLICT (secret_ref)
            DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()
          `,
          [
            secret.secretRef,
            secret.organizationId,
            secret.connectionId,
            JSON.stringify(secret),
          ],
        );
      });
    this.scheduleFlush();
  }

  override createAuthorizationSession(session: AuthorizationSession): void {
    super.createAuthorizationSession(session);
    this.scheduleFlush();
  }

  override deleteAuthorizationSession(connectionId: string): void {
    super.deleteAuthorizationSession(connectionId);
    this.scheduleFlush();
  }

  override createAuditEvent(event: ConnectorAuditEvent): ConnectorAuditEvent {
    const created = super.createAuditEvent(event);
    this.scheduleFlush();
    return created;
  }

  override createIngestCredential(
    organizationId: string,
    connectionId: string,
    input: Parameters<InMemoryConnectorStore["createIngestCredential"]>[2],
  ): IngestCredential {
    const credential = super.createIngestCredential(
      organizationId,
      connectionId,
      input,
    );
    this.scheduleFlush();
    return credential;
  }

  override updateIngestCredential(
    organizationId: string,
    connectionId: string,
    credentialId: string,
    patch: Partial<IngestCredential>,
  ): IngestCredential | null {
    const credential = super.updateIngestCredential(
      organizationId,
      connectionId,
      credentialId,
      patch,
    );
    if (credential != null) {
      this.scheduleFlush();
    }
    return credential;
  }

  override createRawEvent(event: IngestRawEvent): {
    created: boolean;
    event: IngestRawEvent;
  } {
    const result = super.createRawEvent(event);
    if (result.created) {
      this.scheduleFlush();
    }
    return result;
  }

  override updateRawEvent(
    organizationId: string,
    connectionId: string,
    eventId: string,
    patch: Partial<IngestRawEvent>,
  ): IngestRawEvent | null {
    const updated = super.updateRawEvent(
      organizationId,
      connectionId,
      eventId,
      patch,
    );
    if (updated != null) {
      this.scheduleFlush();
    }
    return updated;
  }

  override claimRawEvents(
    organizationId: string,
    connectionId: string,
    workerId: string,
    limit: number,
  ): IngestRawEvent[] {
    const claimed = super.claimRawEvents(
      organizationId,
      connectionId,
      workerId,
      limit,
    );
    if (claimed.length > 0) {
      this.scheduleFlush();
    }
    return claimed;
  }

  override createSyncRun(
    organizationId: string,
    connectionId: string,
    triggerType: Parameters<InMemoryConnectorStore["createSyncRun"]>[2],
    idempotencyKey: string,
    patch?: Partial<SyncRun>,
  ) {
    const result = super.createSyncRun(
      organizationId,
      connectionId,
      triggerType,
      idempotencyKey,
      patch,
    );
    if (result.created) {
      this.scheduleFlush();
    }
    return result;
  }

  override claimSyncRuns(
    organizationIds: readonly string[],
    workerId: string,
    limit: number,
    leaseSeconds: number,
  ): SyncRun[] {
    const claimed = super.claimSyncRuns(
      organizationIds,
      workerId,
      limit,
      leaseSeconds,
    );
    if (claimed.length > 0) {
      this.scheduleFlush();
    }
    return claimed;
  }

  override updateSyncRun(
    organizationId: string,
    runId: string,
    patch: Parameters<InMemoryConnectorStore["updateSyncRun"]>[2],
  ): SyncRun | null {
    const updated = super.updateSyncRun(organizationId, runId, patch);
    if (updated != null) {
      this.scheduleFlush();
    }
    return updated;
  }

  override upsertSyncState(
    organizationId: string,
    connectionId: string,
    sourceObject: string,
    patch: Parameters<InMemoryConnectorStore["upsertSyncState"]>[3],
  ): ConnectionSyncState {
    const state = super.upsertSyncState(
      organizationId,
      connectionId,
      sourceObject,
      patch,
    );
    this.scheduleFlush();
    return state;
  }
}
