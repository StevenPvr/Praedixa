import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  LedgerActionSummary,
  LedgerApprovalSummary,
  LedgerCounterfactual,
  LedgerEntry,
  LedgerMetricSnapshot,
  LedgerRoi,
  LedgerStatus,
  LedgerSupersedes,
  LedgerValidationStatus,
} from "../domain/ledger.js";

export type LedgerDetailExportFormat = "csv" | "xlsx" | "json";

export type LedgerDetailExportBlocker =
  | "missing_actual_snapshot"
  | "revision_not_finalized"
  | "roi_validation_pending"
  | "roi_validation_contested";

export type LedgerDetailBannerStatus =
  | "validated"
  | "pending"
  | "contested"
  | "blocked";

export type LedgerDetailBannerCode =
  | "validated_for_export"
  | "roi_validation_pending"
  | "roi_validation_contested"
  | "missing_actual_snapshot"
  | "revision_not_finalized";

export interface LedgerDetailRequest {
  ledgerId: UUID;
  revision?: number;
  requiredComponentKeys?: readonly string[];
  exportFormats?: readonly LedgerDetailExportFormat[];
}

export interface LedgerDetailRoiComponentDrillDown {
  key: string;
  label: string;
  kind: "benefit" | "cost";
  value: number;
  signedValue: number;
  shareOfAbsoluteTotal: number;
  validationStatus: LedgerValidationStatus;
  isRequired: boolean;
}

export interface LedgerDetailDeltaMetric {
  key: string;
  baselineValue?: number;
  recommendedValue?: number;
  actualValue?: number;
  recommendedDelta?: number;
  actualDelta?: number;
  actualVsRecommendedDelta?: number;
}

export interface LedgerDetailDeltaSummary {
  metrics: readonly LedgerDetailDeltaMetric[];
  numericMetricCount: number;
  missingActualMetricKeys: readonly string[];
}

export interface LedgerDetailFinanceValidationBanner {
  status: LedgerDetailBannerStatus;
  code: LedgerDetailBannerCode;
  message: string;
}

export interface LedgerDetailRevisionLineageNode {
  ledgerId: UUID;
  revision: number;
  status: LedgerStatus;
  validationStatus: LedgerValidationStatus;
  openedAt: ISODateTimeString;
  closedAt?: ISODateTimeString;
  supersedes?: LedgerSupersedes;
  isSelected: boolean;
}

export interface LedgerDetailExportReadiness {
  format: LedgerDetailExportFormat;
  status: "ready" | "blocked";
  blockers: readonly LedgerDetailExportBlocker[];
}

export interface LedgerDetailResponse {
  kind: "LedgerDetail";
  ledgerId: UUID;
  requestedRevision?: number;
  selectedRevision: number;
  latestRevision: number;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  scenarioRunId?: UUID;
  status: LedgerStatus;
  validationStatus: LedgerValidationStatus;
  scope: LedgerEntry["scope"];
  approvals: readonly LedgerApprovalSummary[];
  action: LedgerActionSummary;
  baseline: LedgerMetricSnapshot;
  recommended: LedgerEntry["recommended"];
  actual?: LedgerMetricSnapshot;
  counterfactual: LedgerCounterfactual;
  roi: LedgerRoi;
  roiComponents: readonly LedgerDetailRoiComponentDrillDown[];
  deltaSummary: LedgerDetailDeltaSummary;
  validationBanner: LedgerDetailFinanceValidationBanner;
  revisionLineage: readonly LedgerDetailRevisionLineageNode[];
  exportReadiness: readonly LedgerDetailExportReadiness[];
  requiredComponentKeys: readonly string[];
  explanation: LedgerEntry["explanation"];
  openedAt: ISODateTimeString;
  closedAt?: ISODateTimeString;
}
