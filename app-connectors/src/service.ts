import { randomUUID } from "node:crypto";

import { evaluateConnectionActivationReadiness } from "./activation-readiness.js";
import { CONNECTOR_CATALOG } from "./catalog.js";
import { loadConfig } from "./config.js";
import { LocalFilePayloadStore, type PayloadStore } from "./payload-store.js";
import { PostgresBackedConnectorStore } from "./persistent-store.js";
import { validateOutboundUrl } from "./outbound-url.js";
import {
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  exchangeClientCredentials,
  getOAuthClientCredentials,
  refreshAccessToken,
} from "./oauth.js";
import {
  containsSensitiveKeys,
  createOpaqueApiKey,
  createOpaqueStateToken,
  createPkceVerifier,
  createSecretRef,
  isFreshUnixTimestamp,
  payloadSha256,
  openSecretPayload,
  redactSensitive,
  redactPreviewPayload,
  safeEqualSecret,
  verifyHmacSha256,
  sealSecretPayload,
} from "./security.js";
import { InMemoryConnectorStore } from "./store.js";
import type {
  AuthorizationCompleteInput,
  AuthorizationCompleteResult,
  AuthorizationSession,
  AuthorizationStartInput,
  AuthorizationStartResult,
  ClaimSyncRunsInput,
  ConnectionSyncState,
  CompleteSyncRunInput,
  ConnectorActivationReadiness,
  ConnectorAuditEvent,
  ConnectorCatalogItem,
  ConnectorConnection,
  ConnectorVendor,
  FailSyncRunInput,
  GetSyncRunExecutionPlanInput,
  CreateConnectionInput,
  CredentialInput,
  IngestAuthContext,
  IngestCredential,
  IngestCredentialAuthMode,
  IngestEventsInput,
  IngestEventsResult,
  IngestRawEvent,
  IngestRawEventSummary,
  IssueIngestCredentialInput,
  IssueIngestCredentialResult,
  ProviderEventsIngestInput,
  ProviderEventsIngestResult,
  ProviderRuntimeAccessContext,
  SecretKind,
  StoredSecretRecord,
  SyncDispatchResult,
  SyncRun,
  SyncRunExecutionPlan,
  TestConnectionResult,
  ConnectorRuntimeEnvironment,
  TriggerSyncInput,
  UpsertSyncStateInput,
  UpdateConnectionInput,
} from "./types.js";

type AuditContext = {
  actorService: string | null;
  actorUserId: string | null;
  requestId: string | null;
};

type OAuthClientSecretPayload = {
  clientId: string;
  clientSecret: string;
};

type OAuthTokenSecretPayload = OAuthClientSecretPayload & {
  accessToken: string;
  refreshToken: string | null;
  tokenEndpoint: string;
  expiresAt: string | null;
  tokenType: string;
  scope: string[];
};

type IngestClientSecretPayload = {
  apiKey: string;
  signingSecret: string | null;
  keyId: string;
};

type SessionSecretPayload = {
  database: string;
  username: string;
  password: string;
};

type NormalizedJsonValue =
  | null
  | string
  | number
  | boolean
  | NormalizedJsonValue[]
  | { [key: string]: NormalizedJsonValue };

const _MIN_SYNC_LEASE_SECONDS = 30;
const _MAX_SYNC_LEASE_SECONDS = 900;
const _DEFAULT_SYNC_LEASE_SECONDS = 120;
const _MIN_SYNC_RETRY_DELAY_SECONDS = 5;
const _MAX_SYNC_RETRY_DELAY_SECONDS = 3600;
const _MAX_CURSOR_JSON_DEPTH = 8;
const _MAX_CURSOR_JSON_ARRAY_ENTRIES = 1024;
const _MAX_CURSOR_JSON_OBJECT_ENTRIES = 1024;
const _MAX_CURSOR_JSON_BYTES = 256 * 1024;
const _RESERVED_CURSOR_JSON_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

export class IngestAuthenticationError extends Error {
  readonly reason: string;

  constructor(message: string, reason: string) {
    super(message);
    this.name = "IngestAuthenticationError";
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeHeaderMap(
  value: unknown,
  field: string,
): Record<string, string> | null {
  if (!isRecord(value)) {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }

  const normalized: Record<string, string> = {};
  for (const [rawKey, rawValue] of entries) {
    const key = rawKey.trim();
    const headerValue = asTrimmedString(rawValue);
    if (!/^[A-Za-z0-9-]{1,120}$/.test(key)) {
      throw new Error(`${field} contains an invalid header name "${rawKey}"`);
    }
    if (headerValue == null || headerValue.length > 512) {
      throw new Error(
        `${field}.${key} must be a non-empty string up to 512 characters`,
      );
    }
    normalized[key] = headerValue;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function parseIsoDate(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`Invalid ISO datetime "${value}"`);
  }
  return new Date(time).toISOString();
}

function normalizeStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry) => entry.length > 0),
    ),
  );

  return normalized.length > 0 ? normalized : null;
}

