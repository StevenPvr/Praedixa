import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { DecisionScope } from "./decision-contract.js";

export type LedgerMetricValue = string | number | boolean | null;

export type LedgerStatus =
  | "open"
  | "measuring"
  | "closed"
  | "recalculated"
  | "disputed";

export type LedgerValidationStatus = "estimated" | "validated" | "contested";

export interface LedgerMetricSnapshot {
  recordedAt: ISODateTimeString;
  values: Record<string, LedgerMetricValue>;
}

export interface LedgerRecommendedSnapshot extends LedgerMetricSnapshot {
  actionSummary: string;
}

export interface LedgerApprovalSummary {
  approvalId: UUID;
  outcome: "granted" | "rejected" | "overridden";
  actorRole: string;
  actorUserId?: UUID;
  decidedAt: ISODateTimeString;
}

export interface LedgerActionSummary {
  actionId: UUID;
  status:
    | "dry_run"
    | "pending"
    | "dispatched"
    | "acknowledged"
    | "failed"
    | "retried"
    | "canceled";
  destination: string;
  targetReference?: string;
  lastAttemptAt?: ISODateTimeString;
}

export interface LedgerCounterfactual {
  method: string;
  methodVersion?: string;
  description?: string;
  inputs?: readonly string[];
}

export interface LedgerRoiComponent {
  key: string;
  label: string;
  kind: "benefit" | "cost";
  value: number;
  validationStatus: LedgerValidationStatus;
}

export interface LedgerRoi {
  currency: string;
  estimatedValue?: number;
  realizedValue?: number;
  validationStatus: LedgerValidationStatus;
  components: readonly LedgerRoiComponent[];
  validatedBy?: UUID;
  validatedAt?: ISODateTimeString;
}

export interface LedgerExplanation {
  topDrivers: readonly string[];
  bindingConstraints: readonly string[];
  notes?: string;
}

export interface LedgerSupersedes {
  ledgerId: UUID;
  revision: number;
}

export interface LedgerDispute {
  openedAt: ISODateTimeString;
  reason: string;
  reviewerUserId?: UUID;
}

export interface LedgerEntry {
  kind: "LedgerEntry";
  schemaVersion: "1.0.0";
  ledgerId: UUID;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  scenarioRunId?: UUID;
  status: LedgerStatus;
  revision: number;
  scope: DecisionScope;
  baseline: LedgerMetricSnapshot;
  recommended: LedgerRecommendedSnapshot;
  approvals: LedgerApprovalSummary[];
  action: LedgerActionSummary;
  actual?: LedgerMetricSnapshot;
  counterfactual: LedgerCounterfactual;
  roi: LedgerRoi;
  explanation: LedgerExplanation;
  openedAt: ISODateTimeString;
  closedAt?: ISODateTimeString;
  supersedes?: LedgerSupersedes;
  dispute?: LedgerDispute;
}
