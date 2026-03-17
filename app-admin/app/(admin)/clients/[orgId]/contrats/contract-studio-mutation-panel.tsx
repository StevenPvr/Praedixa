"use client";

import { useState } from "react";
import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioRollbackRequest,
  DecisionContractStudioTransitionRequest,
} from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ReadOnlyStateCard } from "../read-only-detail";
import {
  nextSelectionFromResult,
  type ContractStudioSelection,
} from "./contract-studio-shared";

interface ContractStudioMutationPanelProps {
  orgId: string;
  detail: DecisionContractStudioDetailResponse;
  rollbackCandidates: DecisionContractStudioRollbackCandidateResponse | null;
  canMutate: boolean;
  onSelectionChange: (selection: ContractStudioSelection) => void;
}

interface ContractStudioMutationCardProps {
  detail: DecisionContractStudioDetailResponse;
  reason: string;
  setReason: (value: string) => void;
  localError: string | null;
  transitionMutation: ReturnType<typeof useTransitionMutation>;
  forkMutation: ReturnType<typeof useForkMutation>;
  rollbackMutation: ReturnType<typeof useRollbackMutation>;
  transitionActions: ReturnType<typeof transitionActionsForStatus>;
  rollbackButtons: DecisionContractStudioRollbackCandidateResponse["candidates"];
  onSubmitTransition: (
    transition: DecisionContractStudioTransitionRequest["transition"],
  ) => void;
  onSubmitFork: () => void;
  onSubmitRollback: (targetVersion: number) => void;
}

