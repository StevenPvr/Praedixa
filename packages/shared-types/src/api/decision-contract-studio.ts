import type { ISODateTimeString, UUID } from "../utils/common.js";
import type {
  DecisionContract,
  DecisionContractActor,
  DecisionEntityType,
  DecisionSelectorMode,
  DecisionContractStatus,
  DecisionContractTransition,
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
  history: readonly DecisionContractStudioAuditEntryResponse[];
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
  targetContractVersion?: number;
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

export interface DecisionContractStudioAuditEntryResponse {
  auditId: string;
  action: string;
  actorUserId?: UUID | null;
  targetContractVersion?: number | null;
  reason: string;
  createdAt: ISODateTimeString;
  metadata: Record<string, unknown>;
}

export interface DecisionContractStudioSaveRequest {
  contract: DecisionContract;
}

export interface DecisionContractStudioCreateRequest {
  templateId: string;
  templateVersion?: number;
  pack?: DecisionPack;
  contractId: string;
  name: string;
  description?: string;
  reason: string;
  notes?: string;
  workspaceId?: UUID;
  scopeOverrides?: {
    entityType?: DecisionEntityType;
    selector?: {
      mode?: DecisionSelectorMode;
      ids?: readonly string[];
      query?: string;
    };
    horizonId?: string;
    dimensions?: Record<string, string>;
  };
  tags?: readonly string[];
}

export interface DecisionContractStudioTransitionRequest {
  transition: DecisionContractTransition;
  reason: string;
  notes?: string;
}

export interface DecisionContractStudioForkMutationRequest {
  reason: string;
  notes?: string;
  name?: string;
  description?: string;
}

export interface DecisionContractStudioRollbackRequest {
  targetVersion: number;
  reason: string;
  notes?: string;
  name?: string;
  description?: string;
}
