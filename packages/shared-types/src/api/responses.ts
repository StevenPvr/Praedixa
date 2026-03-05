// API Response types

import type { PaginationMeta } from "../utils/common";

/** Base API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  requestId?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta;
}

/** Error response */
export interface ErrorResponse {
  success: false;
  error: ApiError;
  timestamp: string;
  requestId?: string;
}

/** API Error structure */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  validationErrors?: ValidationError[];
  stack?: string; // Only in development
}

/** Validation error detail */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/** Empty success response */
export interface EmptyResponse {
  success: true;
  message?: string;
  timestamp: string;
}

/** Created resource response */
export interface CreatedResponse<T> extends ApiResponse<T> {
  /** Created resource ID */
  id: string;
  /** Resource URL */
  location?: string;
}

/** Bulk operation response */
export interface BulkOperationResponse<T = unknown> {
  success: boolean;
  /** Successfully processed items */
  succeeded: T[];
  /** Failed items with errors */
  failed: Array<{
    item: T;
    error: ApiError;
  }>;
  /** Summary */
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
  timestamp: string;
}

/** Health check response */
export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  environment: string;
  timestamp: string;
  checks: HealthCheck[];
}

/** Individual health check */
export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  duration?: number; // ms
  message?: string;
}

/** Authentication response */
export interface AuthResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    organizationName: string;
  };
}

/** Export response */
export interface ExportResponse {
  success: boolean;
  exportId: string;
  format: "csv" | "xlsx" | "pdf" | "json";
  status: "pending" | "processing" | "completed" | "failed";
  downloadUrl?: string;
  expiresAt?: string;
}

/** Import response */
export interface ImportResponse {
  success: boolean;
  importId: string;
  status: "pending" | "validating" | "processing" | "completed" | "failed";
  progress?: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
  };
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

/** Webhook event */
export interface WebhookEvent<T = unknown> {
  id: string;
  type: string;
  timestamp: string;
  organizationId: string;
  data: T;
  signature?: string;
}

/** Server-Sent Event */
export interface SSEMessage<T = unknown> {
  event: string;
  id: string;
  data: T;
  retry?: number;
}

// ─────────────────────────────────────────────────────────────
// Dataset Responses
// ─────────────────────────────────────────────────────────────

import type {
  DatasetColumn,
  DatasetDataRow,
  IngestionLogEntry,
} from "../domain/dataset";
import type {
  IntegrationAuditEvent,
  IntegrationCatalogItem,
  IntegrationConnection,
  IntegrationSyncRun,
} from "../domain/integration";

/** Dataset detail response data */
export interface DatasetDetailResponse {
  id: string;
  name: string;
  status: string;
  tableName: string;
  temporalIndex: string;
  groupBy: string[];
  rowCount: number;
  lastIngestionAt: string | null;
  columns: DatasetColumn[];
}

/** Dataset data preview response */
export interface DatasetDataPreviewResponse {
  columns: string[];
  rows: DatasetDataRow[];
  /** Which columns are PII-masked */
  maskedColumns: string[];
  total: number;
}

/** Ingestion history response */
export interface IngestionHistoryResponse {
  entries: IngestionLogEntry[];
  total: number;
}

// ─────────────────────────────────────────────────────────────
// Integration Responses
// ─────────────────────────────────────────────────────────────

/** Connector catalog payload */
export interface IntegrationCatalogResponse {
  connectors: IntegrationCatalogItem[];
}

/** Connection test response payload */
export interface IntegrationConnectionTestResponse {
  ok: boolean;
  latencyMs: number;
  checkedScopes: string[];
  warnings: string[];
}

/** Integration dashboard payload */
export interface IntegrationOverviewResponse {
  organizationId: string;
  connectors: IntegrationConnection[];
  recentRuns: IntegrationSyncRun[];
  auditTrail: IntegrationAuditEvent[];
}
