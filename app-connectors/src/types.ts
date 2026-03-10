export interface AuthenticatedServicePrincipal {
  name: string;
  allowedOrgs: readonly string[];
  capabilities: readonly ServiceTokenCapability[];
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
export type ServiceTokenCapability =
  | "catalog:read"
  | "connections:read"
  | "connections:write"
  | "ingest_credentials:read"
  | "ingest_credentials:write"
  | "raw_events:read"
  | "raw_events:write"
  | "oauth:write"
  | "connections:test"
  | "sync:read"
  | "sync:write"
  | "audit:read";

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId?: string;
}

export interface RouteContext {
  method: HttpMethod;
  path: string;
  query: URLSearchParams;
  requestId: string;
  params: Record<string, string>;
  body: unknown;
  rawBody: string | null;
  clientIp: string | null;
  headers: Readonly<Record<string, string | string[] | undefined>>;
  principal: AuthenticatedServicePrincipal | null;
}

export interface RouteResult {
  statusCode: number;
  payload: ApiSuccess | ApiErrorResponse;
}

export type RouteHandler = (
  ctx: RouteContext,
) => RouteResult | Promise<RouteResult>;

export interface RouteDefinition {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
  requiredCapabilities: readonly ServiceTokenCapability[];
  handler: RouteHandler;
}

export interface CompiledRoute {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
  requiredCapabilities: readonly ServiceTokenCapability[];
  paramNames: string[];
  regex: RegExp;
  handler: RouteHandler;
}

export type ConnectorVendor =
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

export type ConnectorDomain =
  | "crm"
  | "wfm"
  | "pos"
  | "dms"
  | "telematics"
  | "tms"
  | "planning";

export type ConnectorAuthMode =
  | "oauth2"
  | "api_key"
  | "service_account"
  | "sftp";

export type ConnectorOnboardingMode =
  | "interactive_oauth"
  | "credential_submission"
  | "managed_service_account"
  | "push_api";

export type ConnectionStatus =
  | "pending"
  | "active"
  | "disabled"
  | "needs_attention";

export type AuthorizationState =
  | "not_started"
  | "awaiting_authorization"
  | "authorized";

export type SyncTriggerType =
  | "schedule"
  | "manual"
  | "webhook"
  | "backfill"
  | "replay";

export type SyncStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "canceled";

export type SecretKind =
  | "oauth2_client"
  | "oauth2_token"
  | "api_key"
  | "service_account"
  | "sftp"
  | "ingest_client";

export interface ConnectorOAuthDefaults {
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  defaultScopes?: string[];
  pkceRequired?: boolean;
}

