export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

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
}

export interface RouteResult {
  statusCode: number;
  payload: ApiSuccess | ApiErrorResponse;
}

export type RouteHandler = (ctx: RouteContext) => RouteResult | Promise<RouteResult>;

export interface RouteDefinition {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
  handler: RouteHandler;
}

export interface CompiledRoute {
  method: HttpMethod;
  template: string;
  authRequired: boolean;
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

export type ConnectionStatus =
  | "pending"
  | "active"
  | "disabled"
  | "needs_attention";

export type SyncTriggerType =
  | "schedule"
  | "manual"
  | "webhook"
  | "backfill"
  | "replay";

export type SyncStatus = "queued" | "running" | "success" | "failed" | "canceled";

export interface ConnectorCatalogItem {
  vendor: ConnectorVendor;
  label: string;
  domain: ConnectorDomain;
  authModes: ConnectorAuthMode[];
  sourceObjects: string[];
  recommendedSyncMinutes: number;
  medallionTargets: Array<"bronze" | "silver" | "gold">;
}

export interface ConnectorConnection {
  id: string;
  organizationId: string;
  vendor: ConnectorVendor;
  displayName: string;
  status: ConnectionStatus;
  authMode: ConnectorAuthMode;
  config: Record<string, unknown>;
  secretRef: string | null;
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
  createdAt: string;
}

export interface CreateConnectionInput {
  vendor: ConnectorVendor;
  displayName: string;
  authMode: ConnectorAuthMode;
  secretRef?: string | null;
  config?: Record<string, unknown>;
}

export interface TestConnectionResult {
  ok: boolean;
  latencyMs: number;
  checkedScopes: string[];
  warnings: string[];
}

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "staging" | "production";
  corsOrigins: readonly string[];
  internalToken: string;
}
