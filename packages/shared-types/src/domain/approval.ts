import type { ISODateTimeString, UUID } from "../utils/common.js";
import type { DecisionScope } from "./decision-contract.js";

export type ApprovalStatus =
  | "requested"
  | "granted"
  | "rejected"
  | "expired"
  | "canceled";

export type ApprovalOutcome = "granted" | "rejected" | "overridden";
export type ApprovalActorType = "user" | "system" | "service";

export interface ApprovalActorRef {
  actorType: ApprovalActorType;
  actorId: string;
  actorRole?: string;
}

export interface ApprovalRule {
  ruleId: string;
  stepOrder: number;
  approverRole: string;
  deadlineHours?: number;
}

export interface ApprovalPolicyContext {
  estimatedCostEur?: number;
  riskScore?: number;
  actionTypes: readonly string[];
  destinationTypes?: readonly string[];
}

export interface ApprovalDecision {
  outcome: ApprovalOutcome;
  actorUserId: UUID;
  actorRole: string;
  reasonCode: string;
  comment?: string;
  decidedAt: ISODateTimeString;
}

export interface ApprovalSeparationOfDuties {
  required: boolean;
  satisfied: boolean;
  requesterActorId?: string;
  approverActorId?: string;
}

export interface ApprovalEvent {
  fromStatus: ApprovalStatus;
  toStatus: ApprovalStatus;
  actorId: string;
  actorRole: string;
  occurredAt: ISODateTimeString;
  reasonCode?: string;
  comment?: string;
}

export interface ApprovalRecord {
  kind: "Approval";
  schemaVersion: "1.0.0";
  approvalId: UUID;
  contractId: string;
  contractVersion: number;
  recommendationId: UUID;
  scenarioRunId?: UUID;
  status: ApprovalStatus;
  scope: DecisionScope;
  requestedAt: ISODateTimeString;
  deadlineAt?: ISODateTimeString;
  requestedBy: ApprovalActorRef;
  rule: ApprovalRule;
  policyContext: ApprovalPolicyContext;
  decision?: ApprovalDecision;
  separationOfDuties: ApprovalSeparationOfDuties;
  notes?: string;
  history: readonly ApprovalEvent[];
}

export interface ApprovalMatrixRule {
  ruleId: string;
  approverRole: string;
  minEstimatedCostEur?: number;
  minRiskScore?: number;
  requiredActionTypes?: readonly string[];
  destinationTypes?: readonly string[];
  stepOrder: number;
  deadlineHours?: number;
  requireJustification?: boolean;
  requireSeparationOfDuties?: boolean;
}
