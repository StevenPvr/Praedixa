import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  DecisionContract,
  DecisionContractActor,
  DecisionContractStatus,
  DecisionContractValidationSummary,
  DecisionPack,
} from "../domain/decision-contract.js";

export type DecisionContractStudioBadgeTone =
  | "neutral"
  | "info"
  | "warning"
  | "success";

export interface DecisionContractStudioBadge {
  label: string;
  tone: DecisionContractStudioBadgeTone;
}

export interface DecisionContractStudioChecklistItem {
  key: string;
  label: string;
  complete: boolean;
  blocking: boolean;
  detail?: string;
}

export interface DecisionContractStudioVersionLineageDisplay {
  currentVersion: number;
  previousVersion?: number | null;
  rollbackFromVersion?: number | null;
  label: string;
}

export interface DecisionContractStudioCollectionDelta {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface DecisionContractStudioChangeSummary {
  hasChanges: boolean;
  graphRefChanged: boolean;
  scopeChanged: boolean;
  objectiveChanged: boolean;
  roiFormulaChanged: boolean;
  explanationTemplateChanged: boolean;
  inputs: DecisionContractStudioCollectionDelta;
  decisionVariables: DecisionContractStudioCollectionDelta;
  hardConstraints: DecisionContractStudioCollectionDelta;
  softConstraints: DecisionContractStudioCollectionDelta;
  approvals: DecisionContractStudioCollectionDelta;
  actions: DecisionContractStudioCollectionDelta;
  policyHooks: DecisionContractStudioCollectionDelta;
  tags: DecisionContractStudioCollectionDelta;
}

export interface DecisionContractStudioListRequest {
  organizationId?: UUID;
  workspaceId?: UUID;
  pack?: DecisionPack;
  statuses?: readonly DecisionContractStatus[];
  search?: string;
  includeArchived?: boolean;
}

export interface DecisionContractStudioValidationSummaryRequest {
  contractId: string;
  contractVersion: number;
}

export interface DecisionContractStudioValidationSummaryResponse {
  contractId: string;
  contractVersion: number;
  status: DecisionContractValidationSummary["status"];
  checkedAt?: ISODateTimeString | null;
  issueCount: number;
  blocking: boolean;
  issues: readonly string[];
  badge: DecisionContractStudioBadge;
}

export interface DecisionContractStudioPublishReadinessRequest {
  contractId: string;
  contractVersion: number;
}

export interface DecisionContractStudioPublishReadinessResponse {
  contractId: string;
  contractVersion: number;
  isReady: boolean;
  blockingCount: number;
  checklist: readonly DecisionContractStudioChecklistItem[];
  badge: DecisionContractStudioBadge;
}

export interface DecisionContractStudioListItemResponse {
  contractId: string;
  contractVersion: number;
  name: string;
  pack: DecisionPack;
  status: DecisionContractStatus;
  updatedAt: ISODateTimeString;
  badge: DecisionContractStudioBadge;
  validation: DecisionContractStudioValidationSummaryResponse;
  publishReadiness: DecisionContractStudioPublishReadinessResponse;
  lineage: DecisionContractStudioVersionLineageDisplay;
}

export interface DecisionContractStudioListResponse {
  total: number;
  items: readonly DecisionContractStudioListItemResponse[];
}

export interface DecisionContractStudioDetailRequest {
  contractId: string;
  contractVersion: number;
  compareToVersion?: number;
}

export interface DecisionContractStudioDetailResponse {
  contract: DecisionContract;
  badge: DecisionContractStudioBadge;
  validation: DecisionContractStudioValidationSummaryResponse;
  publishReadiness: DecisionContractStudioPublishReadinessResponse;
  lineage: DecisionContractStudioVersionLineageDisplay;
  changeSummary?: DecisionContractStudioChangeSummary;
}

export interface DecisionContractStudioForkDraftRequest {
  contractId: string;
  contractVersion: number;
  actor: DecisionContractActor;
  name?: string;
  description?: string;
}

export interface DecisionContractStudioForkDraftResponse {
  sourceContractId: string;
  sourceContractVersion: number;
  draftContract: DecisionContract;
  badge: DecisionContractStudioBadge;
  validation: DecisionContractStudioValidationSummaryResponse;
  publishReadiness: DecisionContractStudioPublishReadinessResponse;
  lineage: DecisionContractStudioVersionLineageDisplay;
}

export interface DecisionContractStudioRollbackCandidateRequest {
  contractId: string;
  contractVersion: number;
}

export interface DecisionContractStudioRollbackCandidateItemResponse {
  contractId: string;
  contractVersion: number;
  status: DecisionContractStatus;
  updatedAt: ISODateTimeString;
  changeReason: string;
  badge: DecisionContractStudioBadge;
  validation: DecisionContractStudioValidationSummaryResponse;
  lineage: DecisionContractStudioVersionLineageDisplay;
}

export interface DecisionContractStudioRollbackCandidateResponse {
  contractId: string;
  contractVersion: number;
  candidates: readonly DecisionContractStudioRollbackCandidateItemResponse[];
}
