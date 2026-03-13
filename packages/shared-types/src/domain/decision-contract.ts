import type { ISODateTimeString, UUID } from "../utils/common.js";

export type DecisionPack = "coverage" | "flow" | "allocation" | "core";

export type DecisionEntityType =
  | "organization"
  | "site"
  | "team"
  | "flow"
  | "route"
  | "order_aggregate"
  | "stock_node"
  | "period";

export type DecisionSelectorMode = "all" | "ids" | "query";

export type DecisionContractStatus =
  | "draft"
  | "testing"
  | "approved"
  | "published"
  | "archived";

export type DecisionContractTransition =
  | "submit_for_testing"
  | "approve"
  | "publish"
  | "archive"
  | "reopen_draft";

export interface DecisionSelector {
  mode: DecisionSelectorMode;
  ids?: string[];
  query?: string;
}

export interface DecisionScope {
  entityType: DecisionEntityType;
  selector: DecisionSelector;
  horizonId: string;
  dimensions?: Record<string, string>;
}

export interface DecisionTemplateRef {
  templateId: string;
  templateVersion: number;
}

export interface DecisionGraphRef {
  graphId: string;
  graphVersion: number;
}

export interface DecisionContractInputRef {
  key: string;
  entity: string;
  attribute: string;
  required: boolean;
  aggregation?: "sum" | "avg" | "min" | "max" | "latest";
  description?: string;
}

export interface DecisionObjective {
  metricKey: string;
  direction: "maximize" | "minimize";
  label?: string;
  targetValue?: number;
}

export interface DecisionVariableDomain {
  kind: "boolean" | "integer" | "number" | "enum";
  min?: number;
  max?: number;
  step?: number;
  allowedValues?: string[];
}

export interface DecisionVariable {
  key: string;
  label: string;
  domain: DecisionVariableDomain;
  description?: string;
}

export interface DecisionConstraint {
  key: string;
  expression: string;
  description?: string;
}

export interface DecisionSoftConstraint extends DecisionConstraint {
  weight: number;
}

export interface DecisionApprovalRequirement {
  ruleId: string;
  approverRole: string;
  minStepOrder: number;
  thresholdKey?: string;
}

export interface DecisionAllowedAction {
  actionType: string;
  destinationType: string;
  templateId?: string;
}

export interface DecisionRoiFormulaComponent {
  key: string;
  label: string;
  kind: "benefit" | "cost";
  expression: string;
}

export interface DecisionRoiFormula {
  currency: string;
  estimatedExpression: string;
  realizedExpression?: string;
  components: DecisionRoiFormulaComponent[];
}

export interface DecisionExplanationTemplate {
  summaryTemplate: string;
  topDriverKeys: string[];
  bindingConstraintKeys: string[];
}

export interface DecisionContractValidationSummary {
  status: "pending" | "passed" | "failed";
  checkedAt?: ISODateTimeString | null;
  issues: string[];
}

export interface DecisionContractActor {
  userId: UUID;
  decidedAt: ISODateTimeString;
  reason: string;
  notes?: string;
}

export interface DecisionContractVersionLineage {
  previousVersion?: number | null;
  rollbackFromVersion?: number | null;
}

export interface DecisionContractAudit extends DecisionContractVersionLineage {
  createdBy: UUID;
  createdAt: ISODateTimeString;
  updatedBy: UUID;
  updatedAt: ISODateTimeString;
  changeReason: string;
  notes?: string | null;
  approvedBy?: UUID | null;
  approvedAt?: ISODateTimeString | null;
  publishedBy?: UUID | null;
  publishedAt?: ISODateTimeString | null;
  archivedBy?: UUID | null;
  archivedAt?: ISODateTimeString | null;
}

export interface DecisionContract {
  kind: "DecisionContract";
  schemaVersion: "1.0.0";
  contractId: string;
  contractVersion: number;
  name: string;
  description?: string;
  organizationId?: UUID;
  workspaceId?: UUID;
  pack: DecisionPack;
  status: DecisionContractStatus;
  templateRef?: DecisionTemplateRef;
  graphRef: DecisionGraphRef;
  scope: DecisionScope;
  inputs: DecisionContractInputRef[];
  objective: DecisionObjective;
  decisionVariables: DecisionVariable[];
  hardConstraints: DecisionConstraint[];
  softConstraints: DecisionSoftConstraint[];
  approvals: DecisionApprovalRequirement[];
  actions: DecisionAllowedAction[];
  policyHooks: string[];
  roiFormula: DecisionRoiFormula;
  explanationTemplate: DecisionExplanationTemplate;
  validation?: DecisionContractValidationSummary;
  tags?: string[];
  audit: DecisionContractAudit;
}
