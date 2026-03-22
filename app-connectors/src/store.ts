import { randomUUID } from "node:crypto";

import { CONNECTOR_CATALOG } from "./catalog.js";
import { createOpaqueStateToken, makeIdempotencyKey } from "./security.js";
import type {
  AuthorizationSession,
  ConnectionSyncState,
  ConnectorAuditEvent,
  ConnectorConnection,
  CreateConnectionInput,
  IngestCredential,
  IngestRawEvent,
  StoredSecretRecord,
  SyncDispatchResult,
  SyncRun,
  SyncStatus,
  SyncTriggerType,
  UpdateConnectionInput,
} from "./types.js";

type RunUpdate = {
  status: SyncStatus;
  recordsFetched?: number;
  recordsWritten?: number;
  errorClass?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  availableAt?: string;
  attempts?: number;
  maxAttempts?: number;
  priority?: number;
  lockedBy?: string | null;
  leaseExpiresAt?: string | null;
};

type SyncStateUpdate = {
  watermarkText?: string | null;
  watermarkAt?: string | null;
  cursorJson?: Record<string, unknown>;
  lastRunId?: string | null;
  updatedByWorker?: string | null;
};

export class InMemoryConnectorStore {
  protected readonly connections = new Map<string, ConnectorConnection>();
  protected readonly runs = new Map<string, SyncRun>();
  protected readonly syncStates = new Map<string, ConnectionSyncState>();
  protected readonly syncReplayIndex = new Map<string, string>();
  protected readonly secretsByRef = new Map<string, StoredSecretRecord>();
  protected readonly latestSecretRefByConnection = new Map<string, string>();
  protected readonly authorizationSessions = new Map<
    string,
    AuthorizationSession
  >();
  protected readonly auditEvents: ConnectorAuditEvent[] = [];
  protected readonly ingestCredentials = new Map<string, IngestCredential>();
  protected readonly rawEvents = new Map<string, IngestRawEvent>();
  protected readonly rawEventIndex = new Map<string, string>();

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
    const catalogEntry = CONNECTOR_CATALOG.find(
      (entry) => entry.vendor === input.vendor,
    );
    const sourceObjects =
      input.sourceObjects != null && input.sourceObjects.length > 0
        ? [...input.sourceObjects]
        : [...(catalogEntry?.sourceObjects ?? [])];
    const connection: ConnectorConnection = {
      id: randomUUID(),
      organizationId,
      vendor: input.vendor,
      displayName: input.displayName.trim(),
      status: "pending",
      authorizationState:
        input.secretRef != null ? "authorized" : "not_started",
      runtimeEnvironment: input.runtimeEnvironment ?? "production",
      authMode: input.authMode,
      config: input.config ?? {},
      secretRef: input.secretRef ?? null,
      secretVersion: input.secretRef != null ? 1 : null,
      sourceObjects,
      syncIntervalMinutes:
        input.syncIntervalMinutes ?? catalogEntry?.recommendedSyncMinutes ?? 30,
      webhookEnabled: input.webhookEnabled ?? false,
      baseUrl: input.baseUrl ?? null,
      externalAccountId: input.externalAccountId ?? null,
      oauthScopes: input.oauthScopes ?? null,
      lastTestedAt: null,
      lastSuccessfulSyncAt: null,
      nextScheduledSyncAt: null,
      disabledReason: null,
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

  updateConnection(
    organizationId: string,
    connectionId: string,
    patch: Partial<ConnectorConnection> | UpdateConnectionInput,
  ): ConnectorConnection | null {
    const row = this.getConnection(organizationId, connectionId);
    if (row == null) {
      return null;
    }

    const next: ConnectorConnection = {
      ...row,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.connections.set(connectionId, next);
    return next;
  }

  putSecret(secret: StoredSecretRecord): void {
    this.secretsByRef.set(secret.secretRef, secret);
    this.latestSecretRefByConnection.set(secret.connectionId, secret.secretRef);
  }

  getLatestSecret(
    organizationId: string,
    connectionId: string,
  ): StoredSecretRecord | null {
    const ref = this.latestSecretRefByConnection.get(connectionId);
    if (ref == null) {
      return null;
    }
    const secret = this.secretsByRef.get(ref);
    if (
      secret == null ||
      secret.organizationId !== organizationId ||
      secret.connectionId !== connectionId
    ) {
      return null;
    }
    return secret;
  }

  getSecretByRef(secretRef: string): StoredSecretRecord | null {
    return this.secretsByRef.get(secretRef) ?? null;
  }

  createAuthorizationSession(session: AuthorizationSession): void {
    this.authorizationSessions.set(session.connectionId, session);
  }

  getAuthorizationSession(
    organizationId: string,
    connectionId: string,
  ): AuthorizationSession | null {
    const session = this.authorizationSessions.get(connectionId);
    if (session == null || session.organizationId !== organizationId) {
      return null;
    }
    return session;
  }

  deleteAuthorizationSession(connectionId: string): void {
    this.authorizationSessions.delete(connectionId);
  }

  createAuditEvent(event: ConnectorAuditEvent): ConnectorAuditEvent {
    this.auditEvents.push(event);
    return event;
  }

  listAuditEvents(
    organizationId: string,
    connectionId?: string | null,
  ): ConnectorAuditEvent[] {
    return this.auditEvents
      .filter((event) => {
        if (event.organizationId !== organizationId) {
          return false;
        }
        if (connectionId == null || connectionId.length === 0) {
          return true;
        }
        return event.connectionId === connectionId;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createIngestCredential(
    organizationId: string,
    connectionId: string,
    input: {
      label: string;
      keyId: string;
      authMode: IngestCredential["authMode"];
      secretRef: string;
      secretVersion: number;
      tokenPreview: string;
      allowedSourceObjects: string[] | null;
      allowedIpAddresses: string[] | null;
      expiresAt: string | null;
    },
  ): IngestCredential {
    const now = new Date().toISOString();
    const credential: IngestCredential = {
      id: randomUUID(),
      organizationId,
      connectionId,
      label: input.label,
      keyId: input.keyId,
      authMode: input.authMode,
      secretRef: input.secretRef,
      secretVersion: input.secretVersion,
      tokenPreview: input.tokenPreview,
      allowedSourceObjects: input.allowedSourceObjects,
      allowedIpAddresses: input.allowedIpAddresses,
      expiresAt: input.expiresAt,
      lastUsedAt: null,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.ingestCredentials.set(credential.id, credential);
    return credential;
  }

  getIngestCredential(
    organizationId: string,
    connectionId: string,
    credentialId: string,
  ): IngestCredential | null {
    const credential = this.ingestCredentials.get(credentialId);
    if (
      credential == null ||
      credential.organizationId !== organizationId ||
      credential.connectionId !== connectionId
    ) {
      return null;
    }
    return credential;
  }

  updateIngestCredential(
    organizationId: string,
    connectionId: string,
    credentialId: string,
    patch: Partial<IngestCredential>,
  ): IngestCredential | null {
    const previous = this.getIngestCredential(
      organizationId,
      connectionId,
      credentialId,
    );
    if (previous == null) {
      return null;
    }

    const next: IngestCredential = {
      ...previous,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.ingestCredentials.set(credentialId, next);
    return next;
  }

  listIngestCredentials(
    organizationId: string,
    connectionId: string,
  ): IngestCredential[] {
    return Array.from(this.ingestCredentials.values())
      .filter((credential) => {
        return (
          credential.organizationId === organizationId &&
          credential.connectionId === connectionId
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createRawEvent(event: IngestRawEvent): {
    created: boolean;
    event: IngestRawEvent;
  } {
    const replayKey = makeIdempotencyKey(
      event.organizationId,
      event.connectionId,
      "raw_event",
      event.eventId,
    );
    const existingId = this.rawEventIndex.get(replayKey);
    if (existingId != null) {
      const existing = this.rawEvents.get(existingId);
      if (existing != null) {
        return {
          created: false,
          event: existing,
        };
      }
      this.rawEventIndex.delete(replayKey);
    }

    this.rawEvents.set(event.id, event);
    this.rawEventIndex.set(replayKey, event.id);
    return {
      created: true,
      event,
    };
  }

  findRawEventByEventId(
    organizationId: string,
    connectionId: string,
    eventId: string,
  ): IngestRawEvent | null {
    const replayKey = makeIdempotencyKey(
      organizationId,
      connectionId,
      "raw_event",
      eventId,
    );
    const existingId = this.rawEventIndex.get(replayKey);
    if (existingId == null) {
      return null;
    }

    const existing = this.rawEvents.get(existingId);
    if (
      existing == null ||
      existing.organizationId !== organizationId ||
      existing.connectionId !== connectionId
    ) {
      this.rawEventIndex.delete(replayKey);
      return null;
    }

    return existing;
  }

  listRawEvents(
    organizationId: string,
    connectionId?: string | null,
  ): IngestRawEvent[] {
    return Array.from(this.rawEvents.values())
      .filter((event) => {
        if (event.organizationId !== organizationId) {
          return false;
        }
        if (
          connectionId != null &&
          connectionId.length > 0 &&
          event.connectionId !== connectionId
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }

  updateRawEvent(
    organizationId: string,
    connectionId: string,
    eventId: string,
    patch: Partial<IngestRawEvent>,
  ): IngestRawEvent | null {
    const previous = this.getRawEvent(organizationId, connectionId, eventId);
    if (previous == null) {
      return null;
    }

    const next: IngestRawEvent = {
      ...previous,
      ...patch,
    };
    this.rawEvents.set(eventId, next);
    return next;
  }

  getRawEvent(
    organizationId: string,
    connectionId: string,
    eventId: string,
  ): IngestRawEvent | null {
    const previous = this.rawEvents.get(eventId);
    if (
      previous == null ||
      previous.organizationId !== organizationId ||
      previous.connectionId !== connectionId
    ) {
      return null;
    }
    return previous;
  }

  claimRawEvents(
    organizationId: string,
    connectionId: string,
    workerId: string,
    limit: number,
    claimTokenFactory?: (() => string) | null,
  ): IngestRawEvent[] {
    const claimedAt = new Date().toISOString();
    const candidates = this.listRawEvents(organizationId, connectionId)
      .filter((event) => event.processingStatus === "pending")
      .slice(0, limit);

    return candidates
      .map((event) =>
        this.updateRawEvent(organizationId, connectionId, event.id, {
          processingStatus: "processing",
          claimedAt,
          claimedBy: claimTokenFactory?.() ?? workerId,
          errorMessage: null,
        }),
      )
      .filter((event): event is IngestRawEvent => event != null);
  }

  findSyncRunByIdempotency(
    organizationId: string,
    connectionId: string,
    triggerType: SyncTriggerType,
    idempotencyKey: string,
  ): SyncRun | null {
    const replayKey = makeIdempotencyKey(
      organizationId,
      connectionId,
      triggerType,
      idempotencyKey,
    );
    const existingRunId = this.syncReplayIndex.get(replayKey);
    if (existingRunId == null) {
      return null;
    }

    const existingRun = this.runs.get(existingRunId);
    if (
      existingRun == null ||
      existingRun.organizationId !== organizationId ||
      existingRun.connectionId !== connectionId ||
      existingRun.triggerType !== triggerType
    ) {
      this.syncReplayIndex.delete(replayKey);
      return null;
    }

    return existingRun;
  }

  createSyncRun(
    organizationId: string,
    connectionId: string,
    triggerType: SyncTriggerType,
    idempotencyKey: string,
    patch?: Partial<SyncRun>,
  ): SyncDispatchResult {
    const replayKey = makeIdempotencyKey(
      organizationId,
      connectionId,
      triggerType,
      idempotencyKey,
    );
    const existingRunId = this.syncReplayIndex.get(replayKey);
    if (existingRunId != null) {
      const existingRun = this.runs.get(existingRunId);
      if (
        existingRun != null &&
        existingRun.organizationId === organizationId &&
        existingRun.connectionId === connectionId &&
        existingRun.triggerType === triggerType
      ) {
        return {
          created: false,
          run: existingRun,
        };
      }
      this.syncReplayIndex.delete(replayKey);
    }

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
      idempotencyKey,
      sourceWindowStart: null,
      sourceWindowEnd: null,
      forceFullSync: false,
      availableAt: now,
      attempts: 0,
      maxAttempts: 8,
      priority: 50,
      lockedBy: null,
      leaseExpiresAt: null,
      createdAt: now,
      ...patch,
    };
    this.runs.set(run.id, run);
    this.syncReplayIndex.set(replayKey, run.id);
    return {
      created: true,
      run,
    };
  }

  private makeSyncStateKey(connectionId: string, sourceObject: string): string {
    return `${connectionId}::${sourceObject}`;
  }

  getSyncState(
    organizationId: string,
    connectionId: string,
    sourceObject: string,
  ): ConnectionSyncState | null {
    const row = this.syncStates.get(
      this.makeSyncStateKey(connectionId, sourceObject),
    );
    if (
      row == null ||
      row.organizationId !== organizationId ||
      row.connectionId !== connectionId
    ) {
      return null;
    }
    return row;
  }

  listSyncStates(
    organizationId: string,
    connectionId: string,
  ): ConnectionSyncState[] {
    return Array.from(this.syncStates.values())
      .filter((state) => {
        return (
          state.organizationId === organizationId &&
          state.connectionId === connectionId
        );
      })
      .sort((left, right) =>
        left.sourceObject.localeCompare(right.sourceObject),
      );
  }

  upsertSyncState(
    organizationId: string,
    connectionId: string,
    sourceObject: string,
    patch: SyncStateUpdate,
  ): ConnectionSyncState {
    const now = new Date().toISOString();
    const key = this.makeSyncStateKey(connectionId, sourceObject);
    const previous = this.syncStates.get(key);
    const next: ConnectionSyncState = {
      organizationId,
      connectionId,
      sourceObject,
      watermarkText:
        patch.watermarkText !== undefined
          ? patch.watermarkText
          : (previous?.watermarkText ?? null),
      watermarkAt:
        patch.watermarkAt !== undefined
          ? patch.watermarkAt
          : (previous?.watermarkAt ?? null),
      cursorJson:
        patch.cursorJson !== undefined
          ? { ...patch.cursorJson }
          : { ...(previous?.cursorJson ?? {}) },
      lastRunId:
        patch.lastRunId !== undefined
          ? patch.lastRunId
          : (previous?.lastRunId ?? null),
      updatedByWorker:
        patch.updatedByWorker !== undefined
          ? patch.updatedByWorker
          : (previous?.updatedByWorker ?? null),
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };
    this.syncStates.set(key, next);
    return next;
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
      availableAt: patch.availableAt ?? previous.availableAt,
      attempts: patch.attempts ?? previous.attempts,
      maxAttempts: patch.maxAttempts ?? previous.maxAttempts,
      priority: patch.priority ?? previous.priority,
      lockedBy:
        patch.lockedBy !== undefined ? patch.lockedBy : previous.lockedBy,
      leaseExpiresAt:
        patch.leaseExpiresAt !== undefined
          ? patch.leaseExpiresAt
          : previous.leaseExpiresAt,
    };
    this.runs.set(runId, next);
    return next;
  }

  claimSyncRuns(
    organizationIds: readonly string[],
    workerId: string,
    limit: number,
    leaseSeconds: number,
    lockTokenFactory?: (() => string) | null,
  ): SyncRun[] {
    if (organizationIds.length === 0 || limit < 1) {
      return [];
    }

    const allowedOrganizations = new Set(organizationIds);
    const nowMs = Date.now();
    const claimedAt = new Date(nowMs).toISOString();
    const leaseExpiresAt = new Date(nowMs + leaseSeconds * 1000).toISOString();

    const candidates = Array.from(this.runs.values())
      .filter((run) => {
        if (!allowedOrganizations.has(run.organizationId)) {
          return false;
        }
        if (run.status === "queued") {
          return Date.parse(run.availableAt) <= nowMs;
        }
        if (run.status !== "running" || run.leaseExpiresAt == null) {
          return false;
        }
        return Date.parse(run.leaseExpiresAt) <= nowMs;
      })
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return left.priority - right.priority;
        }
        if (left.availableAt !== right.availableAt) {
          return left.availableAt.localeCompare(right.availableAt);
        }
        return left.createdAt.localeCompare(right.createdAt);
      })
      .slice(0, limit);

    return candidates
      .map((run) =>
        this.updateSyncRun(run.organizationId, run.id, {
          status: "running",
          recordsFetched: 0,
          recordsWritten: 0,
          errorClass: null,
          errorMessage: null,
          startedAt: claimedAt,
          endedAt: null,
          attempts: run.attempts + 1,
          lockedBy: lockTokenFactory?.() ?? workerId,
          leaseExpiresAt,
        }),
      )
      .filter((run): run is SyncRun => run != null);
  }

  issueClaimToken(): string {
    return createOpaqueStateToken();
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
