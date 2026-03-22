"use client";

import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractStudioTransitionRequest,
} from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { ReadOnlyStateCard } from "../read-only-detail";
import { type ContractStudioSelection } from "./contract-studio-shared";
import {
  useContractStudioMutationController,
  type ContractStudioTransitionAction,
} from "./contract-studio-mutation-controller";

type ContractStudioMutationController = ReturnType<
  typeof useContractStudioMutationController
>;

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
  transitionMutation: ContractStudioMutationController["transitionMutation"];
  forkMutation: ContractStudioMutationController["forkMutation"];
  rollbackMutation: ContractStudioMutationController["rollbackMutation"];
  transitionActions: ContractStudioTransitionAction[];
  rollbackButtons: DecisionContractStudioRollbackCandidateResponse["candidates"];
  onSubmitTransition: (
    transition: DecisionContractStudioTransitionRequest["transition"],
  ) => void;
  onSubmitFork: () => void;
  onSubmitRollback: (targetVersion: number) => void;
}

type ContractStudioMutationErrorProps = {
  localError: string | null;
  transitionError: string | null;
  forkError: string | null;
  rollbackError: string | null;
};

type ContractStudioReasonFieldProps = {
  reason: string;
  onChange: (value: string) => void;
};

type ContractStudioTransitionActionsProps = {
  transitionActions: ContractStudioTransitionAction[];
  transitionLoading: boolean;
  forkLoading: boolean;
  isPublished: boolean;
  onSubmitTransition: (
    transition: DecisionContractStudioTransitionRequest["transition"],
  ) => void;
  onSubmitFork: () => void;
};

type ContractStudioRollbackActionsProps = {
  candidates: DecisionContractStudioRollbackCandidateResponse["candidates"];
  loading: boolean;
  onSubmitRollback: (targetVersion: number) => void;
};

type ContractStudioMutationActionsBlockProps = Pick<
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
>;

function ContractStudioMutationError(
  props: Readonly<ContractStudioMutationErrorProps>,
) {
  const { localError, transitionError, forkError, rollbackError } = props;
  const error = localError ?? transitionError ?? forkError ?? rollbackError;
  return error ? <p className="text-sm text-danger-text">{error}</p> : null;
}

function ContractStudioReasonField(
  props: Readonly<ContractStudioReasonFieldProps>,
) {
  const { reason, onChange } = props;
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

function ContractStudioTransitionActions(
  props: Readonly<ContractStudioTransitionActionsProps>,
) {
  const {
    transitionActions,
    transitionLoading,
    forkLoading,
    isPublished,
    onSubmitTransition,
    onSubmitFork,
  } = props;
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

function ContractStudioRollbackActions(
  props: Readonly<ContractStudioRollbackActionsProps>,
) {
  const { candidates, loading, onSubmitRollback } = props;
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
  props: Readonly<ContractStudioMutationActionsBlockProps>,
) {
  return (
    <div className="space-y-4">
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
    </div>
  );
}

function ContractStudioMutationCard(
  props: Readonly<ContractStudioMutationCardProps>,
) {
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

export function ContractStudioMutationPanel(
  props: Readonly<ContractStudioMutationPanelProps>,
) {
  const { orgId, detail, rollbackCandidates, canMutate, onSelectionChange } =
    props;
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
      onSubmitTransition={controller.submitTransition}
      onSubmitFork={controller.submitFork}
      onSubmitRollback={controller.submitRollback}
    />
  );
}