export interface ConnectorCatalogItem {
  vendor: ConnectorVendor;
  label: string;
  domain: ConnectorDomain;
  authModes: ConnectorAuthMode[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionTargets: Array<"bronze" | "silver" | "gold">;
  onboardingModes: ConnectorOnboardingMode[];
  requiredConfigFields: readonly string[];
  credentialFieldHints: Partial<Record<ConnectorAuthMode, readonly string[]>>;
  oauthDefaults?: ConnectorOAuthDefaults;
}

export interface ConnectorConnection {
  id: string;
  organizationId: string;
  vendor: ConnectorVendor;
  displayName: string;
  status: ConnectionStatus;
  authorizationState: AuthorizationState;
  authMode: ConnectorAuthMode;
  config: Record<string, unknown>;
  secretRef: string | null;
  secretVersion: number | null;
  sourceObjects: string[];
  syncIntervalMinutes: number;
  webhookEnabled: boolean;
  baseUrl: string | null;
  externalAccountId: string | null;
  oauthScopes: string[] | null;
  lastTestedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  nextScheduledSyncAt: string | null;
  disabledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SyncRun {
  id: string;
  organizationId: string;
  connectionId: string;
  triggerType: SyncTriggerType;
  status: SyncStatus;
  recordsFetched: number;
  recordsWritten: number;
  errorClass: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  endedAt: string | null;
  idempotencyKey: string;
  sourceWindowStart: string | null;
  sourceWindowEnd: string | null;
  forceFullSync: boolean;
  availableAt: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  createdAt: string;
}

export interface SyncDispatchResult {
  created: boolean;
  run: SyncRun;
}

export interface ConnectorAuditEvent {
  id: string;
  organizationId: string;
  connectionId: string | null;
  action: string;
  actorUserId: string | null;
  actorService: string | null;
  requestId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuthorizationSession {
  id: string;
  organizationId: string;
  connectionId: string;
  vendor: ConnectorVendor;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  state: string;
  codeVerifier: string;
  scopes: string[];
  expiresAt: string;
  createdAt: string;
}

export interface AuthorizationStartResult {
  authorizationUrl: string;
  expiresAt: string;
  state: string;
}

export interface AuthorizationCompleteResult {
  authorized: boolean;
  secretRef: string;
  secretVersion: number;
  expiresAt: string | null;
  scopes: string[];
}

export interface EncryptedSecretEnvelope {
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface StoredSecretRecord {
  secretRef: string;
  organizationId: string;
  connectionId: string;
  version: number;
  kind: SecretKind;
  metadata: Record<string, unknown>;
  envelope: EncryptedSecretEnvelope;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialInput {
  [key: string]: unknown;
}

export type IngestCredentialAuthMode = "bearer" | "bearer_hmac";

export interface IngestCredential {
  id: string;
  organizationId: string;
  connectionId: string;
  label: string;
  keyId: string;
  authMode: IngestCredentialAuthMode;
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
}

export interface IssueIngestCredentialInput {
  label: string;
  expiresAt?: string | null;
  allowedSourceObjects?: string[] | null;
  allowedIpAddresses?: string[] | null;
  requireSignature?: boolean;
}

export interface IssueIngestCredentialResult {
  credential: IngestCredential;
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
}

export interface IngestEventInput {
  eventId?: string | null;
  sourceObject: string;
  sourceRecordId: string;
  sourceUpdatedAt?: string | null;
  contentType?: string | null;
  payload: Record<string, unknown>;
}

export interface IngestEventsInput {
  schemaVersion: string;
  sentAt?: string | null;
  events: IngestEventInput[];
}

export interface IngestRawEvent {
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
}

export interface IngestEventsResult {
  accepted: number;
  duplicates: number;
  runId: string;
  receivedAt: string;
  events: IngestRawEvent[];
}

export interface ClaimRawEventsInput {
  workerId: string;
  limit?: number;
}

export interface RawEventProcessingUpdateInput {
  workerId: string;
  errorMessage?: string | null;
}

export interface IngestAuthContext {
  authorizationHeader: string | undefined;
  keyIdHeader: string | undefined;
  timestampHeader: string | undefined;
  signatureHeader: string | undefined;
  clientIp: string | null;
  rawBody: string | null;
}

export interface CreateConnectionInput {
  vendor: ConnectorVendor;
  displayName: string;
  authMode: ConnectorAuthMode;
  config?: Record<string, unknown>;
  secretRef?: string | null;
  credentials?: CredentialInput | null;
  sourceObjects?: string[];
  syncIntervalMinutes?: number;
  webhookEnabled?: boolean;
  baseUrl?: string | null;
  externalAccountId?: string | null;
  oauthScopes?: string[] | null;
  actorUserId?: string | null;
}

export interface UpdateConnectionInput {
  displayName?: string;
  config?: Record<string, unknown>;
  sourceObjects?: string[];
  syncIntervalMinutes?: number;
  webhookEnabled?: boolean;
  baseUrl?: string | null;
  externalAccountId?: string | null;
  oauthScopes?: string[] | null;
  status?: "pending" | "disabled" | "active";
  disabledReason?: string | null;
  actorUserId?: string | null;
}

export interface AuthorizationStartInput {
  redirectUri: string;
  authorizationEndpoint?: string | null;
  tokenEndpoint?: string | null;
  scopes?: string[];
  clientCredentials?: CredentialInput | null;
  actorUserId?: string | null;
}

export interface AuthorizationCompleteInput {
  state?: string | null;
  code?: string | null;
  credentials?: CredentialInput | null;
  actorUserId?: string | null;
}

export interface TriggerSyncInput {
  triggerType: SyncTriggerType;
  forceFullSync: boolean;
  sourceWindowStart: string | null;
  sourceWindowEnd: string | null;
}

export interface TestConnectionResult {
  ok: boolean;
  latencyMs: number;
  checkedScopes: string[];
  warnings: string[];
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: "development" | "staging" | "production";
  trustProxy: boolean;
  publicBaseUrl: string;
  databaseUrl: string | null;
  objectStoreRoot: string;
  allowedOutboundHosts: readonly string[];
  corsOrigins: readonly string[];
  serviceTokens: readonly ServiceTokenConfig[];
  secretSealingKey: string | null;
}

export interface ServiceTokenConfig {
  name: string;
  token: string;
  allowedOrgs: readonly string[];
  capabilities: readonly ServiceTokenCapability[];
}
