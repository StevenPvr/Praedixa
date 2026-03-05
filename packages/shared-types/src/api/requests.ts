// API Request types

import type { PaginationParams, ISODateString, UUID } from "../utils/common";
import type { DateRange, TimeGranularity } from "../utils/dates";
import type { ForecastModelType } from "../domain/forecast";
import type {
  DecisionType,
  DecisionStatus,
  DecisionPriority,
} from "../domain/decision";
import type { DatasetStatus } from "../domain/dataset";
import type {
  IntegrationAuthMode,
  IntegrationSyncTriggerType,
  IntegrationVendor,
} from "../domain/integration";

/** Base filter params */
export interface BaseFilterParams extends PaginationParams {
  search?: string;
}

/** Date range filter */
export interface DateRangeFilter {
  startDate?: ISODateString;
  endDate?: ISODateString;
  dateRange?: DateRange;
}

// ─────────────────────────────────────────────────────────────
// Forecast Requests
// ─────────────────────────────────────────────────────────────

/** Request forecast */
export interface RequestForecastRequest {
  horizonDays: number;
  granularity?: TimeGranularity;
  modelType?: ForecastModelType;
  departmentId?: UUID;
  includeConfidenceIntervals?: boolean;
  includeRiskIndicators?: boolean;
}

/** List forecasts request */
export interface ListForecastsRequest
  extends BaseFilterParams, DateRangeFilter {
  departmentId?: UUID;
  modelType?: ForecastModelType;
  status?: "pending" | "running" | "completed" | "failed";
}

/** What-if scenario request */
export interface WhatIfScenarioRequest {
  name: string;
  description?: string;
  absenceRateModifier?: number;
  typeModifiers?: Record<string, number>;
  additionalAbsences?: Array<{
    employeeId: UUID;
    startDate: ISODateString;
    endDate: ISODateString;
    type: string;
  }>;
}

// ─────────────────────────────────────────────────────────────
// Decision Requests
// ─────────────────────────────────────────────────────────────

/** List decisions request */
export interface ListDecisionsRequest
  extends BaseFilterParams, DateRangeFilter {
  departmentId?: UUID;
  types?: DecisionType[];
  statuses?: DecisionStatus[];
  priorities?: DecisionPriority[];
}

/** Review decision request */
export interface ReviewDecisionRequest {
  action: "approve" | "reject" | "defer";
  notes?: string;
  implementationDeadline?: ISODateString;
}

/** Validate arbitrage request */
export interface ValidateArbitrageRequest {
  selectedOptionIndex: number;
  notes?: string;
}

/** Record decision outcome */
export interface RecordDecisionOutcomeRequest {
  effective: boolean;
  actualCost?: number;
  actualImpact: string;
  lessonsLearned?: string;
}

// ─────────────────────────────────────────────────────────────
// Export Requests
// ─────────────────────────────────────────────────────────────

/** Export request */
export interface ExportRequest {
  format: "csv" | "xlsx" | "pdf" | "json";
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
  columns?: string[];
  includeHeaders?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Dataset Requests
// ─────────────────────────────────────────────────────────────

/** List datasets request */
export interface ListDatasetsRequest extends BaseFilterParams {
  status?: DatasetStatus;
}

/** Get dataset data preview request */
export interface GetDatasetDataRequest extends PaginationParams {
  /** Limit columns returned */
  columns?: string[];
}

// ─────────────────────────────────────────────────────────────
// Integration Requests
// ─────────────────────────────────────────────────────────────

/** List integration connections request */
export interface ListIntegrationConnectionsRequest extends BaseFilterParams {
  vendor?: IntegrationVendor;
}

/** Create integration connection request */
export interface CreateIntegrationConnectionRequest {
  vendor: IntegrationVendor;
  displayName: string;
  authMode: IntegrationAuthMode;
  secretRef?: string | null;
  config?: Record<string, unknown>;
}

/** Trigger integration sync request */
export interface TriggerIntegrationSyncRequest {
  triggerType?: IntegrationSyncTriggerType;
  forceFullSync?: boolean;
  sourceWindowStart?: ISODateString;
  sourceWindowEnd?: ISODateString;
}
