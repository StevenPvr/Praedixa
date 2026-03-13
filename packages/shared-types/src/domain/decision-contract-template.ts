import type {
  DecisionAllowedAction,
  DecisionApprovalRequirement,
  DecisionConstraint,
  DecisionContractInputRef,
  DecisionEntityType,
  DecisionExplanationTemplate,
  DecisionGraphRef,
  DecisionObjective,
  DecisionPack,
  DecisionRoiFormula,
  DecisionScope,
  DecisionSelectorMode,
  DecisionSoftConstraint,
  DecisionVariable,
} from "./decision-contract.js";

export const DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION = "1.0.0";

export const DECISION_CONTRACT_TEMPLATE_PACKS = [
  "coverage",
  "flow",
  "allocation",
  "core",
] as const satisfies readonly DecisionPack[];

export type DecisionContractTemplateStatus = "active" | "deprecated";

export interface DecisionContractTemplateEligibility {
  entityTypes: readonly DecisionEntityType[];
  selectorModes: readonly DecisionSelectorMode[];
  horizonIds: readonly string[];
  requiredSignals: readonly string[];
  requiredActions: readonly string[];
  requiredPolicyHooks: readonly string[];
  requiredCapabilities?: readonly string[];
}

export interface DecisionContractTemplateSections {
  scope: DecisionScope;
  inputs: readonly DecisionContractInputRef[];
  objective: DecisionObjective;
  decisionVariables: readonly DecisionVariable[];
  hardConstraints: readonly DecisionConstraint[];
  softConstraints: readonly DecisionSoftConstraint[];
  approvals: readonly DecisionApprovalRequirement[];
  actions: readonly DecisionAllowedAction[];
  policyHooks: readonly string[];
  roiFormula: DecisionRoiFormula;
  explanationTemplate: DecisionExplanationTemplate;
}

export interface DecisionContractTemplate {
  kind: "DecisionContractTemplate";
  schemaVersion: typeof DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION;
  templateId: string;
  templateVersion: number;
  pack: DecisionPack;
  status: DecisionContractTemplateStatus;
  name: string;
  description?: string;
  graphRef: DecisionGraphRef;
  eligibility: DecisionContractTemplateEligibility;
  sections: DecisionContractTemplateSections;
  tags?: readonly string[];
}
