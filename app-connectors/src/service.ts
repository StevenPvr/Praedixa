import { randomUUID } from "node:crypto";

import { CONNECTOR_CATALOG } from "./catalog.js";
import { LocalFilePayloadStore, type PayloadStore } from "./payload-store.js";
import { PostgresBackedConnectorStore } from "./persistent-store.js";
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
  ConnectorAuditEvent,
  ConnectorCatalogItem,
  ConnectorConnection,
  ConnectorVendor,
  CreateConnectionInput,
  CredentialInput,
  IngestAuthContext,
  IngestCredential,
  IngestCredentialAuthMode,
  IngestEventsInput,
  IngestEventsResult,
  IngestRawEvent,
  IssueIngestCredentialInput,
  IssueIngestCredentialResult,
  SecretKind,
  StoredSecretRecord,
  SyncDispatchResult,
  SyncRun,
  TestConnectionResult,
  TriggerSyncInput,
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

function normalizeStringArray(
  value: unknown,
): string[] | null {
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

function isExpired(expiresAt: string | null, skewSeconds = 60): boolean {
  if (expiresAt == null) {
    return false;
  }
  return Date.parse(expiresAt) <= Date.now() + skewSeconds * 1000;
}

function assertNoSecretsInConfig(config: Record<string, unknown>): void {
  if (containsSensitiveKeys(config)) {
    throw new Error("Secrets must be sent via credentials, never inside config");
  }
}

function normalizeApiKeyCredentials(credentials: CredentialInput): CredentialInput {
  const apiKey = asTrimmedString(credentials.apiKey);
  if (apiKey == null || apiKey.length < 8) {
    throw new Error("apiKey is required");
  }
  return { apiKey };
}

function normalizeServiceAccountCredentials(credentials: CredentialInput): CredentialInput {
  const clientId = asTrimmedString(credentials.clientId);
  const clientSecret = asTrimmedString(credentials.clientSecret);
  const clientEmail = asTrimmedString(credentials.clientEmail);
  const privateKey = asTrimmedString(credentials.privateKey);
  const username = asTrimmedString(credentials.username);
  const password = asTrimmedString(credentials.password);

  if (clientId != null && clientSecret != null) {
    return { clientId, clientSecret };
  }
  if (clientEmail != null && privateKey != null) {
    return { clientEmail, privateKey };
  }
  if (username != null && password != null) {
    return { username, password };
  }

  throw new Error(
    "service_account credentials require clientId/clientSecret, clientEmail/privateKey or username/password",
  );
}

function normalizeSftpCredentials(credentials: CredentialInput): CredentialInput {
  const host = asTrimmedString(credentials.host);
  const username = asTrimmedString(credentials.username);
  const password = asTrimmedString(credentials.password);
  const privateKey = asTrimmedString(credentials.privateKey);
  const port =
    typeof credentials.port === "number"
      ? credentials.port
      : typeof credentials.port === "string"
        ? Number(credentials.port)
        : 22;

  if (host == null || username == null || (!password && !privateKey)) {
    throw new Error("sftp credentials require host, username and password or privateKey");
  }
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("sftp port must be a valid TCP port");
  }

  return {
    host,
    username,
    ...(password ? { password } : {}),
    ...(privateKey ? { privateKey } : {}),
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
  ) {}

  listCatalog() {
    return this.store.listCatalog();
  }

  listConnections(organizationId: string, vendor?: string | null): ConnectorConnection[] {
    return this.store.listConnections(organizationId, vendor);
  }

  getConnection(organizationId: string, connectionId: string): ConnectorConnection | null {
    return this.store.getConnection(organizationId, connectionId);
  }

  listAuditEvents(organizationId: string, connectionId?: string | null): ConnectorAuditEvent[] {
    return this.store.listAuditEvents(organizationId, connectionId);
  }

  listIngestCredentials(
    organizationId: string,
    connectionId: string,
  ): IngestCredential[] {
    return this.store.listIngestCredentials(organizationId, connectionId);
  }

  listRawEvents(organizationId: string, connectionId?: string | null): IngestRawEvent[] {
    return this.store.listRawEvents(organizationId, connectionId);
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
          workerId: normalizedWorkerId,
          claimedCount: events.length,
        },
        context,
      );
    }
    return events;
  }

  markRawEventProcessed(
    organizationId: string,
    connectionId: string,
    rawEventId: string,
    workerId: string,
    context: AuditContext,
  ): IngestRawEvent {
    const normalizedWorkerId = workerId.trim();
    const event = this.store.updateRawEvent(organizationId, connectionId, rawEventId, {
      processingStatus: "processed",
      claimedBy: normalizedWorkerId,
      processedAt: new Date().toISOString(),
      errorMessage: null,
    });
    if (event == null) {
      throw new Error("Raw event not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.raw_event.processed",
      {
        rawEventId,
        workerId: normalizedWorkerId,
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
    const event = this.store.updateRawEvent(organizationId, connectionId, rawEventId, {
      processingStatus: "failed",
      claimedBy: normalizedWorkerId,
      processedAt: new Date().toISOString(),
      errorMessage: normalizedError.slice(0, 400),
    });
    if (event == null) {
      throw new Error("Raw event not found");
    }

    this.recordAuditEvent(
      organizationId,
      connectionId,
      "connectors.raw_event.failed",
      {
        rawEventId,
        workerId: normalizedWorkerId,
      },
      context,
    );

    return event;
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
    const catalogItem = CONNECTOR_CATALOG.find((item) => item.vendor === vendor);
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
    if (sourceObjects == null || sourceObjects.length === 0) {
      return [...catalogItem.sourceObjects];
    }

    const allowlist = new Set(catalogItem.sourceObjects);
    const normalized = Array.from(
      new Set(
        sourceObjects.map((entry) => entry.trim()).filter((entry) => entry.length > 0),
      ),
    );
    if (normalized.length === 0) {
      throw new Error("sourceObjects must contain at least one object");
    }
    for (const sourceObject of normalized) {
      if (!allowlist.has(sourceObject)) {
        throw new Error(`Unsupported source object "${sourceObject}" for ${catalogItem.vendor}`);
      }
    }
    return normalized;
  }

  private ensureSealingKey(): string {
    if (this.secretSealingKey == null || this.secretSealingKey.length < 32) {
      throw new Error("CONNECTORS_SECRET_SEALING_KEY is required to store credentials");
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
    const previous = this.store.getLatestSecret(connection.organizationId, connection.id);
    const version = (previous?.version ?? 0) + 1;
    const secretRef = createSecretRef(connection.organizationId, connection.id, kind, version);
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
    const secretRef = createSecretRef(connection.organizationId, connection.id, kind, version);
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
    const secret = this.store.getLatestSecret(connection.organizationId, connection.id);
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
    const baseUrl = (this.publicBaseUrl ?? "http://127.0.0.1:8100").replace(/\/$/, "");
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

  private async ensureOAuthAccessToken(
    connection: ConnectorConnection,
  ): Promise<{
    accessToken: string;
    expiresAt: string | null;
    scopes: string[];
  }> {
    const { record, payload } = this.getLatestSecretPayload<Record<string, unknown>>(connection);
    const tokenEndpoint = this.getOptionalUrl(
      connection,
      "tokenEndpoint",
      this.getCatalogItem(connection.vendor).oauthDefaults?.tokenEndpoint,
    );
    if (tokenEndpoint == null) {
      throw new Error("OAuth tokenEndpoint is missing from config");
    }

    if (record.kind === "oauth2_token") {
      const oauthPayload = payload as OAuthTokenSecretPayload;
      const effectiveTokenEndpoint = tokenEndpoint ?? oauthPayload.tokenEndpoint;
      if (!isExpired(oauthPayload.expiresAt) && oauthPayload.accessToken.length > 0) {
        return {
          accessToken: oauthPayload.accessToken,
          expiresAt: oauthPayload.expiresAt,
          scopes: oauthPayload.scope,
        };
      }

      if (oauthPayload.refreshToken == null) {
        throw new Error("OAuth access token expired and no refresh_token is available");
      }

      const refreshed = await refreshAccessToken(
        effectiveTokenEndpoint,
        {
          clientId: oauthPayload.clientId,
          clientSecret: oauthPayload.clientSecret,
        },
        oauthPayload.refreshToken,
      );
      this.storeSecret(connection, "oauth2_token", {
        clientId: oauthPayload.clientId,
        clientSecret: oauthPayload.clientSecret,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        tokenEndpoint: effectiveTokenEndpoint,
        expiresAt: refreshed.expiresAt,
        tokenType: refreshed.tokenType,
        scope: refreshed.scope,
      }, {
        vendor: connection.vendor,
        refreshed: true,
      });
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
    const token = await exchangeClientCredentials(tokenEndpoint, client, scopes);
    this.storeSecret(connection, "oauth2_token", {
      clientId: client.clientId,
      clientSecret: client.clientSecret,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenEndpoint,
      expiresAt: token.expiresAt,
      tokenType: token.tokenType,
      scope: token.scope,
    }, {
      vendor: connection.vendor,
      grantType: "client_credentials",
    });
    return {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      scopes: token.scope,
    };
  }

  private async probeConnection(
    connection: ConnectorConnection,
  ): Promise<{ checkedScopes: string[]; warnings: string[]; latencyMs: number }> {
    const warnings: string[] = [];
    const probeUrl = asTrimmedString(connection.config.testEndpoint ?? connection.baseUrl);
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
      headers.authorization = `Bearer ${token.accessToken}`;
      const response = await fetch(probeUrl, { headers });
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
      const { payload } = this.getLatestSecretPayload<{ apiKey: string }>(connection);
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
        asTrimmedString(connection.config.authHeaderName) ?? "x-api-key";
      const headerPrefix = asTrimmedString(connection.config.authHeaderPrefix);
      headers[headerName] =
        headerPrefix != null ? `${headerPrefix} ${payload.apiKey}` : payload.apiKey;
      const response = await fetch(probeUrl, { headers });
      if (!response.ok) {
        throw new Error(`Probe endpoint returned HTTP ${response.status}`);
      }
      return {
        checkedScopes: ["api_key"],
        warnings,
        latencyMs: Date.now() - started,
      };
    }

    warnings.push(
      "No live probe strategy is configured for this auth mode; structural validation only.",
    );
    return {
      checkedScopes: ["credentials"],
      warnings,
      latencyMs: Date.now() - started,
    };
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
        throw new Error(`Unsupported source object "${sourceObject}" for inbound ingestion`);
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
    if (scheme?.toLowerCase() !== "bearer" || token == null || token.length < 16) {
      throw new Error("A valid Bearer ingestion API key is required");
    }

    const credentials = this.store.listIngestCredentials(organizationId, connectionId);
    for (const credential of credentials) {
      if (credential.revokedAt != null) {
        continue;
      }
      if (credential.expiresAt != null && Date.parse(credential.expiresAt) <= Date.now()) {
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
        (auth.clientIp == null || !credential.allowedIpAddresses.includes(auth.clientIp))
      ) {
        throw new Error("The ingestion credential is not allowed from this client IP");
      }

      if (credential.authMode === "bearer_hmac") {
        if (auth.keyIdHeader?.trim() !== credential.keyId) {
          throw new Error("Missing or invalid X-Praedixa-Key-Id header");
        }
        if (!isFreshUnixTimestamp(auth.timestampHeader, 300)) {
          throw new Error("X-Praedixa-Timestamp is missing or outside the allowed time window");
        }
        if (payload.signingSecret == null || payload.signingSecret.length < 16) {
          throw new Error("Signing secret is unavailable for this ingestion credential");
        }
        const rawBody = auth.rawBody ?? "";
        const signedPayload = `${auth.timestampHeader}.${rawBody}`;
        if (!verifyHmacSha256(signedPayload, auth.signatureHeader, payload.signingSecret)) {
          throw new Error("Invalid X-Praedixa-Signature header");
        }
      }

      return {
        credential,
        secret: payload,
      };
    }

    throw new Error("The ingestion API key is invalid, revoked or expired");
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

    const keyId = randomUUID();
    const apiKey = createOpaqueApiKey();
    const signingSecret = input.requireSignature ? createOpaqueApiKey("prdx_sig") : null;
    const authMode: IngestCredentialAuthMode =
      input.requireSignature === true ? "bearer_hmac" : "bearer";
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

    const credential = this.store.createIngestCredential(organizationId, connectionId, {
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
      allowedIpAddresses: normalizeStringArray(input.allowedIpAddresses) ?? null,
      expiresAt,
    });

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
        duplicates: Math.max(0, dispatch.run.recordsFetched - dispatch.run.recordsWritten),
        runId: dispatch.run.id,
        receivedAt: dispatch.run.endedAt ?? dispatch.run.createdAt,
        events: [],
      };
    }

    const allowedSourceObjects = new Set(
      credential.allowedSourceObjects ?? connection.sourceObjects,
    );
    const acceptedEvents: IngestRawEvent[] = [];
    const payloadStore = this.requirePayloadStore();
    let duplicates = 0;
    const receivedAt = new Date().toISOString();

    for (const event of input.events) {
      if (!allowedSourceObjects.has(event.sourceObject)) {
        throw new Error(`Source object "${event.sourceObject}" is not allowed for this credential`);
      }

      const preview = redactSensitive(event.payload);
      const rawPayload = JSON.stringify(event.payload);
      const payloadHash = payloadSha256(rawPayload);
      const eventId =
        asTrimmedString(event.eventId) ??
        payloadSha256(
          `${event.sourceObject}|${event.sourceRecordId}|${event.sourceUpdatedAt ?? ""}|${payloadHash}`,
        );
      const payloadObject = await payloadStore.putJson(
        organizationId,
        connectionId,
        eventId,
        event.payload,
      );

      const rawEvent: IngestRawEvent = {
        id: randomUUID(),
        organizationId,
        connectionId,
        credentialId: credential.id,
        eventId,
        sourceObject: event.sourceObject,
        sourceRecordId: event.sourceRecordId,
        sourceUpdatedAt: parseIsoDate(event.sourceUpdatedAt ?? null),
        schemaVersion: input.schemaVersion,
        contentType: asTrimmedString(event.contentType) ?? payloadObject.contentType,
        payloadSha256: payloadHash,
        payloadPreview: preview,
        objectStoreKey: payloadObject.key,
        sizeBytes: payloadObject.sizeBytes,
        idempotencyKey,
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

    this.store.updateIngestCredential(organizationId, connectionId, credential.id, {
      lastUsedAt: receivedAt,
    });
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
    const sourceObjects = this.normalizeSourceObjects(catalogItem, input.sourceObjects);

    const connection = this.store.createConnection(organizationId, {
      ...input,
      config: redactSensitive(config),
      sourceObjects,
      syncIntervalMinutes:
        input.syncIntervalMinutes ?? catalogItem.recommendedSyncMinutes,
      baseUrl: input.baseUrl ?? null,
      oauthScopes:
        input.oauthScopes?.length != null && input.oauthScopes.length > 0
          ? [...input.oauthScopes]
          : catalogItem.oauthDefaults?.defaultScopes != null
            ? [...catalogItem.oauthDefaults.defaultScopes]
            : null,
    });

    if (input.credentials != null) {
      const normalized = normalizeCredentialPayload(input.authMode, input.credentials);
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
        authMode: connection.authMode,
        sourceObjects: connection.sourceObjects,
        hasCredentials: input.credentials != null || input.secretRef != null,
      },
      context,
    );

    return this.store.getConnection(organizationId, connection.id) ?? connection;
  }

  updateConnection(
    organizationId: string,
    connectionId: string,
    input: UpdateConnectionInput,
    context: AuditContext,
  ): ConnectorConnection {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    const catalogItem = this.getCatalogItem(connection.vendor);
    const nextConfig = isRecord(input.config) ? input.config : connection.config;
    assertNoSecretsInConfig(nextConfig);
    const nextSourceObjects = this.normalizeSourceObjects(
      catalogItem,
      input.sourceObjects ?? connection.sourceObjects,
    );
    const nextStatus = input.status ?? connection.status;
    const disabledReason =
      nextStatus === "disabled"
        ? asTrimmedString(input.disabledReason ?? connection.disabledReason) ??
          "Disabled by operator"
        : null;

    const updated = this.store.updateConnection(organizationId, connectionId, {
      displayName: input.displayName?.trim() || connection.displayName,
      config: redactSensitive(nextConfig),
      sourceObjects: nextSourceObjects,
      syncIntervalMinutes:
        input.syncIntervalMinutes ?? connection.syncIntervalMinutes,
      webhookEnabled: input.webhookEnabled ?? connection.webhookEnabled,
      baseUrl: input.baseUrl ?? connection.baseUrl,
      externalAccountId: input.externalAccountId ?? connection.externalAccountId,
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
      throw new Error("Authorization start is only supported for oauth2 connections");
    }

    const catalogItem = this.getCatalogItem(connection.vendor);
    const authorizationEndpoint =
      input.authorizationEndpoint ??
      this.getOptionalUrl(
        connection,
        "authorizationEndpoint",
        catalogItem.oauthDefaults?.authorizationEndpoint,
      );
    const tokenEndpoint =
      input.tokenEndpoint ??
      this.getOptionalUrl(
        connection,
        "tokenEndpoint",
        catalogItem.oauthDefaults?.tokenEndpoint,
      );
    if (authorizationEndpoint == null || tokenEndpoint == null) {
      throw new Error("OAuth authorizationEndpoint and tokenEndpoint are required");
    }

    if (input.clientCredentials != null) {
      const normalized = normalizeCredentialPayload("oauth2", input.clientCredentials);
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

    const { payload } = this.getLatestSecretPayload<OAuthClientSecretPayload>(connection);
    const scopes =
      input.scopes?.length != null && input.scopes.length > 0
        ? [...input.scopes]
        : connection.oauthScopes ?? catalogItem.oauthDefaults?.defaultScopes ?? [];
    const session: AuthorizationSession = {
      id: randomUUID(),
      organizationId,
      connectionId,
      vendor: connection.vendor,
      redirectUri: input.redirectUri,
      authorizationEndpoint,
      tokenEndpoint,
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
        authorizationEndpoint,
        tokenEndpoint,
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
    const normalized = normalizeCredentialPayload(connection.authMode, credentials);
    const stored = this.storeSecret(connection, normalized.kind, normalized.payload, {
      vendor: connection.vendor,
      authMode: connection.authMode,
    });
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

    const { payload } = this.getLatestSecretPayload<OAuthClientSecretPayload>(connection);
    const token = await exchangeAuthorizationCode(session, payload, input.code ?? "");
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
      oauthScopes: token.scope.length > 0 ? token.scope : connection.oauthScopes,
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
    const stored = this.storeSecret(connection, normalized.kind, normalized.payload, {
      vendor: connection.vendor,
      grantType: "client_credentials",
    });
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
      return this.completeNonOAuthAuthorization(connection, input.credentials, context);
    }

    if (input.code != null) {
      return await this.completeOAuthCodeAuthorization(connection, input, context);
    }

    if (input.credentials == null) {
      throw new Error("Either code/state or credentials are required");
    }
    return this.completeOAuthCredentialAuthorization(connection, input.credentials, context);
  }

  async testConnection(
    organizationId: string,
    connectionId: string,
    context: AuditContext,
  ): Promise<TestConnectionResult> {
    const connection = this.getConnectionOrThrow(organizationId, connectionId);
    if (connection.secretRef == null || connection.secretRef.length === 0) {
      throw new Error("Connection credentials must be completed before testing");
    }
    if (Object.keys(connection.config).length === 0 && connection.baseUrl == null) {
      throw new Error("Connector config or baseUrl is required before testing");
    }

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
    if (connection.status === "disabled") {
      throw new Error("Connection is disabled");
    }
    if (connection.status !== "active" || connection.authorizationState !== "authorized") {
      throw new Error("Connection must be authorized and tested before syncing");
    }

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

  listSyncRuns(organizationId: string, connectionId?: string | null): SyncRun[] {
    return this.store.listSyncRuns(organizationId, connectionId);
  }

  getSyncRun(organizationId: string, runId: string): SyncRun | null {
    return this.store.getSyncRun(organizationId, runId);
  }
}

export async function createDefaultConnectorService(): Promise<ConnectorService> {
  const databaseUrl = process.env.DATABASE_URL?.trim() || null;
  const store = databaseUrl
    ? new PostgresBackedConnectorStore(databaseUrl)
    : new InMemoryConnectorStore();
  if (store instanceof PostgresBackedConnectorStore) {
    await store.ready();
  }

  return new ConnectorService(
    store,
    process.env.CONNECTORS_SECRET_SEALING_KEY ?? null,
    process.env.CONNECTORS_PUBLIC_BASE_URL ?? null,
    new LocalFilePayloadStore(
      process.env.CONNECTORS_OBJECT_STORE_ROOT ?? "/tmp/praedixa-connectors-object-store",
    ),
  );
}
