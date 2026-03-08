import { randomUUID } from "node:crypto";

import { loadConfig } from "./config.js";

export type IntegrationVendor =
  | "salesforce"
  | "ukg"
  | "toast"
  | "olo"
  | "cdk"
  | "reynolds"
  | "geotab"
  | "fourth"
  | "oracle_tm"
  | "sap_tm"
  | "blue_yonder"
  | "manhattan"
  | "ncr_aloha";

export type IntegrationAuthMode = "oauth2" | "api_key" | "service_account" | "sftp";
export type IntegrationConnectionStatus =
  | "pending"
  | "active"
  | "disabled"
  | "needs_attention";
export type IntegrationAuthorizationState =
  | "not_started"
  | "awaiting_authorization"
  | "authorized";
export type IntegrationSyncStatus = "queued" | "running" | "success" | "failed" | "canceled";
export type IntegrationSyncTrigger = "manual" | "schedule" | "backfill" | "replay" | "webhook";

type RuntimeSuccess<T> = {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
};

type RuntimeError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId?: string;
};

type RuntimeResponse<T> = RuntimeSuccess<T> | RuntimeError;
const CONNECTORS_RUNTIME_TIMEOUT_MS = 8_000;
const PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export type IntegrationCatalogItem = {
  vendor: IntegrationVendor;
  label: string;
  domain: string;
  authModes: IntegrationAuthMode[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionTargets: Array<"bronze" | "silver" | "gold">;
  onboardingModes?: string[];
  requiredConfigFields?: string[];
};

export type IntegrationConnection = {
  id: string;
  organizationId: string;
  vendor: IntegrationVendor;
  displayName: string;
  authMode: IntegrationAuthMode;
  status: IntegrationConnectionStatus;
  authorizationState?: IntegrationAuthorizationState;
  secretRef: string | null;
  secretVersion?: number | null;
  config: Record<string, unknown>;
  sourceObjects?: string[];
  syncIntervalMinutes?: number;
  webhookEnabled?: boolean;
  baseUrl?: string | null;
  externalAccountId?: string | null;
  oauthScopes?: string[] | null;
  lastTestedAt?: string | null;
  lastSuccessfulSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  disabledReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationSyncRun = {
  id: string;
  organizationId: string;
  connectionId: string;
  triggerType: IntegrationSyncTrigger;
  status: IntegrationSyncStatus;
  recordsFetched: number;
  recordsWritten: number;
  errorClass: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
};

export type IntegrationAuditEvent = {
  id: string;
  organizationId: string;
  connectionId: string | null;
  action: string;
  actorUserId: string | null;
  actorService?: string | null;
  requestId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type IntegrationAuthorizationStartResult = {
  authorizationUrl: string;
  expiresAt: string;
  state: string;
};

export type IntegrationAuthorizationCompleteResult = {
  authorized: boolean;
  secretRef: string;
  secretVersion: number;
  expiresAt: string | null;
  scopes: string[];
};

export type IntegrationIngestCredential = {
  id: string;
  organizationId: string;
  connectionId: string;
  label: string;
  keyId: string;
  authMode: "bearer" | "bearer_hmac";
  secretRef: string;
  secretVersion: number;
  tokenPreview: string;
  allowedSourceObjects: string[] | null;
  allowedIpAddresses: string[] | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationIssueIngestCredentialResult = {
  credential: IntegrationIngestCredential;
  apiKey: string;
  signingSecret: string | null;
  ingestUrl: string;
  authScheme: "Bearer";
  signature: null | {
    algorithm: "hmac-sha256";
    keyIdHeader: "X-Praedixa-Key-Id";
    timestampHeader: "X-Praedixa-Timestamp";
    signatureHeader: "X-Praedixa-Signature";
  };
};

export type IntegrationRawEvent = {
  id: string;
  organizationId: string;
  connectionId: string;
  credentialId: string;
  eventId: string;
  sourceObject: string;
  sourceRecordId: string;
  sourceUpdatedAt: string | null;
  schemaVersion: string;
  contentType: string;
  payloadSha256: string;
  payloadPreview: Record<string, unknown>;
  objectStoreKey: string;
  sizeBytes: number;
  idempotencyKey: string;
  processingStatus: "pending" | "processing" | "processed" | "failed";
  claimedAt: string | null;
  claimedBy: string | null;
  processedAt: string | null;
  errorMessage: string | null;
  receivedAt: string;
};

export class IntegrationInputError extends Error {
  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "IntegrationInputError";
  }
}

function getRuntimeConfig(): { baseUrl: string; token: string } {
  const runtimeEnv =
    process.env.NODE_ENV === "test"
      ? { ...process.env, NODE_ENV: "development" }
      : process.env;
  const config = loadConfig(runtimeEnv);
  const baseUrl = config.connectors.runtimeUrl;
  const token = config.connectors.runtimeToken ?? "";

  if (token.length < 32) {
    throw new IntegrationInputError(
      "connectors runtime token is not configured",
      undefined,
      500,
    );
  }

  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
}

function encodePathSegment(label: string, value: string): string {
  const trimmed = value.trim();
  if (!PATH_SEGMENT_PATTERN.test(trimmed)) {
    throw new IntegrationInputError(`${label} contains unsupported characters`, {
      label,
    });
  }

  return encodeURIComponent(trimmed);
}

function buildOrganizationPath(organizationId: string): string {
  return `/v1/organizations/${encodePathSegment("organizationId", organizationId)}`;
}

function buildConnectionPath(
  organizationId: string,
  connectionId: string,
): string {
  return `${buildOrganizationPath(organizationId)}/connections/${encodePathSegment(
    "connectionId",
    connectionId,
  )}`;
}

async function callConnectorsRuntime<T>(
  path: string,
  options?: {
    actorUserId?: string | null;
    body?: unknown;
    idempotencyKey?: string | null;
    method?: "GET" | "POST" | "PATCH";
    query?: URLSearchParams;
  },
): Promise<T> {
  const { baseUrl, token } = getRuntimeConfig();
  const url = new URL(`${baseUrl}${path}`);
  if (options?.query != null) {
    for (const [key, value] of options.query.entries()) {
      url.searchParams.append(key, value);
    }
  }

  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: "application/json",
  };
  if (options?.body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (options?.actorUserId != null) {
    headers["x-actor-user-id"] = options.actorUserId;
  }
  if (options?.idempotencyKey != null) {
    headers["idempotency-key"] = options.idempotencyKey;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, CONNECTORS_RUNTIME_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: options?.method ?? "GET",
      headers,
      redirect: "error",
      signal: controller.signal,
      ...(options?.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new IntegrationInputError(
        "connectors runtime request timed out",
        { path },
        504,
      );
    }

    throw new IntegrationInputError(
      "connectors runtime is unavailable",
      { path },
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  const payload = (await response.json().catch(() => null)) as RuntimeResponse<T> | null;
  if (payload == null) {
    throw new IntegrationInputError(
      "connectors runtime returned an invalid response",
      { path },
      502,
    );
  }

  if (!response.ok || !payload.success) {
    const errorPayload = payload.success
      ? { message: "connectors runtime request failed", details: undefined }
      : payload.error;
    throw new IntegrationInputError(
      errorPayload.message,
      errorPayload.details,
      response.status,
    );
  }

  return payload.data;
}

export async function listIntegrationCatalog(): Promise<IntegrationCatalogItem[]> {
  return await callConnectorsRuntime<IntegrationCatalogItem[]>("/v1/connectors/catalog");
}

export async function listIntegrationConnections(
  organizationId: string,
  vendorFilter: string | null,
): Promise<IntegrationConnection[]> {
  const query = new URLSearchParams();
  if (vendorFilter != null && vendorFilter.length > 0) {
    query.set("vendor", vendorFilter);
  }
  return await callConnectorsRuntime<IntegrationConnection[]>(
    `${buildOrganizationPath(organizationId)}/connections`,
    {
      query,
    },
  );
}

export async function getIntegrationConnection(
  organizationId: string,
  connectionId: string,
): Promise<IntegrationConnection> {
  return await callConnectorsRuntime<IntegrationConnection>(
    buildConnectionPath(organizationId, connectionId),
  );
}

export async function createIntegrationConnection(
  organizationId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationConnection> {
  return await callConnectorsRuntime<IntegrationConnection>(
    `${buildOrganizationPath(organizationId)}/connections`,
    {
      method: "POST",
      body: payload,
      actorUserId,
    },
  );
}

export async function updateIntegrationConnection(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationConnection> {
  return await callConnectorsRuntime<IntegrationConnection>(
    buildConnectionPath(organizationId, connectionId),
    {
      method: "PATCH",
      body: payload,
      actorUserId,
    },
  );
}

export async function startIntegrationAuthorization(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationAuthorizationStartResult> {
  return await callConnectorsRuntime<IntegrationAuthorizationStartResult>(
    `${buildConnectionPath(organizationId, connectionId)}/authorize/start`,
    {
      method: "POST",
      body: payload,
      actorUserId,
    },
  );
}

export async function completeIntegrationAuthorization(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationAuthorizationCompleteResult> {
  return await callConnectorsRuntime<IntegrationAuthorizationCompleteResult>(
    `${buildConnectionPath(organizationId, connectionId)}/authorize/complete`,
    {
      method: "POST",
      body: payload,
      actorUserId,
    },
  );
}

export async function testIntegrationConnection(
  organizationId: string,
  connectionId: string,
  actorUserId: string | null,
) {
  return await callConnectorsRuntime<{
    ok: boolean;
    latencyMs: number;
    checkedScopes: string[];
    warnings: string[];
  }>(
    `${buildConnectionPath(organizationId, connectionId)}/test`,
    {
      method: "POST",
      actorUserId,
    },
  );
}

export async function triggerIntegrationSync(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationSyncRun> {
  return await callConnectorsRuntime<IntegrationSyncRun>(
    `${buildConnectionPath(organizationId, connectionId)}/sync`,
    {
      method: "POST",
      body: payload,
      actorUserId,
      idempotencyKey: randomUUID(),
    },
  );
}

export async function listIntegrationSyncRuns(
  organizationId: string,
  connectionId: string | null,
): Promise<IntegrationSyncRun[]> {
  const query = new URLSearchParams();
  if (connectionId != null && connectionId.length > 0) {
    query.set("connectionId", connectionId);
  }
  return await callConnectorsRuntime<IntegrationSyncRun[]>(
    `${buildOrganizationPath(organizationId)}/sync-runs`,
    {
      query,
    },
  );
}

export async function listIntegrationAuditEvents(
  organizationId: string,
  connectionId: string | null,
): Promise<IntegrationAuditEvent[]> {
  const query = new URLSearchParams();
  if (connectionId != null && connectionId.length > 0) {
    query.set("connectionId", connectionId);
  }
  return await callConnectorsRuntime<IntegrationAuditEvent[]>(
    `${buildOrganizationPath(organizationId)}/audit-events`,
    {
      query,
    },
  );
}

export async function listIntegrationIngestCredentials(
  organizationId: string,
  connectionId: string,
): Promise<IntegrationIngestCredential[]> {
  return await callConnectorsRuntime<IntegrationIngestCredential[]>(
    `${buildConnectionPath(organizationId, connectionId)}/ingest-credentials`,
  );
}

export async function issueIntegrationIngestCredential(
  organizationId: string,
  connectionId: string,
  payload: unknown,
  actorUserId: string | null,
): Promise<IntegrationIssueIngestCredentialResult> {
  return await callConnectorsRuntime<IntegrationIssueIngestCredentialResult>(
    `${buildConnectionPath(organizationId, connectionId)}/ingest-credentials`,
    {
      method: "POST",
      body: payload,
      actorUserId,
    },
  );
}

export async function revokeIntegrationIngestCredential(
  organizationId: string,
  connectionId: string,
  credentialId: string,
  actorUserId: string | null,
): Promise<IntegrationIngestCredential> {
  return await callConnectorsRuntime<IntegrationIngestCredential>(
    `${buildConnectionPath(
      organizationId,
      connectionId,
    )}/ingest-credentials/${encodePathSegment("credentialId", credentialId)}/revoke`,
    {
      method: "POST",
      actorUserId,
    },
  );
}

export async function listIntegrationRawEvents(
  organizationId: string,
  connectionId: string,
): Promise<IntegrationRawEvent[]> {
  return await callConnectorsRuntime<IntegrationRawEvent[]>(
    `${buildConnectionPath(organizationId, connectionId)}/raw-events`,
  );
}

export async function getIntegrationRawEventPayload(
  organizationId: string,
  connectionId: string,
  eventId: string,
): Promise<Record<string, unknown>> {
  return await callConnectorsRuntime<Record<string, unknown>>(
    `${buildConnectionPath(
      organizationId,
      connectionId,
    )}/raw-events/${encodePathSegment("eventId", eventId)}/payload`,
  );
}