function normalizePositiveInteger(
  value: number,
  {
    min,
    max,
    field,
  }: {
    min: number;
    max: number;
    field: string;
  },
): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function normalizeJsonValue(
  value: unknown,
  fieldPath: string,
  depth: number,
): NormalizedJsonValue {
  if (depth > _MAX_CURSOR_JSON_DEPTH) {
    throw new Error(
      `${fieldPath} exceeds the maximum supported depth of ${_MAX_CURSOR_JSON_DEPTH}`,
    );
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${fieldPath} must contain only finite numbers`);
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > _MAX_CURSOR_JSON_ARRAY_ENTRIES) {
      throw new Error(
        `${fieldPath} exceeds the maximum array size of ${_MAX_CURSOR_JSON_ARRAY_ENTRIES}`,
      );
    }
    return value.map((entry, index) =>
      normalizeJsonValue(entry, `${fieldPath}[${index}]`, depth + 1),
    );
  }

  if (!isRecord(value)) {
    throw new Error(`${fieldPath} must contain only JSON-serializable values`);
  }

  const entries = Object.entries(value);
  if (entries.length > _MAX_CURSOR_JSON_OBJECT_ENTRIES) {
    throw new Error(
      `${fieldPath} exceeds the maximum object size of ${_MAX_CURSOR_JSON_OBJECT_ENTRIES}`,
    );
  }

  const normalized: { [key: string]: NormalizedJsonValue } = {};
  for (const [key, entryValue] of entries) {
    if (_RESERVED_CURSOR_JSON_KEYS.has(key)) {
      throw new Error(`${fieldPath} contains a reserved key "${key}"`);
    }
    normalized[key] = normalizeJsonValue(
      entryValue,
      `${fieldPath}.${key}`,
      depth + 1,
    );
  }
  return normalized;
}

function normalizeCursorJson(
  value: unknown,
): Record<string, unknown> | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("cursorJson must be an object");
  }

  const normalized = normalizeJsonValue(value, "cursorJson", 0);
  if (!isRecord(normalized)) {
    throw new Error("cursorJson must be an object");
  }

  const serialized = JSON.stringify(normalized);
  if (
    serialized == null ||
    Buffer.byteLength(serialized, "utf8") > _MAX_CURSOR_JSON_BYTES
  ) {
    throw new Error(
      `cursorJson must not exceed ${_MAX_CURSOR_JSON_BYTES} bytes once serialized`,
    );
  }

  return normalized;
}

function isExpired(expiresAt: string | null, skewSeconds = 60): boolean {
  if (expiresAt == null) {
    return false;
  }
  return Date.parse(expiresAt) <= Date.now() + skewSeconds * 1000;
}

function assertNoSecretsInConfig(config: Record<string, unknown>): void {
  if (containsSensitiveKeys(config)) {
    throw new Error(
      "Secrets must be sent via credentials, never inside config",
    );
  }
}

function getConfigUrl(
  config: Record<string, unknown>,
  key: string,
): string | null {
  return asTrimmedString(config[key]);
}

function normalizeApiKeyCredentials(
  credentials: CredentialInput,
): CredentialInput {
  const apiKey = asTrimmedString(credentials["apiKey"]);
  if (apiKey == null || apiKey.length < 8) {
    throw new Error("apiKey is required");
  }
  return { apiKey };
}

function normalizeSessionCredentials(
  credentials: CredentialInput,
): CredentialInput {
  const database = asTrimmedString(credentials["database"]);
  const username = asTrimmedString(credentials["username"]);
  const password = asTrimmedString(credentials["password"]);

  if (database == null || username == null || password == null) {
    throw new Error(
      "session credentials require database, username and password",
    );
  }

  return {
    database,
    username,
    password,
  };
}

function normalizeServiceAccountCredentials(
  credentials: CredentialInput,
): CredentialInput {
  const clientId = asTrimmedString(credentials["clientId"]);
  const clientSecret = asTrimmedString(credentials["clientSecret"]);
  const clientEmail = asTrimmedString(credentials["clientEmail"]);
  const privateKey = asTrimmedString(credentials["privateKey"]);
  const username = asTrimmedString(credentials["username"]);
  const password = asTrimmedString(credentials["password"]);

  if (clientId != null && clientSecret != null) {
    return { clientId, clientSecret };
  }
  if (clientEmail != null && privateKey != null) {
    return { clientEmail, privateKey };
  }
  if (username != null && password != null) {
    throw new Error(
      "service_account username/password authentication is forbidden; provide clientId/clientSecret or clientEmail/privateKey",
    );
  }

  if (username != null || password != null) {
    throw new Error(
      "service_account credentials require both clientId/clientSecret or clientEmail/privateKey; username/password is not supported",
    );
  }

  throw new Error(
    "service_account credentials require clientId/clientSecret or clientEmail/privateKey",
  );
}

function normalizeSftpCredentials(
  credentials: CredentialInput,
): CredentialInput {
  const host = asTrimmedString(credentials["host"]);
  const username = asTrimmedString(credentials["username"]);
  const password = asTrimmedString(credentials["password"]);
  const privateKey = asTrimmedString(credentials["privateKey"]);
  const port =
    typeof credentials["port"] === "number"
      ? credentials["port"]
      : typeof credentials["port"] === "string"
        ? Number(credentials["port"])
        : 22;

  if (password != null) {
    throw new Error(
      "sftp password authentication is forbidden; provide host, username and privateKey only",
    );
  }

  if (host == null || username == null || privateKey == null) {
    throw new Error("sftp credentials require host, username and privateKey");
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("sftp port must be a valid TCP port");
  }

  return {
    host,
    username,
    privateKey,
    port,
  };
}

function normalizeCredentialPayload(
  authMode: ConnectorConnection["authMode"],
  credentials: CredentialInput,
): { kind: SecretKind; payload: CredentialInput } {
  switch (authMode) {
    case "oauth2":
      return {
        kind: "oauth2_client",
        payload: getOAuthClientCredentials(credentials),
      };
    case "api_key":
      return {
        kind: "api_key",
        payload: normalizeApiKeyCredentials(credentials),
      };
    case "session":
      return {
        kind: "session",
        payload: normalizeSessionCredentials(credentials),
      };
    case "service_account":
      return {
        kind: "service_account",
        payload: normalizeServiceAccountCredentials(credentials),
      };
    case "sftp":
      return {
        kind: "sftp",
        payload: normalizeSftpCredentials(credentials),
      };
  }
}

function buildAuditEvent(
  organizationId: string,
  connectionId: string | null,
  action: string,
  metadata: Record<string, unknown>,
  context: AuditContext,
): ConnectorAuditEvent {
  return {
    id: randomUUID(),
    organizationId,
    connectionId,
    action,
    actorUserId: context.actorUserId,
    actorService: context.actorService,
    requestId: context.requestId,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export class ConnectorService {
  constructor(
    private readonly store: InMemoryConnectorStore,
    private readonly secretSealingKey: string | null = null,
    private readonly publicBaseUrl: string | null = null,
    private readonly payloadStore: PayloadStore | null = null,
    private readonly nodeEnv:
      | "development"
      | "staging"
      | "production" = "development",
    private readonly allowedOutboundHosts: readonly string[] = [],
    private readonly allowedSandboxOutboundHosts: readonly string[] = [],
  ) {}

  listCatalog() {
    return this.store.listCatalog();
  }

  listConnections(
    organizationId: string,
    vendor?: string | null,
  ): ConnectorConnection[] {
    return this.store.listConnections(organizationId, vendor);
  }

  getConnection(
    organizationId: string,
    connectionId: string,
  ): ConnectorConnection | null {
    return this.store.getConnection(organizationId, connectionId);
  }

  getConnectionActivationReadiness(
    organizationId: string,
    connectionId: string,
  ): ConnectorActivationReadiness {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    return this.buildConnectionActivationReadiness(connection);
  }

  listAuditEvents(
    organizationId: string,
    connectionId?: string | null,
  ): ConnectorAuditEvent[] {
    return this.store.listAuditEvents(organizationId, connectionId);
  }

  listIngestCredentials(
    organizationId: string,
    connectionId: string,
  ): IngestCredential[] {
    return this.store.listIngestCredentials(organizationId, connectionId);
  }

  listRawEvents(
    organizationId: string,
    connectionId?: string | null,
  ): IngestRawEvent[] {
    return this.store.listRawEvents(organizationId, connectionId);
  }

  listRawEventSummaries(
    organizationId: string,
    connectionId?: string | null,
  ): IngestRawEventSummary[] {
    return this.store
      .listRawEvents(organizationId, connectionId)
      .map((event) => ({
        id: event.id,
        credentialId: event.credentialId,
        eventId: event.eventId,
        sourceObject: event.sourceObject,
        sourceRecordId: event.sourceRecordId,
        schemaVersion: event.schemaVersion,
        objectStoreKey: event.objectStoreKey,
        sizeBytes: event.sizeBytes,
        processingStatus: event.processingStatus,
        receivedAt: event.receivedAt,
      }));
  }

  claimRawEvents(
    organizationId: string,
    connectionId: string,
    workerId: string,
    limit: number,
    context: AuditContext,
  ): IngestRawEvent[] {
    this.getConnectionOrThrow(organizationId, connectionId);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const normalizedWorkerId = workerId.trim();
    const events = this.store.claimRawEvents(
      organizationId,
      connectionId,
      normalizedWorkerId,
      safeLimit,
    );
    if (events.length > 0) {
      this.recordAuditEvent(
        organizationId,
        connectionId,
        "connectors.raw_events.claimed",
        {
          workerId: context.actorService ?? normalizedWorkerId,
          claimedCount: events.length,
        },
        context,
      );
    }
    return events;
  }

  claimRawEventsWithOpaqueClaims(
    organizationId: string,
    connectionId: string,
    limit: number,
    context: AuditContext,
  ): IngestRawEvent[] {
    this.getConnectionOrThrow(organizationId, connectionId);
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const events = this.store.claimRawEvents(
      organizationId,
      connectionId,
      context.actorService ?? "runtime",
      safeLimit,
      () => this.store.issueClaimToken(),
    );
    if (events.length > 0) {
      this.recordAuditEvent(
        organizationId,
        connectionId,
        "connectors.raw_events.claimed",
        {
          claimedCount: events.length,
        },
        context,
      );
    }
    return events;
  }

  private assertRawEventClaimOwnership(
    event: IngestRawEvent,
    claimToken: string,
  ): void {
    if (event.processingStatus !== "processing") {
      throw new Error("Raw event is not currently claimed for processing");
    }
    if (event.claimedBy == null || event.claimedBy !== claimToken) {
      throw new Error("Raw event is not claimed by this token");
    }
  }

  markRawEventProcessed(
    organizationId: string,
    connectionId: string,
    rawEventId: string,
    workerId: string,
    context: AuditContext,
  ): IngestRawEvent {
    const normalizedWorkerId = workerId.trim();
    const existing = this.store.getRawEvent(
      organizationId,
      connectionId,
      rawEventId,
    );
    if (existing == null) {
      throw new Error("Raw event not found");
    }
    this.assertRawEventClaimOwnership(existing, normalizedWorkerId);
    const event = this.store.updateRawEvent(
      organizationId,
      connectionId,
      rawEventId,
      {
        processingStatus: "processed",
        claimedBy: normalizedWorkerId,
        processedAt: new Date().toISOString(),
        errorMessage: null,
      },
    );
    if (event == null) {
      throw new Error("Raw event not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.raw_event.processed",
      {
        rawEventId,
        workerId: context.actorService ?? normalizedWorkerId,
      },
      context,
    );

    return event;
  }

  markRawEventFailed(
    organizationId: string,
    connectionId: string,
    rawEventId: string,
    workerId: string,
    errorMessage: string,
    context: AuditContext,
  ): IngestRawEvent {
    const normalizedError = errorMessage.trim();
    if (normalizedError.length < 3) {
      throw new Error("errorMessage must be at least 3 characters");
    }
    const normalizedWorkerId = workerId.trim();
    const existing = this.store.getRawEvent(
      organizationId,
      connectionId,
      rawEventId,
    );
    if (existing == null) {
      throw new Error("Raw event not found");
    }
    this.assertRawEventClaimOwnership(existing, normalizedWorkerId);
    const event = this.store.updateRawEvent(
      organizationId,
      connectionId,
      rawEventId,
      {
        processingStatus: "failed",
        claimedBy: normalizedWorkerId,
        processedAt: new Date().toISOString(),
        errorMessage: normalizedError.slice(0, 400),
      },
    );
    if (event == null) {
      throw new Error("Raw event not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.raw_event.failed",
      {
        rawEventId,
        workerId: context.actorService ?? normalizedWorkerId,
      },
      context,
    );

    return event;
  }

  claimSyncRuns(
    organizationIds: readonly string[],
    input: ClaimSyncRunsInput,
    context: AuditContext,
  ): SyncRun[] {
    const allowedOrganizations = Array.from(
      new Set(
        organizationIds
          .map((organizationId) => organizationId.trim())
          .filter((organizationId) => organizationId.length > 0),
      ),
    );
    if (allowedOrganizations.length === 0) {
      return [];
    }

    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }

    const limit = normalizePositiveInteger(input.limit ?? 25, {
      min: 1,
      max: 200,
      field: "limit",
    });
    const leaseSeconds = normalizePositiveInteger(
      input.leaseSeconds ?? _DEFAULT_SYNC_LEASE_SECONDS,
      {
        min: _MIN_SYNC_LEASE_SECONDS,
        max: _MAX_SYNC_LEASE_SECONDS,
        field: "leaseSeconds",
      },
    );

    const claimedRuns = this.store.claimSyncRuns(
      allowedOrganizations,
      workerId,
      limit,
      leaseSeconds,
    );
    for (const run of claimedRuns) {
      this.recordAuditEvent(
        run.organizationId,
        run.connectionId,
        "connectors.sync.claimed",
        {
          runId: run.id,
          workerId: context.actorService ?? workerId,
          attempts: run.attempts,
          leaseExpiresAt: run.leaseExpiresAt,
          triggerType: run.triggerType,
        },
        context,
      );
    }
    return claimedRuns;
  }

  claimSyncRunsWithOpaqueLocks(
    organizationIds: readonly string[],
    input: {
      limit?: number;
      leaseSeconds?: number;
    },
    context: AuditContext,
  ): SyncRun[] {
    const allowedOrganizations = Array.from(
      new Set(
        organizationIds
          .map((organizationId) => organizationId.trim())
          .filter((organizationId) => organizationId.length > 0),
      ),
    );
    if (allowedOrganizations.length === 0) {
      return [];
    }

    const limit = normalizePositiveInteger(input.limit ?? 25, {
      min: 1,
      max: 200,
      field: "limit",
    });
    const leaseSeconds = normalizePositiveInteger(
      input.leaseSeconds ?? _DEFAULT_SYNC_LEASE_SECONDS,
      {
        min: _MIN_SYNC_LEASE_SECONDS,
        max: _MAX_SYNC_LEASE_SECONDS,
        field: "leaseSeconds",
      },
    );

    const claimedRuns = this.store.claimSyncRuns(
      allowedOrganizations,
      context.actorService ?? "runtime",
      limit,
      leaseSeconds,
      () => this.store.issueClaimToken(),
    );
    for (const run of claimedRuns) {
      this.recordAuditEvent(
        run.organizationId,
        run.connectionId,
        "connectors.sync.claimed",
        {
          runId: run.id,
          attempts: run.attempts,
          leaseExpiresAt: run.leaseExpiresAt,
          triggerType: run.triggerType,
        },
        context,
      );
    }
    return claimedRuns;
  }

  getSyncRunExecutionPlan(
    organizationId: string,
    runId: string,
    input: GetSyncRunExecutionPlanInput,
    context: AuditContext,
  ): SyncRunExecutionPlan {
    let run = this.getSyncRunOrThrow(organizationId, runId);
    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }
    this.assertSyncRunOwnedByWorker(run, workerId);
    run = this.refreshOwnedSyncRunLease(organizationId, run);

    const connection = this.getConnectionOrThrow(
      organizationId,
      run.connectionId,
    );
    const { payload } =
      this.getLatestSecretPayload<Record<string, unknown>>(connection);
    const syncStates = this.store.listSyncStates(organizationId, connection.id);

    this.recordAuditEvent(
      organizationId,
      connection.id,
      "connectors.sync.execution_plan.read",
      {
        runId,
        workerId: context.actorService ?? workerId,
        authMode: connection.authMode,
        syncStateCount: syncStates.length,
      },
      context,
    );

    return {
      run,
      connection,
      credentials: payload,
      syncStates,
    };
  }

  upsertSyncStateForRun(
    organizationId: string,
    runId: string,
    input: UpsertSyncStateInput,
    context: AuditContext,
  ): ConnectionSyncState {
    let run = this.getSyncRunOrThrow(organizationId, runId);
    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }
    this.assertSyncRunOwnedByWorker(run, workerId);
    run = this.refreshOwnedSyncRunLease(organizationId, run);

    const connection = this.getConnectionOrThrow(
      organizationId,
      run.connectionId,
    );
    const sourceObject = input.sourceObject.trim();
    if (sourceObject.length === 0) {
      throw new Error("sourceObject must be provided");
    }
    if (!connection.sourceObjects.includes(sourceObject)) {
      throw new Error(
        `Unsupported source object "${sourceObject}" for this connection`,
      );
    }

    const cursorJson = normalizeCursorJson(input.cursorJson);
    const state = this.store.upsertSyncState(
      organizationId,
      connection.id,
      sourceObject,
      {
        watermarkText: asTrimmedString(input.watermarkText) ?? null,
        watermarkAt: parseIsoDate(input.watermarkAt ?? null),
        ...(cursorJson !== undefined ? { cursorJson } : {}),
        lastRunId: run.id,
        updatedByWorker: workerId,
      },
    );

    this.recordAuditEvent(
      organizationId,
      connection.id,
      "connectors.sync.state.updated",
      {
        runId,
        workerId: context.actorService ?? workerId,
        sourceObject,
        watermarkAt: state.watermarkAt,
      },
      context,
    );

    return state;
  }

  markSyncRunCompleted(
    organizationId: string,
    runId: string,
    input: CompleteSyncRunInput,
    context: AuditContext,
  ): SyncRun {
    const run = this.getSyncRunOrThrow(organizationId, runId);
    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }
    this.assertSyncRunOwnedByWorker(run, workerId);

    const recordsFetched = normalizePositiveInteger(input.recordsFetched, {
      min: 0,
      max: 1_000_000,
      field: "recordsFetched",
    });
    const recordsWritten = normalizePositiveInteger(input.recordsWritten, {
      min: 0,
      max: 1_000_000,
      field: "recordsWritten",
    });
    const completedAt = new Date().toISOString();
    const updated = this.store.updateSyncRun(organizationId, runId, {
      status: "success",
      recordsFetched,
      recordsWritten,
      errorClass: null,
      errorMessage: null,
      endedAt: completedAt,
      availableAt: completedAt,
      lockedBy: null,
      leaseExpiresAt: null,
    });
    if (updated == null) {
      throw new Error("Sync run not found");
    }

    this.store.updateConnection(organizationId, updated.connectionId, {
      status: "active",
      lastSuccessfulSyncAt: completedAt,
    });
    this.recordAuditEvent(
      organizationId,
      updated.connectionId,
      "connectors.sync.completed",
      {
        runId,
        workerId: context.actorService ?? workerId,
        recordsFetched,
        recordsWritten,
      },
      context,
    );
    return updated;
  }

  markSyncRunFailed(
    organizationId: string,
    runId: string,
    input: FailSyncRunInput,
    context: AuditContext,
  ): SyncRun {
    const run = this.getSyncRunOrThrow(organizationId, runId);
    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }
    this.assertSyncRunOwnedByWorker(run, workerId);

    const errorMessage = input.errorMessage.trim();
    if (errorMessage.length < 3) {
      throw new Error("errorMessage must be at least 3 characters");
    }

    const retryDelaySeconds =
      input.retryable === true
        ? normalizePositiveInteger(
            input.retryDelaySeconds ??
              this.computeRetryDelaySeconds(run.attempts),
            {
              min: _MIN_SYNC_RETRY_DELAY_SECONDS,
              max: _MAX_SYNC_RETRY_DELAY_SECONDS,
              field: "retryDelaySeconds",
            },
          )
        : null;
    const willRetry =
      input.retryable === true &&
      retryDelaySeconds != null &&
      run.attempts < run.maxAttempts;
    const failedAt = new Date().toISOString();
    const nextAvailableAt =
      willRetry && retryDelaySeconds != null
        ? new Date(Date.now() + retryDelaySeconds * 1000).toISOString()
        : failedAt;
    const updated = this.store.updateSyncRun(organizationId, runId, {
      status: willRetry ? "queued" : "failed",
      errorClass: asTrimmedString(input.errorClass) ?? run.errorClass,
      errorMessage: errorMessage.slice(0, 400),
      endedAt: failedAt,
      availableAt: nextAvailableAt,
      lockedBy: null,
      leaseExpiresAt: null,
    });
    if (updated == null) {
      throw new Error("Sync run not found");
    }

    this.recordAuditEvent(
      organizationId,
      updated.connectionId,
      willRetry ? "connectors.sync.retry_scheduled" : "connectors.sync.failed",
      {
        runId,
        workerId: context.actorService ?? workerId,
        retryDelaySeconds,
        attempts: updated.attempts,
        maxAttempts: updated.maxAttempts,
        errorClass: updated.errorClass,
      },
      context,
    );
    return updated;
  }

  async getRawEventPayload(
    organizationId: string,
    connectionId: string,
    eventId: string,
  ): Promise<Record<string, unknown>> {
    const event = this.store
      .listRawEvents(organizationId, connectionId)
      .find((entry) => entry.id === eventId);
    if (event == null) {
      throw new Error("Raw event not found");
    }
    return await this.requirePayloadStore().getJson(event.objectStoreKey);
  }

  private getConnectionOrThrow(
    organizationId: string,
    connectionId: string,
  ): ConnectorConnection {
    const connection = this.store.getConnection(organizationId, connectionId);
    if (connection == null) {
      throw new Error("Connection not found");
    }
    return connection;
  }

  private getSyncRunOrThrow(organizationId: string, runId: string): SyncRun {
    const run = this.store.getSyncRun(organizationId, runId);
    if (run == null) {
      throw new Error("Sync run not found");
    }
    return run;
  }

  private assertSyncRunOwnedByWorker(run: SyncRun, workerId: string): void {
    if (run.status !== "running") {
      throw new Error("Sync run is not currently running");
    }
    if (
      run.leaseExpiresAt != null &&
      Date.parse(run.leaseExpiresAt) <= Date.now()
    ) {
      throw new Error("Sync run lease expired");
    }
    if (run.lockedBy == null || run.lockedBy !== workerId) {
      throw new Error("Sync run is not locked by this worker");
    }
  }

  private refreshOwnedSyncRunLease(
    organizationId: string,
    run: SyncRun,
  ): SyncRun {
    if (run.leaseExpiresAt == null) {
      return run;
    }

    const currentLeaseMs = Date.parse(run.leaseExpiresAt);
    const nextLeaseMs = Math.max(
      currentLeaseMs,
      Date.now() + _DEFAULT_SYNC_LEASE_SECONDS * 1000,
    );
    if (!Number.isFinite(currentLeaseMs) || nextLeaseMs <= currentLeaseMs) {
      return run;
    }

    return (
      this.store.updateSyncRun(organizationId, run.id, {
        status: run.status,
        leaseExpiresAt: new Date(nextLeaseMs).toISOString(),
      }) ?? run
    );
  }

  private computeRetryDelaySeconds(attempts: number): number {
    const safeAttempts = Math.max(1, attempts);
    return Math.min(
      _MAX_SYNC_RETRY_DELAY_SECONDS,
      30 * 2 ** (safeAttempts - 1),
    );
  }

  private getCatalogOAuthDefaults(
    catalogItem: ConnectorCatalogItem,
    runtimeEnvironment: ConnectorRuntimeEnvironment,
  ) {
    return (
      catalogItem.oauthDefaults?.[runtimeEnvironment] ??
      catalogItem.oauthDefaults?.production ??
      null
    );
  }

  private getOutboundPolicy(runtimeEnvironment: ConnectorRuntimeEnvironment): {
    allowedHosts: readonly string[];
    allowlistLabel: string;
    reservedHosts?: readonly string[];
    reservedLabel?: string;
  } {
    if (runtimeEnvironment === "sandbox") {
      return {
        allowedHosts: this.allowedSandboxOutboundHosts,
        allowlistLabel: "CONNECTORS_ALLOWED_SANDBOX_OUTBOUND_HOSTS",
      };
    }

    return {
      allowedHosts: this.allowedOutboundHosts,
      allowlistLabel: "CONNECTORS_ALLOWED_OUTBOUND_HOSTS",
      reservedHosts: this.allowedSandboxOutboundHosts,
      reservedLabel: "sandbox runtimeEnvironment",
    };
  }

  private requirePublicBaseUrl(): string {
    if (this.publicBaseUrl == null || this.publicBaseUrl.length === 0) {
      throw new Error(
        "CONNECTORS_PUBLIC_BASE_URL is required to issue public ingest credentials",
      );
    }
    return this.publicBaseUrl;
  }

  private requirePayloadStore(): PayloadStore {
    if (this.payloadStore == null) {
      throw new Error("Payload store is not configured");
    }
    return this.payloadStore;
  }

  private recordAuditEvent(
    organizationId: string,
    connectionId: string | null,
    action: string,
    metadata: Record<string, unknown>,
    context: AuditContext,
  ): void {
    this.store.createAuditEvent(
      buildAuditEvent(organizationId, connectionId, action, metadata, context),
    );
  }

  private getCatalogItem(vendor: ConnectorVendor): ConnectorCatalogItem {
    const catalogItem = CONNECTOR_CATALOG.find(
      (item) => item.vendor === vendor,
    );
    if (catalogItem == null) {
      throw new Error(`Unsupported connector vendor: ${vendor}`);
    }
    return catalogItem;
  }

  private assertAuthModeAllowed(
    catalogItem: ConnectorCatalogItem,
    authMode: ConnectorConnection["authMode"],
  ): void {
    if (!catalogItem.authModes.includes(authMode)) {
      throw new Error(
        `Auth mode "${authMode}" is not allowed for vendor "${catalogItem.vendor}"`,
      );
    }
  }

  private normalizeSourceObjects(
    catalogItem: ConnectorCatalogItem,
    sourceObjects: string[] | undefined,
  ): string[] {
    if (catalogItem.vendor === "custom_data") {
      const normalizedCustomSourceObjects = Array.from(
        new Set(
          (sourceObjects ?? catalogItem.sourceObjects)
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0),
        ),
      );
      if (normalizedCustomSourceObjects.length === 0) {
        throw new Error("sourceObjects must contain at least one object");
      }
      return normalizedCustomSourceObjects;
    }

    if (sourceObjects == null || sourceObjects.length === 0) {
      return [...catalogItem.sourceObjects];
    }

    const allowlist = new Set(catalogItem.sourceObjects);
    const normalized = Array.from(
      new Set(
        sourceObjects
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );
    if (normalized.length === 0) {
      throw new Error("sourceObjects must contain at least one object");
    }
    for (const sourceObject of normalized) {
      if (!allowlist.has(sourceObject)) {
        throw new Error(
          `Unsupported source object "${sourceObject}" for ${catalogItem.vendor}`,
        );
      }
    }
    return normalized;
  }

  private ensureSealingKey(): string {
    if (this.secretSealingKey == null || this.secretSealingKey.length < 32) {
      throw new Error(
        "CONNECTORS_SECRET_SEALING_KEY is required to store credentials",
      );
    }
    return this.secretSealingKey;
  }

  private storeSecret(
    connection: ConnectorConnection,
    kind: SecretKind,
    payload: CredentialInput,
    metadata: Record<string, unknown>,
    nextAuthorizationState: ConnectorConnection["authorizationState"] = "authorized",
  ): { secretRef: string; version: number } {
    const sealingKey = this.ensureSealingKey();
    const previous = this.store.getLatestSecret(
      connection.organizationId,
      connection.id,
    );
    const version = (previous?.version ?? 0) + 1;
    const secretRef = createSecretRef(
      connection.organizationId,
      connection.id,
      kind,
      version,
    );
    const record: StoredSecretRecord = {
      secretRef,
      organizationId: connection.organizationId,
      connectionId: connection.id,
      version,
      kind,
      metadata,
      envelope: sealSecretPayload(payload, sealingKey),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.putSecret(record);
    this.store.updateConnection(connection.organizationId, connection.id, {
      secretRef,
      secretVersion: version,
      authorizationState: nextAuthorizationState,
    });
    return { secretRef, version };
  }

  private storeDetachedSecret(
    connection: ConnectorConnection,
    kind: SecretKind,
    payload: CredentialInput,
    metadata: Record<string, unknown>,
  ): { secretRef: string; version: number } {
    const sealingKey = this.ensureSealingKey();
    const version = Date.now();
    const secretRef = createSecretRef(
      connection.organizationId,
      connection.id,
      kind,
      version,
    );
    const record: StoredSecretRecord = {
      secretRef,
      organizationId: connection.organizationId,
      connectionId: connection.id,
      version,
      kind,
      metadata,
      envelope: sealSecretPayload(payload, sealingKey),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.putSecret(record);
    return { secretRef, version };
  }

  private getLatestSecretPayload<T extends Record<string, unknown>>(
    connection: ConnectorConnection,
  ): { record: StoredSecretRecord; payload: T } {
    const secret = this.store.getLatestSecret(
      connection.organizationId,
      connection.id,
    );
    if (secret == null) {
      throw new Error("Connection credentials are missing");
    }
    const sealingKey = this.ensureSealingKey();
    return {
      record: secret,
      payload: openSecretPayload<T>(secret.envelope, sealingKey),
    };
  }

  private getSecretPayloadByRef<T extends Record<string, unknown>>(
    secretRef: string,
  ): { record: StoredSecretRecord; payload: T } {
    const secret = this.store.getSecretByRef(secretRef);
    if (secret == null) {
      throw new Error("Referenced secret was not found");
    }
    const sealingKey = this.ensureSealingKey();
    return {
      record: secret,
      payload: openSecretPayload<T>(secret.envelope, sealingKey),
    };
  }

  private resolvePublicIngestUrl(
    organizationId: string,
    connectionId: string,
  ): string {
    const baseUrl = this.requirePublicBaseUrl().replace(/\/$/, "");
    return `${baseUrl}/v1/ingest/${encodeURIComponent(organizationId)}/${encodeURIComponent(
      connectionId,
    )}/events`;
  }

  private getOptionalUrl(
    connection: ConnectorConnection,
    key: string,
    fallback: string | undefined,
  ): string | null {
    const fromConfig = asTrimmedString(connection.config[key]);
    return fromConfig ?? fallback ?? null;
  }

  private validateOutboundUrl(
    rawUrl: string,
    label: string,
    runtimeEnvironment: ConnectorRuntimeEnvironment,
  ): string {
    const policy = this.getOutboundPolicy(runtimeEnvironment);
    return validateOutboundUrl(rawUrl, {
      label,
      nodeEnv: this.nodeEnv,
      allowedHosts: policy.allowedHosts,
      allowlistLabel: policy.allowlistLabel,
      ...(policy.reservedHosts !== undefined
        ? { reservedHosts: policy.reservedHosts }
        : {}),
      ...(policy.reservedLabel !== undefined
        ? { reservedLabel: policy.reservedLabel }
        : {}),
    });
  }

  private validateConnectionUrls(
    vendor: ConnectorVendor,
    runtimeEnvironment: ConnectorRuntimeEnvironment,
    baseUrl: string | null | undefined,
    config: Record<string, unknown>,
  ): void {
    if (baseUrl != null) {
      this.validateOutboundUrl(baseUrl, "baseUrl", runtimeEnvironment);
    }

    const testEndpoint = getConfigUrl(config, "testEndpoint");
    if (testEndpoint != null) {
      this.validateOutboundUrl(
        testEndpoint,
        "config.testEndpoint",
        runtimeEnvironment,
      );
    }

    const catalogItem = this.getCatalogItem(vendor);
    const oauthDefaults = this.getCatalogOAuthDefaults(
      catalogItem,
      runtimeEnvironment,
    );
    const authorizationEndpoint =
      getConfigUrl(config, "authorizationEndpoint") ??
      oauthDefaults?.authorizationEndpoint ??
      null;
    if (authorizationEndpoint != null) {
      this.validateOutboundUrl(
        authorizationEndpoint,
        "authorizationEndpoint",
        runtimeEnvironment,
      );
    }

    const tokenEndpoint =
      getConfigUrl(config, "tokenEndpoint") ??
      oauthDefaults?.tokenEndpoint ??
      null;
    if (tokenEndpoint != null) {
      this.validateOutboundUrl(
        tokenEndpoint,
        "tokenEndpoint",
        runtimeEnvironment,
      );
    }
  }

  private getMissingRequiredConfigFields(
    connection: ConnectorConnection,
    catalogItem: ConnectorCatalogItem,
  ): string[] {
    return catalogItem.requiredConfigFields.filter((field) => {
      if (field === "baseUrl") {
        return asTrimmedString(connection.baseUrl) == null;
      }
      const rawValue = connection.config[field];
      if (typeof rawValue === "string") {
        return asTrimmedString(rawValue) == null;
      }
      if (Array.isArray(rawValue)) {
        return rawValue.length === 0;
      }
      if (isRecord(rawValue)) {
        return Object.keys(rawValue).length === 0;
      }
      return rawValue == null;
    });
  }

  private getMissingCredentialFields(
    connection: ConnectorConnection,
    catalogItem: ConnectorCatalogItem,
  ): string[] {
    if (connection.secretRef != null && connection.secretRef.length > 0) {
      return [];
    }
    return [...(catalogItem.credentialFieldHints[connection.authMode] ?? [])];
  }

  private hasProbeTarget(connection: ConnectorConnection): boolean {
    if (connection.vendor === "custom_data") {
      return true;
    }
    return (
      asTrimmedString(connection.baseUrl) != null ||
      getConfigUrl(connection.config, "testEndpoint") != null
    );
  }

  private hasOAuthEndpoints(
    connection: ConnectorConnection,
    catalogItem: ConnectorCatalogItem,
  ): boolean {
    if (connection.authMode !== "oauth2") {
      return true;
    }

    const oauthDefaults = this.getCatalogOAuthDefaults(
      catalogItem,
      connection.runtimeEnvironment,
    );
    return (
      this.getOptionalUrl(
        connection,
        "authorizationEndpoint",
        oauthDefaults?.authorizationEndpoint,
      ) != null &&
      this.getOptionalUrl(
        connection,
        "tokenEndpoint",
        oauthDefaults?.tokenEndpoint,
      ) != null
    );
  }

  private hasValidEndpointConfiguration(
    connection: ConnectorConnection,
  ): boolean {
    try {
      this.validateConnectionUrls(
        connection.vendor,
        connection.runtimeEnvironment,
        connection.baseUrl,
        connection.config,
      );
      return true;
    } catch {
      return false;
    }
  }

  private buildConnectionActivationReadiness(
    connection: ConnectorConnection,
  ): ConnectorActivationReadiness {
    const catalogItem = this.getCatalogItem(connection.vendor);
    return evaluateConnectionActivationReadiness({
      catalogItem,
      connection,
      missingRequiredConfigFields: this.getMissingRequiredConfigFields(
        connection,
        catalogItem,
      ),
      missingCredentialFields: this.getMissingCredentialFields(
        connection,
        catalogItem,
      ),
      hasStoredCredentials:
        connection.secretRef != null && connection.secretRef.length > 0,
      hasOauthEndpoints: this.hasOAuthEndpoints(connection, catalogItem),
      hasLiveProbeStrategy: this.hasLiveProbeStrategy(connection),
      hasProbeTarget: this.hasProbeTarget(connection),
      hasValidEndpointConfiguration:
        this.hasValidEndpointConfiguration(connection),
    });
  }

  private hasLiveProbeStrategy(connection: ConnectorConnection): boolean {
    return (
      connection.authMode === "oauth2" ||
      connection.authMode === "api_key" ||
      connection.authMode === "session"
    );
  }

  private assertReadyForConnectionTest(connection: ConnectorConnection): void {
    const readiness = this.buildConnectionActivationReadiness(connection);
    if (readiness.isReadyForConnectionTest) {
      return;
    }
    throw new Error(
      `Connection is not ready for test: ${readiness.blockingIssues
        .map((issue) => issue.message)
        .join(" ")}`,
    );
  }

  private assertReadyForSync(connection: ConnectorConnection): void {
    const readiness = this.buildConnectionActivationReadiness(connection);
    if (readiness.isReadyForSync) {
      return;
    }
    const reasons = [
      ...readiness.blockingIssues.map((issue) => issue.message),
      ...readiness.warnings
        .filter((issue) => issue.code === "connection_not_tested")
        .map((issue) => issue.message),
    ];
    throw new Error(`Connection is not ready for sync: ${reasons.join(" ")}`);
  }

  private async ensureOAuthAccessToken(
    connection: ConnectorConnection,
  ): Promise<{
    accessToken: string;
    expiresAt: string | null;
    scopes: string[];
  }> {
    const { record, payload } =
      this.getLatestSecretPayload<Record<string, unknown>>(connection);
    const oauthDefaults = this.getCatalogOAuthDefaults(
      this.getCatalogItem(connection.vendor),
      connection.runtimeEnvironment,
    );
    const tokenEndpoint = this.getOptionalUrl(
      connection,
      "tokenEndpoint",
      oauthDefaults?.tokenEndpoint,
    );
    if (tokenEndpoint == null) {
      throw new Error("OAuth tokenEndpoint is missing from config");
    }
    const validatedTokenEndpoint = this.validateOutboundUrl(
      tokenEndpoint,
      "tokenEndpoint",
      connection.runtimeEnvironment,
    );

    if (record.kind === "oauth2_token") {
      const oauthPayload = payload as OAuthTokenSecretPayload;
      const effectiveTokenEndpoint = this.validateOutboundUrl(
        oauthPayload.tokenEndpoint || validatedTokenEndpoint,
        "tokenEndpoint",
        connection.runtimeEnvironment,
      );
      if (
        !isExpired(oauthPayload.expiresAt) &&
        oauthPayload.accessToken.length > 0
      ) {
        return {
          accessToken: oauthPayload.accessToken,
          expiresAt: oauthPayload.expiresAt,
          scopes: oauthPayload.scope,
        };
      }

      if (oauthPayload.refreshToken == null) {
        throw new Error(
          "OAuth access token expired and no refresh_token is available",
        );
      }

      const refreshed = await refreshAccessToken(
        effectiveTokenEndpoint,
        {
          clientId: oauthPayload.clientId,
          clientSecret: oauthPayload.clientSecret,
        },
        oauthPayload.refreshToken,
      );
      this.storeSecret(
        connection,
        "oauth2_token",
        {
          clientId: oauthPayload.clientId,
          clientSecret: oauthPayload.clientSecret,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          tokenEndpoint: effectiveTokenEndpoint,
          expiresAt: refreshed.expiresAt,
          tokenType: refreshed.tokenType,
          scope: refreshed.scope,
        },
        {
          vendor: connection.vendor,
          refreshed: true,
        },
      );
      return {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        scopes: refreshed.scope,
      };
    }

    if (record.kind !== "oauth2_client") {
      throw new Error("Unexpected credential type for OAuth2 connection");
    }

    const client = payload as OAuthClientSecretPayload;
    const scopes = connection.oauthScopes ?? [];
    const audience =
      asTrimmedString(connection.config["oauthAudience"]) ??
      asTrimmedString(connection.config["audience"]);
    const token = await exchangeClientCredentials(
      validatedTokenEndpoint,
      client,
      scopes,
      {
        audience,
      },
    );
    this.storeSecret(
      connection,
      "oauth2_token",
      {
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenEndpoint,
        expiresAt: token.expiresAt,
        tokenType: token.tokenType,
        scope: token.scope,
      },
      {
        vendor: connection.vendor,
        grantType: "client_credentials",
      },
    );
    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: token.scope,
    };
  }

  private getProviderRuntimeAdditionalHeaders(
    connection: ConnectorConnection,
  ): Record<string, string> | null {
    const additionalHeaders = {
      ...(normalizeHeaderMap(
        connection.config["providerHeaders"],
        "config.providerHeaders",
      ) ?? {}),
    };

    if (connection.vendor === "ukg") {
      const globalTenantId = asTrimmedString(
        connection.config["globalTenantId"],
      );
      if (globalTenantId == null) {
        throw new Error(
          "UKG provider runtime access requires config.globalTenantId",
        );
      }
      additionalHeaders["global-tenant-id"] = globalTenantId;
    }

    if (connection.vendor === "toast") {
      const restaurantExternalId = asTrimmedString(
        connection.config["toastRestaurantExternalId"],
      );
      if (restaurantExternalId == null) {
        throw new Error(
          "Toast provider runtime access requires config.toastRestaurantExternalId",
        );
      }
      additionalHeaders["Toast-Restaurant-External-ID"] = restaurantExternalId;
    }

    return Object.keys(additionalHeaders).length > 0 ? additionalHeaders : null;
  }

  private getProviderRuntimeCredentialFields(
    connection: ConnectorConnection,
  ): Record<string, string> | null {
    if (connection.authMode === "session" && connection.vendor === "geotab") {
      const { payload } =
        this.getLatestSecretPayload<SessionSecretPayload>(connection);
      return {
        database: payload.database,
        userName: payload.username,
        password: payload.password,
      };
    }

    if (connection.authMode === "service_account") {
      const { payload } =
        this.getLatestSecretPayload<CredentialInput>(connection);
      const credentialFields: Record<string, string> = {};
      const clientId = asTrimmedString(payload["clientId"]);
      const clientSecret = asTrimmedString(payload["clientSecret"]);
      const clientEmail = asTrimmedString(payload["clientEmail"]);
      const privateKey = asTrimmedString(payload["privateKey"]);

      if (clientId != null && clientSecret != null) {
        credentialFields["clientId"] = clientId;
        credentialFields["clientSecret"] = clientSecret;
      }
      if (clientEmail != null && privateKey != null) {
        credentialFields["clientEmail"] = clientEmail;
        credentialFields["privateKey"] = privateKey;
      }

      return Object.keys(credentialFields).length > 0 ? credentialFields : null;
    }

    return null;
  }

  private async authenticateGeotabSession(
    connection: ConnectorConnection,
  ): Promise<string> {
    const baseUrl = asTrimmedString(connection.baseUrl);
    if (baseUrl == null) {
      throw new Error("Geotab session auth requires connection.baseUrl");
    }
    const validatedBaseUrl = this.validateOutboundUrl(
      baseUrl,
      "baseUrl",
      connection.runtimeEnvironment,
    );
    const { payload } =
      this.getLatestSecretPayload<SessionSecretPayload>(connection);
    const response = await fetch(validatedBaseUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        method: "Authenticate",
        params: {
          database: payload.database,
          password: payload.password,
          userName: payload.username,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Geotab authenticate returned HTTP ${response.status}`);
    }
    const result = (await response.json()) as {
      result?: {
        credentials?: {
          sessionId?: string;
        };
      };
    };
    const sessionId = asTrimmedString(result.result?.credentials?.sessionId);
    if (sessionId == null) {
      throw new Error("Geotab authenticate did not return a sessionId");
    }
    return sessionId;
  }

  private async probeConnection(connection: ConnectorConnection): Promise<{
    checkedScopes: string[];
    warnings: string[];
    latencyMs: number;
  }> {
    const warnings: string[] = [];
    const probeUrl = asTrimmedString(
      connection.config["testEndpoint"] ?? connection.baseUrl,
    );
    const started = Date.now();

    const headers: Record<string, string> = {
      accept: "application/json",
    };

    if (connection.authMode === "oauth2") {
      const token = await this.ensureOAuthAccessToken(connection);
      if (probeUrl == null) {
        warnings.push(
          "OAuth credentials were validated, but no testEndpoint is configured for a live probe.",
        );
        return {
          checkedScopes: token.scopes.length > 0 ? token.scopes : ["oauth2"],
          warnings,
          latencyMs: Date.now() - started,
        };
      }
      headers["authorization"] = `Bearer ${token.accessToken}`;
      const response = await fetch(
        this.validateOutboundUrl(
          probeUrl,
          "probeUrl",
          connection.runtimeEnvironment,
        ),
        { headers },
      );
      if (!response.ok) {
        throw new Error(`Probe endpoint returned HTTP ${response.status}`);
      }
      return {
        checkedScopes: token.scopes.length > 0 ? token.scopes : ["oauth2"],
        warnings,
        latencyMs: Date.now() - started,
      };
    }

    if (connection.authMode === "api_key") {
      const { payload } = this.getLatestSecretPayload<{ apiKey: string }>(
        connection,
      );
      if (probeUrl == null) {
        warnings.push(
          "API key presence was validated, but no testEndpoint is configured for a live probe.",
        );
        return {
          checkedScopes: ["api_key"],
          warnings,
          latencyMs: Date.now() - started,
        };
      }
      const headerName =
        asTrimmedString(connection.config["authHeaderName"]) ?? "x-api-key";
      const headerPrefix = asTrimmedString(
        connection.config["authHeaderPrefix"],
      );
      headers[headerName] =
        headerPrefix != null
          ? `${headerPrefix} ${payload.apiKey}`
          : payload.apiKey;
      const response = await fetch(
        this.validateOutboundUrl(
          probeUrl,
          "probeUrl",
          connection.runtimeEnvironment,
        ),
        { headers },
      );
      if (!response.ok) {
        throw new Error(`Probe endpoint returned HTTP ${response.status}`);
      }
      return {
        checkedScopes: ["api_key"],
        warnings,
        latencyMs: Date.now() - started,
      };
    }

    if (connection.authMode === "session") {
      if (connection.vendor !== "geotab") {
        throw new Error(
          `No live probe strategy is configured for vendor "${connection.vendor}"`,
        );
      }
      await this.authenticateGeotabSession(connection);
      return {
        checkedScopes: ["session"],
        warnings,
        latencyMs: Date.now() - started,
      };
    }

    throw new Error(
      `No live probe strategy is configured for auth mode "${connection.authMode}"`,
    );
  }

  private normalizeIngestAllowedSourceObjects(
    connection: ConnectorConnection,
    allowedSourceObjects: string[] | null | undefined,
  ): string[] | null {
    if (allowedSourceObjects == null || allowedSourceObjects.length === 0) {
      return null;
    }

    const allowlist = new Set(connection.sourceObjects);
    const normalized = Array.from(
      new Set(
        allowedSourceObjects
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0),
      ),
    );

    if (normalized.length === 0) {
      return null;
    }

    for (const sourceObject of normalized) {
      if (!allowlist.has(sourceObject)) {
        throw new Error(
          `Unsupported source object "${sourceObject}" for inbound ingestion`,
        );
      }
    }

    return normalized;
  }

  private authenticateIngestCredential(
    organizationId: string,
    connectionId: string,
    auth: IngestAuthContext,
  ): { credential: IngestCredential; secret: IngestClientSecretPayload } {
    const authorizationValue = auth.authorizationHeader?.trim() ?? "";
    const [scheme, token] = authorizationValue.split(/\s+/, 2);
    if (
      scheme?.toLowerCase() !== "bearer" ||
      token == null ||
      token.length < 16
    ) {
      throw new IngestAuthenticationError(
        "A valid Bearer ingestion API key is required",
        "missing_or_invalid_bearer_token",
      );
    }

    const credentials = this.store.listIngestCredentials(
      organizationId,
      connectionId,
    );
    for (const credential of credentials) {
      if (credential.revokedAt != null) {
        continue;
      }
      if (
        credential.expiresAt != null &&
        Date.parse(credential.expiresAt) <= Date.now()
      ) {
        continue;
      }
      const { payload } = this.getSecretPayloadByRef<IngestClientSecretPayload>(
        credential.secretRef,
      );
      if (!safeEqualSecret(payload.apiKey, token)) {
        continue;
      }

      if (
        credential.allowedIpAddresses != null &&
        credential.allowedIpAddresses.length > 0 &&
        (auth.clientIp == null ||
          !credential.allowedIpAddresses.includes(auth.clientIp))
      ) {
        throw new IngestAuthenticationError(
          "The ingestion credential is not allowed from this client IP",
          "client_ip_not_allowlisted",
        );
      }

      if (credential.authMode === "bearer_hmac") {
        if (auth.keyIdHeader?.trim() !== credential.keyId) {
          throw new IngestAuthenticationError(
            "Missing or invalid X-Praedixa-Key-Id header",
            "invalid_key_id",
          );
        }
        if (!isFreshUnixTimestamp(auth.timestampHeader, 300)) {
          throw new IngestAuthenticationError(
            "X-Praedixa-Timestamp is missing or outside the allowed time window",
            "invalid_timestamp",
          );
        }
        if (
          payload.signingSecret == null ||
          payload.signingSecret.length < 16
        ) {
          throw new IngestAuthenticationError(
            "Signing secret is unavailable for this ingestion credential",
            "missing_signing_secret",
          );
        }
        const rawBody = auth.rawBody ?? "";
        const signedPayload = `${auth.timestampHeader}.${rawBody}`;
        if (
          !verifyHmacSha256(
            signedPayload,
            auth.signatureHeader,
            payload.signingSecret,
          )
        ) {
          throw new IngestAuthenticationError(
            "Invalid X-Praedixa-Signature header",
            "invalid_signature",
          );
        }
      }

      return {
        credential,
        secret: payload,
      };
    }

    throw new IngestAuthenticationError(
      "The ingestion API key is invalid, revoked or expired",
      "credential_not_found",
    );
  }

  issueIngestCredential(
    organizationId: string,
    connectionId: string,
    input: IssueIngestCredentialInput,
    context: AuditContext,
  ): IssueIngestCredentialResult {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);

    const label = input.label.trim();
    if (label.length < 3) {
      throw new Error("label must be at least 3 characters");
    }

    const expiresAt = parseIsoDate(input.expiresAt ?? null);
    if (expiresAt != null && Date.parse(expiresAt) <= Date.now()) {
      throw new Error("expiresAt must be in the future");
    }

    const requireSignature = input.requireSignature !== false;
    const keyId = randomUUID();
    const apiKey = createOpaqueApiKey();
    const signingSecret = requireSignature
      ? createOpaqueApiKey("prdx_sig")
      : null;
    const authMode: IngestCredentialAuthMode = requireSignature
      ? "bearer_hmac"
      : "bearer";
    const stored = this.storeDetachedSecret(
      connection,
      "ingest_client",
      {
        apiKey,
        signingSecret,
        keyId,
      },
      {
        vendor: connection.vendor,
        connectionId,
        purpose: "inbound_ingestion",
      },
    );

    const credential = this.store.createIngestCredential(
      organizationId,
      connectionId,
      {
        label,
        keyId,
        authMode,
        secretRef: stored.secretRef,
        secretVersion: stored.version,
        tokenPreview: apiKey.slice(0, 10),
        allowedSourceObjects: this.normalizeIngestAllowedSourceObjects(
          connection,
          input.allowedSourceObjects ?? null,
        ),
        allowedIpAddresses:
          normalizeStringArray(input.allowedIpAddresses) ?? null,
        expiresAt,
      },
    );

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.ingest_credential.issued",
      {
        credentialId: credential.id,
        keyId,
        authMode,
        expiresAt,
        allowedSourceObjects: credential.allowedSourceObjects,
        allowedIpAddressesCount: credential.allowedIpAddresses?.length ?? 0,
      },
      context,
    );

    return {
      credential,
      apiKey,
      signingSecret,
      ingestUrl: this.resolvePublicIngestUrl(organizationId, connectionId),
      authScheme: "Bearer",
      signature:
        authMode === "bearer_hmac"
          ? {
              algorithm: "hmac-sha256",
              keyIdHeader: "X-Praedixa-Key-Id",
              timestampHeader: "X-Praedixa-Timestamp",
              signatureHeader: "X-Praedixa-Signature",
            }
          : null,
    };
  }

  revokeIngestCredential(
    organizationId: string,
    connectionId: string,
    credentialId: string,
    context: AuditContext,
  ): IngestCredential {
    const credential = this.store.updateIngestCredential(
      organizationId,
      connectionId,
      credentialId,
      {
        revokedAt: new Date().toISOString(),
      },
    );
    if (credential == null) {
      throw new Error("Ingestion credential not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.ingest_credential.revoked",
      {
        credentialId,
        keyId: credential.keyId,
      },
      context,
    );

    return credential;
  }

  private async persistRawEvents(
    connection: ConnectorConnection,
    input: {
      schemaVersion: string;
      events: IngestEventsInput["events"];
    },
    options: {
      credentialId: string;
      idempotencyKey: string;
    },
  ): Promise<{
    acceptedEvents: IngestRawEvent[];
    duplicates: number;
    receivedAt: string;
  }> {
    const allowedSourceObjects = new Set(connection.sourceObjects);
    const acceptedEvents: IngestRawEvent[] = [];
    const payloadStore = this.requirePayloadStore();
    let duplicates = 0;
    const receivedAt = new Date().toISOString();

    for (const event of input.events) {
      if (!allowedSourceObjects.has(event.sourceObject)) {
        throw new Error(
          `Source object "${event.sourceObject}" is not allowed for this connection`,
        );
      }

      const preview = redactPreviewPayload(event.payload);
      const rawPayload = JSON.stringify(event.payload);
      const payloadHash = payloadSha256(rawPayload);
      const eventId =
        asTrimmedString(event.eventId) ??
        payloadSha256(
          `${event.sourceObject}|${event.sourceRecordId}|${event.sourceUpdatedAt ?? ""}|${payloadHash}`,
        );
      if (
        this.store.findRawEventByEventId(
          connection.organizationId,
          connection.id,
          eventId,
        ) != null
      ) {
        duplicates += 1;
        continue;
      }
      const payloadObject = await payloadStore.putJson(
        connection.organizationId,
        connection.id,
        eventId,
        event.payload,
      );

      const rawEvent: IngestRawEvent = {
        id: randomUUID(),
        organizationId: connection.organizationId,
        connectionId: connection.id,
        credentialId: options.credentialId,
        eventId,
        sourceObject: event.sourceObject,
        sourceRecordId: event.sourceRecordId,
        sourceUpdatedAt: parseIsoDate(event.sourceUpdatedAt ?? null),
        schemaVersion: input.schemaVersion,
        contentType:
          asTrimmedString(event.contentType) ?? payloadObject.contentType,
        payloadSha256: payloadHash,
        payloadPreview: preview,
        objectStoreKey: payloadObject.key,
        sizeBytes: payloadObject.sizeBytes,
        idempotencyKey: options.idempotencyKey,
        processingStatus: "pending",
        claimedAt: null,
        claimedBy: null,
        processedAt: null,
        errorMessage: null,
        receivedAt,
      };

      const stored = this.store.createRawEvent(rawEvent);
      if (!stored.created) {
        duplicates += 1;
        continue;
      }
      acceptedEvents.push(stored.event);
    }

    return {
      acceptedEvents,
      duplicates,
      receivedAt,
    };
  }

  async ingestEvents(
    organizationId: string,
    connectionId: string,
    input: IngestEventsInput,
    auth: IngestAuthContext,
    idempotencyKey: string,
  ): Promise<IngestEventsResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    if (connection.status === "disabled") {
      throw new Error("Connection is disabled");
    }
    if (input.events.length === 0) {
      throw new Error("At least one event is required");
    }

    const { credential } = this.authenticateIngestCredential(
      organizationId,
      connectionId,
      auth,
    );
    const startedAt = new Date().toISOString();
    const dispatch = this.store.createSyncRun(
      organizationId,
      connectionId,
      "webhook",
      idempotencyKey,
      {
        status: "running",
        startedAt,
        availableAt: startedAt,
        priority: 20,
      },
    );

    if (!dispatch.created) {
      return {
        accepted: dispatch.run.recordsWritten,
        duplicates: Math.max(
          0,
          dispatch.run.recordsFetched - dispatch.run.recordsWritten,
        ),
        runId: dispatch.run.id,
        receivedAt: dispatch.run.endedAt ?? dispatch.run.createdAt,
        events: [],
      };
    }

    const allowedSourceObjects = new Set(
      credential.allowedSourceObjects ?? connection.sourceObjects,
    );
    const filteredInput: IngestEventsInput = {
      schemaVersion: input.schemaVersion,
      sentAt: input.sentAt ?? null,
      events: input.events.filter((event) => {
        if (!allowedSourceObjects.has(event.sourceObject)) {
          throw new Error(
            `Source object "${event.sourceObject}" is not allowed for this credential`,
          );
        }
        return true;
      }),
    };
    try {
      const { acceptedEvents, duplicates, receivedAt } =
        await this.persistRawEvents(connection, filteredInput, {
          credentialId: credential.id,
          idempotencyKey,
        });

      this.store.updateIngestCredential(
        organizationId,
        connectionId,
        credential.id,
        {
          lastUsedAt: receivedAt,
        },
      );
      this.store.updateConnection(organizationId, connectionId, {
        status: "active",
        lastSuccessfulSyncAt: receivedAt,
      });
      this.store.updateSyncRun(organizationId, dispatch.run.id, {
        status: "success",
        recordsFetched: input.events.length,
        recordsWritten: acceptedEvents.length,
        startedAt,
        endedAt: receivedAt,
      });
      this.recordAuditEvent(
        organizationId,
        connectionId,
        "connectors.ingest.accepted",
        {
          credentialId: credential.id,
          keyId: credential.keyId,
          accepted: acceptedEvents.length,
          duplicates,
          schemaVersion: input.schemaVersion,
        },
        {
          actorService: `ingest:${credential.keyId}`,
          actorUserId: null,
          requestId: null,
        },
      );

      return {
        accepted: acceptedEvents.length,
        duplicates,
        runId: dispatch.run.id,
        receivedAt,
        events: acceptedEvents,
      };
    } catch (error) {
      const failedAt = new Date().toISOString();
      this.store.updateSyncRun(organizationId, dispatch.run.id, {
        status: "failed",
        errorClass: error instanceof Error ? error.name : "Error",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 400)
            : "Unhandled ingestion failure",
        endedAt: failedAt,
        availableAt: failedAt,
      });
      throw error;
    }
  }

  async getProviderRuntimeAccessContext(
    organizationId: string,
    connectionId: string,
  ): Promise<ProviderRuntimeAccessContext> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    if (connection.status === "disabled") {
      throw new Error("Connection is disabled");
    }
    const baseUrl = asTrimmedString(connection.baseUrl);
    if (baseUrl == null) {
      throw new Error(
        "Connection baseUrl is required for provider runtime access",
      );
    }
    const validatedBaseUrl = this.validateOutboundUrl(
      baseUrl,
      "baseUrl",
      connection.runtimeEnvironment,
    );

    if (connection.authMode === "oauth2") {
      const token = await this.ensureOAuthAccessToken(connection);
      const additionalHeaders =
        this.getProviderRuntimeAdditionalHeaders(connection);
      return {
        organizationId,
        connectionId,
        vendor: connection.vendor,
        authMode: connection.authMode,
        runtimeEnvironment: connection.runtimeEnvironment,
        baseUrl: validatedBaseUrl,
        sourceObjects: [...connection.sourceObjects],
        authorization: {
          headerName: "authorization",
          headerValue: `Bearer ${token.accessToken}`,
          scopes: token.scopes,
          additionalHeaders,
          credentialFields: null,
        },
      };
    }

    if (connection.authMode === "api_key") {
      const { payload } = this.getLatestSecretPayload<{ apiKey: string }>(
        connection,
      );
      const headerName =
        asTrimmedString(connection.config["authHeaderName"]) ?? "x-api-key";
      const headerPrefix = asTrimmedString(
        connection.config["authHeaderPrefix"],
      );
      const additionalHeaders =
        this.getProviderRuntimeAdditionalHeaders(connection);
      return {
        organizationId,
        connectionId,
        vendor: connection.vendor,
        authMode: connection.authMode,
        runtimeEnvironment: connection.runtimeEnvironment,
        baseUrl: validatedBaseUrl,
        sourceObjects: [...connection.sourceObjects],
        authorization: {
          headerName,
          headerValue:
            headerPrefix != null
              ? `${headerPrefix} ${payload.apiKey}`
              : payload.apiKey,
          scopes: null,
          additionalHeaders,
          credentialFields: null,
        },
      };
    }

    if (connection.authMode === "session") {
      const additionalHeaders =
        this.getProviderRuntimeAdditionalHeaders(connection);
      return {
        organizationId,
        connectionId,
        vendor: connection.vendor,
        authMode: connection.authMode,
        runtimeEnvironment: connection.runtimeEnvironment,
        baseUrl: validatedBaseUrl,
        sourceObjects: [...connection.sourceObjects],
        authorization: {
          headerName: "",
          headerValue: "",
          scopes: null,
          additionalHeaders,
          credentialFields: this.getProviderRuntimeCredentialFields(connection),
        },
      };
    }

    if (connection.authMode === "service_account") {
      const additionalHeaders =
        this.getProviderRuntimeAdditionalHeaders(connection);
      return {
        organizationId,
        connectionId,
        vendor: connection.vendor,
        authMode: connection.authMode,
        runtimeEnvironment: connection.runtimeEnvironment,
        baseUrl: validatedBaseUrl,
        sourceObjects: [...connection.sourceObjects],
        authorization: {
          headerName: "",
          headerValue: "",
          scopes: null,
          additionalHeaders,
          credentialFields: this.getProviderRuntimeCredentialFields(connection),
        },
      };
    }

    throw new Error(
      `Provider runtime access is not supported for auth mode "${connection.authMode}"`,
    );
  }

  async getProviderRuntimeAccessContextForRun(
    organizationId: string,
    connectionId: string,
    input: {
      syncRunId: string;
      lockToken: string;
    },
  ): Promise<ProviderRuntimeAccessContext> {
    let run = this.getSyncRunOrThrow(organizationId, input.syncRunId);
    const lockToken = input.lockToken.trim();
    if (lockToken.length < 16) {
      throw new Error("lockToken must be at least 16 characters");
    }
    if (run.connectionId !== connectionId) {
      throw new Error("Sync run does not belong to this connection");
    }
    this.assertSyncRunOwnedByWorker(run, lockToken);
    run = this.refreshOwnedSyncRunLease(organizationId, run);
    return await this.getProviderRuntimeAccessContext(
      organizationId,
      run.connectionId,
    );
  }

  async ingestProviderEvents(
    organizationId: string,
    connectionId: string,
    input: ProviderEventsIngestInput,
    context: AuditContext,
  ): Promise<ProviderEventsIngestResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    if (connection.status === "disabled") {
      throw new Error("Connection is disabled");
    }
    if (input.events.length === 0) {
      throw new Error("At least one provider event is required");
    }

    let run = this.getSyncRunOrThrow(organizationId, input.syncRunId);
    if (run.connectionId !== connectionId) {
      throw new Error("Sync run does not belong to this connection");
    }
    const workerId = input.workerId.trim();
    if (workerId.length < 3) {
      throw new Error("workerId must be at least 3 characters");
    }
    this.assertSyncRunOwnedByWorker(run, workerId);
    run = this.refreshOwnedSyncRunLease(organizationId, run);

    const { acceptedEvents, duplicates, receivedAt } =
      await this.persistRawEvents(
        connection,
        {
          schemaVersion: input.schemaVersion,
          events: input.events,
        },
        {
          credentialId: `runtime-sync:${run.id}`,
          idempotencyKey: `runtime-sync:${run.id}`,
        },
      );

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.provider_events.accepted",
      {
        runId: run.id,
        workerId: context.actorService ?? workerId,
        accepted: acceptedEvents.length,
        duplicates,
        schemaVersion: input.schemaVersion,
      },
      context,
    );

    return {
      accepted: acceptedEvents.length,
      duplicates,
      receivedAt,
      events: acceptedEvents,
    };
  }

  createConnection(
    organizationId: string,
    input: CreateConnectionInput,
    context: AuditContext,
  ): ConnectorConnection {
    const catalogItem = this.getCatalogItem(input.vendor);
    this.assertAuthModeAllowed(catalogItem, input.authMode);

    if (input.displayName.trim().length < 3) {
      throw new Error("displayName must be at least 3 characters");
    }

    const config = isRecord(input.config) ? input.config : {};
    assertNoSecretsInConfig(config);
    const runtimeEnvironment = input.runtimeEnvironment ?? "production";
    const oauthDefaults = this.getCatalogOAuthDefaults(
      catalogItem,
      runtimeEnvironment,
    );
    this.validateConnectionUrls(
      input.vendor,
      runtimeEnvironment,
      input.baseUrl ?? null,
      config,
    );
    const sourceObjects = this.normalizeSourceObjects(
      catalogItem,
      input.sourceObjects,
    );

    const connection = this.store.createConnection(organizationId, {
      ...input,
      runtimeEnvironment,
      config: redactSensitive(config),
      sourceObjects,
      syncIntervalMinutes:
        input.syncIntervalMinutes ?? catalogItem.recommendedSyncMinutes,
      baseUrl: input.baseUrl ?? null,
      oauthScopes:
        input.oauthScopes?.length != null && input.oauthScopes.length > 0
          ? [...input.oauthScopes]
          : oauthDefaults?.defaultScopes != null
            ? [...oauthDefaults.defaultScopes]
            : null,
    });

    if (input.credentials != null) {
      const normalized = normalizeCredentialPayload(
        input.authMode,
        input.credentials,
      );
      this.storeSecret(
        connection,
        normalized.kind,
        normalized.payload,
        {
          vendor: connection.vendor,
          authMode: connection.authMode,
        },
        connection.authMode === "oauth2" ? "not_started" : "authorized",
      );
    }

    this.recordAuditEvent(
      organizationId,
      connection.id,
      "connectors.connection.created",
      {
        vendor: connection.vendor,
        runtimeEnvironment: connection.runtimeEnvironment,
        authMode: connection.authMode,
        sourceObjects: connection.sourceObjects,
        hasCredentials: input.credentials != null || input.secretRef != null,
      },
      context,
    );

    return (
      this.store.getConnection(organizationId, connection.id) ?? connection
    );
  }

  updateConnection(
    organizationId: string,
    connectionId: string,
    input: UpdateConnectionInput,
    context: AuditContext,
  ): ConnectorConnection {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    const catalogItem = this.getCatalogItem(connection.vendor);
    const nextRuntimeEnvironment =
      input.runtimeEnvironment ?? connection.runtimeEnvironment;
    const nextConfig = isRecord(input.config)
      ? input.config
      : connection.config;
    assertNoSecretsInConfig(nextConfig);
    this.validateConnectionUrls(
      connection.vendor,
      nextRuntimeEnvironment,
      input.baseUrl ?? connection.baseUrl,
      nextConfig,
    );
    const nextSourceObjects = this.normalizeSourceObjects(
      catalogItem,
      input.sourceObjects ?? connection.sourceObjects,
    );
    const nextStatus = input.status ?? connection.status;
    const disabledReason =
      nextStatus === "disabled"
        ? (asTrimmedString(input.disabledReason ?? connection.disabledReason) ??
          "Disabled by operator")
        : null;

    const updated = this.store.updateConnection(organizationId, connectionId, {
      displayName: input.displayName?.trim() || connection.displayName,
      runtimeEnvironment: nextRuntimeEnvironment,
      config: redactSensitive(nextConfig),
      sourceObjects: nextSourceObjects,
      syncIntervalMinutes:
        input.syncIntervalMinutes ?? connection.syncIntervalMinutes,
      webhookEnabled: input.webhookEnabled ?? connection.webhookEnabled,
      baseUrl: input.baseUrl ?? connection.baseUrl,
      externalAccountId:
        input.externalAccountId ?? connection.externalAccountId,
      oauthScopes: input.oauthScopes ?? connection.oauthScopes,
      status: nextStatus,
      disabledReason,
    });
    if (updated == null) {
      throw new Error("Connection not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.connection.updated",
      {
        runtimeEnvironment: updated.runtimeEnvironment,
        status: updated.status,
        syncIntervalMinutes: updated.syncIntervalMinutes,
        webhookEnabled: updated.webhookEnabled,
      },
      context,
    );

    return updated;
  }

  startAuthorization(
    organizationId: string,
    connectionId: string,
    input: AuthorizationStartInput,
    context: AuditContext,
  ): AuthorizationStartResult {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    if (connection.authMode !== "oauth2") {
      throw new Error(
        "Authorization start is only supported for oauth2 connections",
      );
    }

    const catalogItem = this.getCatalogItem(connection.vendor);
    const oauthDefaults = this.getCatalogOAuthDefaults(
      catalogItem,
      connection.runtimeEnvironment,
    );
    const authorizationEndpoint =
      input.authorizationEndpoint ??
      this.getOptionalUrl(
        connection,
        "authorizationEndpoint",
        oauthDefaults?.authorizationEndpoint,
      );
    const tokenEndpoint =
      input.tokenEndpoint ??
      this.getOptionalUrl(
        connection,
        "tokenEndpoint",
        oauthDefaults?.tokenEndpoint,
      );
    if (authorizationEndpoint == null || tokenEndpoint == null) {
      throw new Error(
        "OAuth authorizationEndpoint and tokenEndpoint are required",
      );
    }
    const validatedAuthorizationEndpoint = this.validateOutboundUrl(
      authorizationEndpoint,
      "authorizationEndpoint",
      connection.runtimeEnvironment,
    );
    const validatedTokenEndpoint = this.validateOutboundUrl(
      tokenEndpoint,
      "tokenEndpoint",
      connection.runtimeEnvironment,
    );

    if (input.clientCredentials != null) {
      const normalized = normalizeCredentialPayload(
        "oauth2",
        input.clientCredentials,
      );
      this.storeSecret(
        connection,
        normalized.kind,
        normalized.payload,
        {
          vendor: connection.vendor,
          authMode: connection.authMode,
        },
        "awaiting_authorization",
      );
    }

    const { payload } =
      this.getLatestSecretPayload<OAuthClientSecretPayload>(connection);
    const scopes =
      input.scopes?.length != null && input.scopes.length > 0
        ? [...input.scopes]
        : (connection.oauthScopes ?? oauthDefaults?.defaultScopes ?? []);
    const session: AuthorizationSession = {
      id: randomUUID(),
      organizationId,
      connectionId,
      vendor: connection.vendor,
      redirectUri: input.redirectUri,
      authorizationEndpoint: validatedAuthorizationEndpoint,
      tokenEndpoint: validatedTokenEndpoint,
      state: createOpaqueStateToken(),
      codeVerifier: createPkceVerifier(),
      scopes,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.store.createAuthorizationSession(session);
    this.store.updateConnection(organizationId, connectionId, {
      authorizationState: "awaiting_authorization",
      oauthScopes: scopes,
      config: redactSensitive({
        ...connection.config,
        authorizationEndpoint: validatedAuthorizationEndpoint,
        tokenEndpoint: validatedTokenEndpoint,
      }),
    });

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.authorization.started",
      {
        scopes,
        expiresAt: session.expiresAt,
      },
      context,
    );

    return {
      authorizationUrl: buildAuthorizationUrl(session, payload),
      expiresAt: session.expiresAt,
      state: session.state,
    };
  }

  private getActiveAuthorizationSession(
    connection: ConnectorConnection,
  ): AuthorizationSession {
    const session = this.store.getAuthorizationSession(
      connection.organizationId,
      connection.id,
    );
    if (session == null) {
      throw new Error("No pending OAuth authorization session found");
    }
    if (Date.parse(session.expiresAt) < Date.now()) {
      this.store.deleteAuthorizationSession(connection.id);
      throw new Error("OAuth authorization session expired");
    }
    return session;
  }

  private completeNonOAuthAuthorization(
    connection: ConnectorConnection,
    credentials: CredentialInput,
    context: AuditContext,
  ): AuthorizationCompleteResult {
    const normalized = normalizeCredentialPayload(
      connection.authMode,
      credentials,
    );
    const stored = this.storeSecret(
      connection,
      normalized.kind,
      normalized.payload,
      {
        vendor: connection.vendor,
        authMode: connection.authMode,
      },
    );
    this.recordAuditEvent(
      connection.organizationId,
      connection.id,
      "connectors.authorization.completed",
      {
        authMode: connection.authMode,
        secretVersion: stored.version,
      },
      context,
    );
    return {
      authorized: true,
      secretRef: stored.secretRef,
      secretVersion: stored.version,
      expiresAt: null,
      scopes: connection.oauthScopes ?? [],
    };
  }

  private async completeOAuthCodeAuthorization(
    connection: ConnectorConnection,
    input: AuthorizationCompleteInput,
    context: AuditContext,
  ): Promise<AuthorizationCompleteResult> {
    const session = this.getActiveAuthorizationSession(connection);
    if (input.state !== session.state) {
      throw new Error("OAuth state mismatch");
    }

    const { payload } =
      this.getLatestSecretPayload<OAuthClientSecretPayload>(connection);
    const token = await exchangeAuthorizationCode(
      session,
      payload,
      input.code ?? "",
    );
    const stored = this.storeSecret(
      connection,
      "oauth2_token",
      {
        clientId: payload.clientId,
        clientSecret: payload.clientSecret,
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        tokenEndpoint: session.tokenEndpoint,
        expiresAt: token.expiresAt,
        tokenType: token.tokenType,
        scope: token.scope,
      },
      {
        vendor: connection.vendor,
        grantType: "authorization_code",
      },
    );
    this.store.deleteAuthorizationSession(connection.id);
    this.store.updateConnection(connection.organizationId, connection.id, {
      authorizationState: "authorized",
      oauthScopes:
        token.scope.length > 0 ? token.scope : connection.oauthScopes,
    });
    this.recordAuditEvent(
      connection.organizationId,
      connection.id,
      "connectors.authorization.completed",
      {
        grantType: "authorization_code",
        secretVersion: stored.version,
        expiresAt: token.expiresAt,
      },
      context,
    );
    return {
      authorized: true,
      secretRef: stored.secretRef,
      secretVersion: stored.version,
      expiresAt: token.expiresAt,
      scopes: token.scope,
    };
  }

  private completeOAuthCredentialAuthorization(
    connection: ConnectorConnection,
    credentials: CredentialInput,
    context: AuditContext,
  ): AuthorizationCompleteResult {
    const normalized = normalizeCredentialPayload("oauth2", credentials);
    const stored = this.storeSecret(
      connection,
      normalized.kind,
      normalized.payload,
      {
        vendor: connection.vendor,
        grantType: "client_credentials",
      },
    );
    this.store.deleteAuthorizationSession(connection.id);
    this.store.updateConnection(connection.organizationId, connection.id, {
      authorizationState: "authorized",
    });
    this.recordAuditEvent(
      connection.organizationId,
      connection.id,
      "connectors.authorization.completed",
      {
        grantType: "client_credentials",
        secretVersion: stored.version,
      },
      context,
    );
    return {
      authorized: true,
      secretRef: stored.secretRef,
      secretVersion: stored.version,
      expiresAt: null,
      scopes: connection.oauthScopes ?? [],
    };
  }

  async completeAuthorization(
    organizationId: string,
    connectionId: string,
    input: AuthorizationCompleteInput,
    context: AuditContext,
  ): Promise<AuthorizationCompleteResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);

    if (connection.authMode !== "oauth2") {
      if (input.credentials == null) {
        throw new Error("credentials are required to complete authorization");
      }
      return this.completeNonOAuthAuthorization(
        connection,
        input.credentials,
        context,
      );
    }

    if (input.code != null) {
      return await this.completeOAuthCodeAuthorization(
        connection,
        input,
        context,
      );
    }

    if (input.credentials == null) {
      throw new Error("Either code/state or credentials are required");
    }
    return this.completeOAuthCredentialAuthorization(
      connection,
      input.credentials,
      context,
    );
  }

  async testConnection(
    organizationId: string,
    connectionId: string,
    context: AuditContext,
  ): Promise<TestConnectionResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    this.assertReadyForConnectionTest(connection);

    const probe = await this.probeConnection(connection);
    const nextScheduledSyncAt = new Date(
      Date.now() + connection.syncIntervalMinutes * 60 * 1000,
    ).toISOString();
    this.store.updateConnection(organizationId, connectionId, {
      status: "active",
      authorizationState: "authorized",
      lastTestedAt: new Date().toISOString(),
      nextScheduledSyncAt,
    });
    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.connection.tested",
      {
        checkedScopes: probe.checkedScopes,
        warningsCount: probe.warnings.length,
      },
      context,
    );

    return {
      ok: true,
      latencyMs: probe.latencyMs,
      checkedScopes: probe.checkedScopes,
      warnings: probe.warnings,
    };
  }

  async triggerSync(
    organizationId: string,
    connectionId: string,
    input: TriggerSyncInput,
    idempotencyKey: string,
    context: AuditContext,
  ): Promise<SyncDispatchResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    this.assertReadyForSync(connection);

    const sourceWindowStart = parseIsoDate(input.sourceWindowStart);
    const sourceWindowEnd = parseIsoDate(input.sourceWindowEnd);
    if (sourceWindowStart != null && sourceWindowEnd != null) {
      if (Date.parse(sourceWindowStart) > Date.parse(sourceWindowEnd)) {
        throw new Error("sourceWindowStart must be before sourceWindowEnd");
      }
    }

    const dispatch = this.store.createSyncRun(
      organizationId,
      connectionId,
      input.triggerType,
      idempotencyKey,
      {
        forceFullSync: input.forceFullSync,
        sourceWindowStart,
        sourceWindowEnd,
        availableAt: new Date().toISOString(),
      },
    );
    if (dispatch.created) {
      this.recordAuditEvent(
        organizationId,
        connectionId,
        "connectors.sync.queued",
        {
          runId: dispatch.run.id,
          triggerType: input.triggerType,
          forceFullSync: input.forceFullSync,
          sourceWindowStart,
          sourceWindowEnd,
        },
        context,
      );
    }
    return dispatch;
  }

  listSyncRuns(
    organizationId: string,
    connectionId?: string | null,
  ): SyncRun[] {
    return this.store.listSyncRuns(organizationId, connectionId);
  }

  getSyncRun(organizationId: string, runId: string): SyncRun | null {
    return this.store.getSyncRun(organizationId, runId);
  }
}

