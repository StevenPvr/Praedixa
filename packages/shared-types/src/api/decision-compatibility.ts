import type {
  DecisionContract,
  DecisionPack,
} from "../domain/decision-contract.js";
import type { DecisionGraph } from "../domain/decision-graph.js";

export type DecisionCompatibilityIssueSeverity = "blocking" | "warning";

export type DecisionCompatibilityIssueCode =
  | "graph_id_mismatch"
  | "graph_version_mismatch"
  | "graph_version_backward_compatible"
  | "graph_version_assumption_mismatch"
  | "canonical_model_version_assumption_mismatch"
  | "unsupported_pack"
  | "missing_horizon"
  | "missing_input_entity"
  | "missing_input_attribute"
  | "missing_metric"
  | "missing_event_source"
  | "approval_step_order_warning"
  | "approval_role_warning"
  | "approval_threshold_warning"
  | "action_template_warning"
  | "action_shape_warning";

export type DecisionCompatibilityMetricGapSource =
  | "objective"
  | "approval_threshold"
  | "explanation_driver";

export interface DecisionCompatibilityVersionAssumptions {
  expectedGraphVersion?: number;
  expectedCanonicalModelVersion?: string;
  allowBackwardCompatibleGraphVersion?: boolean;
}

export interface DecisionCompatibilityEventAssumptions {
  requiredSourceSystems?: readonly string[];
}

export interface DecisionCompatibilityRequest {
  contract: DecisionContract;
  graph: DecisionGraph;
  versionAssumptions?: DecisionCompatibilityVersionAssumptions;
  eventAssumptions?: DecisionCompatibilityEventAssumptions;
}

export interface DecisionCompatibilityInputGap {
  inputKey: string;
  entity: string;
  attribute: string;
  reason: "missing_entity" | "missing_attribute";
}

export interface DecisionCompatibilityMetricGap {
  metricKey: string;
  source: DecisionCompatibilityMetricGapSource;
}

export interface DecisionCompatibilityIssue {
  severity: DecisionCompatibilityIssueSeverity;
  code: DecisionCompatibilityIssueCode;
  message: string;
  contractField?: string;
  graphField?: string;
  reference?: string;
}

export interface DecisionCompatibilityResponse {
  contractId: string;
  contractVersion: number;
  graphId: string;
  graphVersion: number;
  compatible: boolean;
  blockingIssueCount: number;
  warningCount: number;
  contractGraphRefMatches: boolean;
  versionAssumptionsSatisfied: boolean;
  eventAssumptionsSatisfied: boolean;
  unsupportedPacks: readonly DecisionPack[];
  missingInputs: readonly DecisionCompatibilityInputGap[];
  missingMetrics: readonly DecisionCompatibilityMetricGap[];
  horizonMismatch: boolean;
  approvalWarnings: readonly DecisionCompatibilityIssue[];
  actionWarnings: readonly DecisionCompatibilityIssue[];
  issues: readonly DecisionCompatibilityIssue[];
}