function transitionActionsForStatus(status: string) {
  if (status === "draft") {
    return [
      {
        transition: "submit_for_testing" as const,
        label: "Envoyer en testing",
      },
      { transition: "archive" as const, label: "Archiver" },
    ];
  }
  if (status === "testing") {
    return [
      { transition: "approve" as const, label: "Approuver" },
      { transition: "archive" as const, label: "Archiver" },
    ];
  }
  if (status === "approved") {
    return [
      { transition: "publish" as const, label: "Publier" },
      { transition: "archive" as const, label: "Archiver" },
    ];
  }
  if (status === "published") {
    return [{ transition: "archive" as const, label: "Archiver" }];
  }
  if (status === "archived") {
    return [
      { transition: "reopen_draft" as const, label: "Reouvrir en draft" },
    ];
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

function useTransitionSubmission(
  reason: string,
  setLocalError: (value: string | null) => void,
  transitionMutation: ReturnType<typeof useTransitionMutation>,
  onSelectionChange: (selection: ContractStudioSelection) => void,
) {
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

  return submitTransition;
}

function useForkSubmission(
  reason: string,
  detail: DecisionContractStudioDetailResponse,
  setLocalError: (value: string | null) => void,
  forkMutation: ReturnType<typeof useForkMutation>,
  onSelectionChange: (selection: ContractStudioSelection) => void,
) {
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

  return submitFork;
}

function useRollbackSubmission(
  reason: string,
  detail: DecisionContractStudioDetailResponse,
  setLocalError: (value: string | null) => void,
  rollbackMutation: ReturnType<typeof useRollbackMutation>,
  onSelectionChange: (selection: ContractStudioSelection) => void,
) {
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

  return submitRollback;
}

function ContractStudioMutationError({
  localError,
  transitionError,
  forkError,
  rollbackError,
}: {
  localError: string | null;
  transitionError: string | null;
  forkError: string | null;
  rollbackError: string | null;
}) {
  const error = localError ?? transitionError ?? forkError ?? rollbackError;
  return error ? <p className="text-sm text-danger-text">{error}</p> : null;
}

function ContractStudioReasonField({
  reason,
  onChange,
}: {
  reason: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm text-ink-tertiary">
      <span>Motif commun</span>
      <input
        value={reason}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

function ContractStudioTransitionActions({
  transitionActions,
  transitionLoading,
  forkLoading,
  isPublished,
  onSubmitTransition,
  onSubmitFork,
}: {
  transitionActions: ReturnType<typeof transitionActionsForStatus>;
  transitionLoading: boolean;
  forkLoading: boolean;
  isPublished: boolean;
  onSubmitTransition: (
    transition: DecisionContractStudioTransitionRequest["transition"],
  ) => void;
  onSubmitFork: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {transitionActions.map((action) => (
        <Button
          key={action.transition}
          size="sm"
          loading={transitionLoading}
          onClick={() => onSubmitTransition(action.transition)}
        >
          {action.label}
        </Button>
      ))}
      {isPublished ? (
        <Button
          size="sm"
          variant="secondary"
          loading={forkLoading}
          onClick={onSubmitFork}
        >
          Creer un fork draft
        </Button>
      ) : null}
    </div>
  );
}

function ContractStudioRollbackActions({
  candidates,
  loading,
  onSubmitRollback,
}: {
  candidates: DecisionContractStudioRollbackCandidateResponse["candidates"];
  loading: boolean;
  onSubmitRollback: (targetVersion: number) => void;
}) {
  if (candidates.length === 0) {
    return null;
  }
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        Rollback candidates
      </p>
      <div className="flex flex-wrap gap-2">
        {candidates.map((candidate) => (
          <Button
            key={candidate.contractVersion}
            size="sm"
            variant="secondary"
            loading={loading}
            onClick={() => onSubmitRollback(candidate.contractVersion)}
          >
            Restaurer v{candidate.contractVersion}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ContractStudioMutationIntro() {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-secondary">
        Actions de gouvernance
      </h3>
      <p className="text-sm text-ink-tertiary">
        Les transitions, forks et rollbacks restent strictement audites et
        derives du runtime persistant.
      </p>
    </div>
  );
}

function ContractStudioMutationActionsBlock(
  props: Pick<
    ContractStudioMutationCardProps,
    | "detail"
    | "localError"
    | "transitionMutation"
    | "forkMutation"
    | "rollbackMutation"
    | "transitionActions"
    | "rollbackButtons"
    | "onSubmitTransition"
    | "onSubmitFork"
    | "onSubmitRollback"
  >,
) {
  return (
    <>
      <ContractStudioMutationError
        localError={props.localError}
        transitionError={props.transitionMutation.error}
        forkError={props.forkMutation.error}
        rollbackError={props.rollbackMutation.error}
      />
      <ContractStudioTransitionActions
        transitionActions={props.transitionActions}
        transitionLoading={props.transitionMutation.loading}
        forkLoading={props.forkMutation.loading}
        isPublished={props.detail.contract.status === "published"}
        onSubmitTransition={props.onSubmitTransition}
        onSubmitFork={props.onSubmitFork}
      />
      <ContractStudioRollbackActions
        candidates={props.rollbackButtons}
        loading={props.rollbackMutation.loading}
        onSubmitRollback={props.onSubmitRollback}
      />
    </>
  );
}

function ContractStudioMutationCard(props: ContractStudioMutationCardProps) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <ContractStudioMutationIntro />
        <ContractStudioReasonField
          reason={props.reason}
          onChange={props.setReason}
        />
        <ContractStudioMutationActionsBlock {...props} />
      </CardContent>
    </Card>
  );
}

function useContractStudioMutationController({
  orgId,
  detail,
  rollbackCandidates,
  onSelectionChange,
}: Omit<ContractStudioMutationPanelProps, "canMutate">) {
  const transitionMutation = useTransitionMutation(orgId, detail);
  const forkMutation = useForkMutation(orgId, detail);
  const rollbackMutation = useRollbackMutation(orgId, detail);
  const [reason, setReason] = useState("governance_update");
  const [localError, setLocalError] = useState<string | null>(null);
  const transitionActions = transitionActionsForStatus(detail.contract.status);
  const rollbackButtons = rollbackCandidates?.candidates ?? [];
  const submitTransition = useTransitionSubmission(
    reason,
    setLocalError,
    transitionMutation,
    onSelectionChange,
  );
  const submitFork = useForkSubmission(
    reason,
    detail,
    setLocalError,
    forkMutation,
    onSelectionChange,
  );
  const submitRollback = useRollbackSubmission(
    reason,
    detail,
    setLocalError,
    rollbackMutation,
    onSelectionChange,
  );

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

export function ContractStudioMutationPanel({
  orgId,
  detail,
  rollbackCandidates,
  canMutate,
  onSelectionChange,
}: ContractStudioMutationPanelProps) {
  const controller = useContractStudioMutationController({
    orgId,
    detail,
    rollbackCandidates,
    onSelectionChange,
  });

  if (!canMutate) {
    return (
      <ReadOnlyStateCard
        tone="warning"
        title="Mutations restreintes"
        message="Le studio reste lisible, mais les mutations de lifecycle exigent la permission admin:org:write."
      />
    );
  }
  return (
    <ContractStudioMutationCard
      detail={detail}
      reason={controller.reason}
      setReason={controller.setReason}
      localError={controller.localError}
      transitionMutation={controller.transitionMutation}
      forkMutation={controller.forkMutation}
      rollbackMutation={controller.rollbackMutation}
      transitionActions={controller.transitionActions}
      rollbackButtons={controller.rollbackButtons}
      onSubmitTransition={(transition) =>
        void controller.submitTransition(transition)
      }
      onSubmitFork={() => void controller.submitFork()}
      onSubmitRollback={(targetVersion) =>
        void controller.submitRollback(targetVersion)
      }
    />
  );
}