export async function createDefaultConnectorService(): Promise<ConnectorService> {
  const runtimeEnv =
    process.env["NODE_ENV"] === "test"
      ? {
          ...process.env,
          NODE_ENV: "development",
          DATABASE_URL: "",
          CORS_ORIGINS: "",
          CONNECTORS_PUBLIC_BASE_URL:
            process.env["CONNECTORS_PUBLIC_BASE_URL"] ??
            "http://127.0.0.1:8100",
          CONNECTORS_SERVICE_TOKENS:
            process.env["CONNECTORS_SERVICE_TOKENS"] ??
            JSON.stringify([
              {
                name: "test-runtime",
                token: "t".repeat(32),
                allowedOrgs: ["test-org"],
                capabilities: ["catalog:read"],
              },
            ]),
        }
      : process.env;
  const config = loadConfig(runtimeEnv);
  const databaseUrl = config.databaseUrl;
  const store = databaseUrl
    ? new PostgresBackedConnectorStore(databaseUrl)
    : new InMemoryConnectorStore();
  if (store instanceof PostgresBackedConnectorStore) {
    await store.ready();
  }

  return new ConnectorService(
    store,
    config.secretSealingKey,
    config.publicBaseUrl,
    new LocalFilePayloadStore(config.objectStoreRoot),
    config.nodeEnv,
    config.allowedOutboundHosts,
    config.allowedSandboxOutboundHosts,
  );
}
