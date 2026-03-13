import type {
  DecisionContract,
  DecisionContractActor,
  DecisionPack,
  DecisionScope,
} from "../domain/decision-contract.js";

export type DecisionContractTemplateStatus = "active" | "deprecated";

export interface DecisionContractTemplateSummary {
  templateId: string;
  templateVersion: number;
  pack: DecisionPack;
  name: string;
  description?: string;
  status: DecisionContractTemplateStatus;
  graphId: string;
  graphVersion: number;
  horizonIds: readonly string[];
  actionTypes: readonly string[];
  destinationTypes: readonly string[];
  approvalRoles: readonly string[];
  tags?: readonly string[];
}

export interface DecisionContractTemplateListRequest {
  pack?: DecisionPack;
  includeDeprecated?: boolean;
  search?: string;
  tags?: readonly string[];
}

export interface DecisionContractTemplateListResponse {
  total: number;
  items: readonly DecisionContractTemplateSummary[];
}

export interface DecisionContractTemplateInstantiateRequest {
  templateId: string;
  templateVersion?: number;
  contractId: string;
  name: string;
  description?: string;
  actor: DecisionContractActor;
  scopeOverrides?: Partial<DecisionScope>;
  tags?: readonly string[];
}

export interface DecisionContractTemplateInstantiateResponse {
  template: DecisionContractTemplateSummary;
  contract: DecisionContract;
}
