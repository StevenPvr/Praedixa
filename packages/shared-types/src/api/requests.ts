// API Request types

import type { PaginationParams, ISODateString, UUID } from "../utils/common";
import type { DateRange, TimeGranularity } from "../utils/dates";
import type {
  AbsenceType,
  AbsenceStatus,
  AbsenceRequest,
} from "../domain/absence";
import type { ForecastModelType } from "../domain/forecast";
import type {
  DecisionType,
  DecisionStatus,
  DecisionPriority,
} from "../domain/decision";
import type { UserRole, EmploymentType } from "../domain/user";

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
// Absence Requests
// ─────────────────────────────────────────────────────────────

/** List absences request */
export interface ListAbsencesRequest extends BaseFilterParams, DateRangeFilter {
  employeeId?: UUID;
  departmentId?: UUID;
  types?: AbsenceType[];
  statuses?: AbsenceStatus[];
  managerId?: UUID;
}

/** Create absence request */
export interface CreateAbsenceRequest extends AbsenceRequest {
  submitForApproval?: boolean;
}

/** Update absence request */
export interface UpdateAbsenceRequest {
  startDate?: ISODateString;
  endDate?: ISODateString;
  startPortion?: "full" | "morning" | "afternoon";
  endPortion?: "full" | "morning" | "afternoon";
  reason?: string;
}

/** Approve/Reject absence request */
export interface AbsenceDecisionRequest {
  action: "approve" | "reject";
  comment?: string;
  rejectionReason?: string;
}

/** Bulk absence import */
export interface BulkAbsenceImportRequest {
  absences: CreateAbsenceRequest[];
  validateOnly?: boolean;
  skipDuplicates?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Employee Requests
// ─────────────────────────────────────────────────────────────

/** List employees request */
export interface ListEmployeesRequest extends BaseFilterParams {
  departmentId?: UUID;
  siteId?: UUID;
  managerId?: UUID;
  employmentTypes?: EmploymentType[];
  status?: "active" | "on_leave" | "terminated" | "pending";
  isCriticalRole?: boolean;
}

/** Create employee request */
export interface CreateEmployeeRequest {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  departmentId: UUID;
  siteId?: UUID;
  managerId?: UUID;
  employmentType: EmploymentType;
  contractType: string;
  fte: number;
  hireDate: ISODateString;
  endDate?: ISODateString;
  isCriticalRole?: boolean;
  skills?: string[];
  dailyCost?: number;
}

/** Update employee request */
export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  departmentId?: UUID;
  siteId?: UUID;
  managerId?: UUID;
  employmentType?: EmploymentType;
  fte?: number;
  endDate?: ISODateString;
  isCriticalRole?: boolean;
  skills?: string[];
  dailyCost?: number;
}

// ─────────────────────────────────────────────────────────────
// User Requests
// ─────────────────────────────────────────────────────────────

/** Create user request */
export interface CreateUserRequest {
  email: string;
  role: UserRole;
  employeeId?: UUID;
  sendInvite?: boolean;
}

/** Update user request */
export interface UpdateUserRequest {
  role?: UserRole;
  status?: "active" | "inactive" | "suspended";
  employeeId?: UUID;
}

/** Login request */
export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
}

/** Register request */
export interface RegisterRequest {
  email: string;
  password: string;
  organizationName: string;
  firstName: string;
  lastName: string;
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
  typeModifiers?: Record<AbsenceType, number>;
  additionalAbsences?: Array<{
    employeeId: UUID;
    startDate: ISODateString;
    endDate: ISODateString;
    type: AbsenceType;
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
// Organization Requests
// ─────────────────────────────────────────────────────────────

/** Update organization settings */
export interface UpdateOrganizationSettingsRequest {
  absenceTypesEnabled?: string[];
  requireApproval?: boolean;
  approvalLevels?: number;
  forecastingEnabled?: boolean;
  forecastHorizonDays?: number;
  alertThresholds?: {
    understaffingRisk?: number;
    absenceRate?: number;
    consecutiveAbsences?: number;
    forecastAccuracy?: number;
  };
}

/** Update working days config */
export interface UpdateWorkingDaysConfigRequest {
  workingDays: number[];
  holidays: ISODateString[];
  companyClosures?: ISODateString[];
}

// ─────────────────────────────────────────────────────────────
// Export/Import Requests
// ─────────────────────────────────────────────────────────────

/** Export request */
export interface ExportRequest {
  format: "csv" | "xlsx" | "pdf" | "json";
  dateRange?: DateRange;
  filters?: Record<string, unknown>;
  columns?: string[];
  includeHeaders?: boolean;
}

/** Import request */
export interface ImportRequest {
  format: "csv" | "xlsx" | "json";
  mapping?: Record<string, string>;
  validateOnly?: boolean;
  skipErrors?: boolean;
}

// ─────────────────────────────────────────────────────────────
// Dataset Requests
// ─────────────────────────────────────────────────────────────

import type { DatasetStatus } from "../domain/dataset";

/** List datasets request */
export interface ListDatasetsRequest extends BaseFilterParams {
  status?: DatasetStatus;
}

/** Get dataset data preview request */
export interface GetDatasetDataRequest extends PaginationParams {
  /** Limit columns returned */
  columns?: string[];
}
