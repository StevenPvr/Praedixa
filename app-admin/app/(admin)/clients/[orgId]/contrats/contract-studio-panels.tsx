"use client";

import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";

import { ContractStudioCreatePanel } from "./contract-studio-create-panel";
import { ContractStudioMutationPanel } from "./contract-studio-mutation-panel";
import type { ContractStudioSelection } from "./contract-studio-shared";

interface ContractStudioPanelsProps {
  orgId: string;
  detail: DecisionContractStudioDetailResponse | null;
  rollbackCandidates: DecisionContractStudioRollbackCandidateResponse | null;
  templates: DecisionContractTemplateListResponse | null;
  canMutate: boolean;
  onSelectionChange: (selection: ContractStudioSelection) => void;
}

export function ContractStudioPanels({
  orgId,
  detail,
  rollbackCandidates,
  templates,
  canMutate,
  onSelectionChange,
}: Readonly<ContractStudioPanelsProps>) {
  if (!detail) {
    return templates ? (
      <ContractStudioCreatePanel
        orgId={orgId}
        templates={templates}
        canMutate={canMutate}
        onCreated={onSelectionChange}
      />
    ) : null;
  }

  return (
    <ContractStudioMutationPanel
      orgId={orgId}
      detail={detail}
      rollbackCandidates={rollbackCandidates}
      canMutate={canMutate}
      onSelectionChange={onSelectionChange}
    />
  );
}
