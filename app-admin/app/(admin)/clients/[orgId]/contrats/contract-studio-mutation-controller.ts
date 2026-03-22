"use client";

import { useState } from "react";

import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioRollbackRequest,
  DecisionContractStudioTransitionRequest,
} from "@praedixa/shared-types/api";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import {
  nextSelectionFromResult,
  type ContractStudioSelection,
} from "./contract-studio-shared";

export interface ContractStudioMutationControllerInput {
  orgId: string;
  detail: DecisionContractStudioDetailResponse;
  rollbackCandidates: DecisionContractStudioRollbackCandidateResponse | null;
  onSelectionChange: (selection: ContractStudioSelection) => void;
}

export type ContractStudioTransitionAction = {
  transition: DecisionContractStudioTransitionRequest["transition"];
  label: string;
};

function transitionActionsForStatus(
  status: string,
): ContractStudioTransitionAction[] {
  if (status === "draft") {
    return [
      { transition: "submit_for_testing", label: "Envoyer en testing" },
      { transition: "archive", label: "Archiver" },
    ];
  }
  if (status === "testing") {
    return [
      { transition: "approve", label: "Approuver" },
      { transition: "archive", label: "Archiver" },
    ];
  }
  if (status === "approved") {
    return [
      { transition: "publish", label: "Publier" },
      { transition: "archive", label: "Archiver" },
    ];
  }
  if (status === "published") {
    return [{ transition: "archive", label: "Archiver" }];
  }
  if (status === "archived") {
    return [{ transition: "reopen_draft", label: "Reouvrir en draft" }];
  }
  return [];
}

function requireMutationReason(
  reason: string,
  setLocalError: (value: string | null) => void,
  message: string,
) {
  const trimmedReason = reason.trim();
  if (trimmedReason.length === 0) {
    setLocalError(message);
    return null;
  }
  setLocalError(null);
  return trimmedReason;
}

function resolveMutationSelection(
  response:
    | DecisionContractStudioDetailResponse
    | DecisionContractStudioForkDraftResponse
    | null,
  onSelectionChange: (selection: ContractStudioSelection) => void,
) {
  const selection = nextSelectionFromResult(response);
  if (selection) {
    onSelectionChange(selection);
  }
}

function useTransitionMutation(
  orgId: string,
  detail: DecisionContractStudioDetailResponse,
) {
  return useApiPost<
    DecisionContractStudioTransitionRequest,
    DecisionContractStudioDetailResponse
  >(
    ADMIN_ENDPOINTS.orgDecisionContractTransition(
      orgId,
      detail.contract.contractId,
      detail.contract.contractVersion,
    ),
  );
}

function useForkMutation(
  orgId: string,
  detail: DecisionContractStudioDetailResponse,
) {
  return useApiPost<
    { reason: string; notes?: string; name?: string; description?: string },
    DecisionContractStudioForkDraftResponse
  >(
    ADMIN_ENDPOINTS.orgDecisionContractFork(
      orgId,
      detail.contract.contractId,
      detail.contract.contractVersion,
    ),
  );
}

function useRollbackMutation(
  orgId: string,
  detail: DecisionContractStudioDetailResponse,
) {
  return useApiPost<
    DecisionContractStudioRollbackRequest,
    DecisionContractStudioForkDraftResponse
  >(
    ADMIN_ENDPOINTS.orgDecisionContractRollback(
      orgId,
      detail.contract.contractId,
      detail.contract.contractVersion,
    ),
  );
}

export function useContractStudioMutationController({
  orgId,
  detail,
  rollbackCandidates,
  onSelectionChange,
}: ContractStudioMutationControllerInput) {
  const transitionMutation = useTransitionMutation(orgId, detail);
  const forkMutation = useForkMutation(orgId, detail);
  const rollbackMutation = useRollbackMutation(orgId, detail);
  const [reason, setReason] = useState("governance_update");
  const [localError, setLocalError] = useState<string | null>(null);
  const transitionActions = transitionActionsForStatus(detail.contract.status);
  const rollbackButtons = rollbackCandidates?.candidates ?? [];

  async function submitTransition(
    transition: DecisionContractStudioTransitionRequest["transition"],
  ) {
    const trimmedReason = requireMutationReason(
      reason,
      setLocalError,
      "Un motif est requis pour toute mutation de contrat.",
    );
    if (!trimmedReason) {
      return;
    }
    const response = await transitionMutation.mutate({
      transition,
      reason: trimmedReason,
    });
    resolveMutationSelection(response, onSelectionChange);
  }

  async function submitFork() {
    const trimmedReason = requireMutationReason(
      reason,
      setLocalError,
      "Un motif est requis pour creer un fork.",
    );
    if (!trimmedReason) {
      return;
    }
    const response = await forkMutation.mutate({
      reason: trimmedReason,
      name: `${detail.contract.name} draft`,
    });
    resolveMutationSelection(response, onSelectionChange);
  }

  async function submitRollback(targetVersion: number) {
    const trimmedReason = requireMutationReason(
      reason,
      setLocalError,
      "Un motif est requis pour lancer un rollback.",
    );
    if (!trimmedReason) {
      return;
    }
    const response = await rollbackMutation.mutate({
      targetVersion,
      reason: trimmedReason,
      name: `${detail.contract.name} rollback`,
    });
    resolveMutationSelection(response, onSelectionChange);
  }

  return {
    forkMutation,
    localError,
    reason,
    rollbackButtons,
    rollbackMutation,
    setReason,
    submitFork,
    submitRollback,
    submitTransition,
    transitionActions,
    transitionMutation,
  };
}
