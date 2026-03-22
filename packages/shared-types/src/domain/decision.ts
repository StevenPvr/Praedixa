// Decision domain types - Recommendations and actions

import type {
  TenantEntity,
  UUID,
  ISODateString,
  ISODateTimeString,
} from "../utils/common";
import type { DateRange } from "../utils/dates";
import type { RiskIndicators } from "./forecast";

/** Decision type */
export type DecisionType =
  | "replacement" // Hire replacement
  | "redistribution" // Redistribute work
  | "postponement" // Postpone non-critical tasks
  | "overtime" // Approve overtime
  | "external" // External contractor
  | "training" // Cross-training
  | "no_action"; // Accept risk

/** Decision status */
export type DecisionStatus =
  | "suggested" // AI-generated suggestion
  | "pending_review" // Awaiting manager review
  | "approved" // Manager approved
  | "rejected" // Manager rejected
  | "implemented" // Action taken
  | "expired"; // No longer relevant

/** Decision priority */
export type DecisionPriority = "low" | "medium" | "high" | "critical";

/** Decision/Recommendation entity */
export interface Decision extends TenantEntity {
  /** Related forecast run */
  forecastRunId?: UUID;
  /** Target date range */
  targetPeriod: DateRange;
  /** Department affected */
  departmentId: UUID;
  /** Decision type */
  type: DecisionType;
  /** Priority level */
  priority: DecisionPriority;
  /** Status */
  status: DecisionStatus;
  /** Title/Summary */
  title: string;
  /** Detailed description */
  description: string;
  /** Rationale/Justification */
  rationale: string;
  /** Risk indicators that triggered this */
  riskIndicators: RiskIndicators;
  /** Estimated cost of action */
  estimatedCost?: number;
  /** Estimated cost of inaction */
  costOfInaction?: number;
  /** ROI if implemented */
  estimatedROI?: number;
  /** Confidence score (0-100) */
  confidenceScore: number;
  /** Related employee (if applicable) */
  relatedEmployeeId?: UUID;
  /** Suggested replacement employee */
  suggestedReplacementId?: UUID;
  /** Manager who reviewed */
  reviewedBy?: UUID;
  /** Review timestamp */
  reviewedAt?: ISODateTimeString;
  /** Manager notes */
  managerNotes?: string;
  /** Implementation deadline */
  implementationDeadline?: ISODateString;
  /** Implemented by */
  implementedBy?: UUID;
  /** Implemented at */
  implementedAt?: ISODateTimeString;
  /** Outcome tracking */
  outcome?: DecisionOutcome;
}

/** Decision outcome after implementation */
export interface DecisionOutcome {
  /** Was the decision effective? */
  effective: boolean;
  /** Actual cost incurred */
  actualCost?: number;
  /** Actual impact on operations */
  actualImpact: string;
  /** Lessons learned */
  lessonsLearned?: string;
  /** Recorded at */
  recordedAt: ISODateTimeString;
  /** Recorded by */
  recordedBy: UUID;
}

/** Decision summary for listings */
export interface DecisionSummary {
  id: UUID;
  type: DecisionType;
  priority: DecisionPriority;
  status: DecisionStatus;
  title: string;
  targetPeriod: DateRange;
  departmentId: UUID;
  departmentName?: string;
  estimatedCost?: number;
  costOfInaction?: number;
  confidenceScore: number;
}

/** Cost impact analysis */
export interface CostImpactAnalysis {
  period: DateRange;
  departmentId?: UUID;
  /** Direct costs */
  directCosts: {
    replacementCosts: number;
    overtimeCosts: number;
    externalContractorCosts: number;
  };
  /** Indirect costs */
  indirectCosts: {
    productivityLoss: number;
    managementOverhead: number;
    trainingCosts: number;
  };
  /** Total cost */
  totalCost: number;
  /** Cost per absence day */
  costPerAbsenceDay: number;
  /** Comparison with previous period */
  comparison?: {
    previousPeriodCost: number;
    percentageChange: number;
  };
}

/** Arbitrage option from the scoring engine */
export interface ArbitrageOption {
  type: DecisionType;
  label: string;
  cost: number;
  delayDays: number;
  coverageImpactPct: number;
  riskLevel: "low" | "medium" | "high";
  riskDetails: string;
  pros: string[];
  cons: string[];
}

/** Arbitrage result with all options for an alert */
export interface ArbitrageResult {
  alertId: UUID;
  alertTitle: string;
  alertSeverity: "info" | "warning" | "error" | "critical";
  departmentName: string;
  siteName: string;
  deficitPct: number;
  horizonDays: number;
  options: ArbitrageOption[];
  recommendationIndex: number;
}

/** Dashboard alert */
export interface DashboardAlert {
  id: UUID;
  type: "risk" | "decision" | "forecast" | "absence" | "system";
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  /** Related entity */
  relatedEntityType?:
    | "absence"
    | "decision"
    | "forecast"
    | "employee"
    | "department";
  relatedEntityId?: UUID;
  /** Action URL */
  actionUrl?: string;
  /** Action label */
  actionLabel?: string;
  /** Created at */
  createdAt: ISODateTimeString;
  /** Dismissed by user */
  dismissedAt?: ISODateTimeString;
  /** Auto-dismiss after */
  expiresAt?: ISODateTimeString;
}
