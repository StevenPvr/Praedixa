"use client";

import { useState } from "react";
import type {
  ActionDispatchDecisionRequest,
  ActionDispatchDecisionResponse,
  ActionDispatchDetailResponse,
} from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import {
  getDispatchPermissionReadOnlyState,
  MutationCommentField,
  MutationErrorText,
  MutationPanelHeader,
  MutationPanelShell,
  MutationReadOnlyCard,
  type MutationReadOnlyState,
} from "./dispatch-control-ui";

type DispatchDecisionOutcome = ActionDispatchDecisionRequest["outcome"];

interface DispatchDecisionAction {
  outcome: DispatchDecisionOutcome;
  label: string;
  variant?: "destructive" | "outline";
}

const DECISION_PERMISSION_COPY = {
  restrictedTitle: "Action restreinte",
  restrictedMessage:
    "La lecture du dispatch est autorisee, mais la progression de statut exige la permission admin:org:write.",
  contractBlockedTitle: "Write-back bloque par contrat",
  contractBlockedMessage:
    "Le contrat actif n'autorise pas ce write-back pour cette destination.",
  missingPermissionsMessage: "Cette action exige aussi",
} as const;

function buildDispatchDecisionActions(
  data: ActionDispatchDetailResponse,
): DispatchDecisionAction[] {
  switch (data.status) {
    case "pending":
      return [
        { outcome: "dispatched", label: "Marquer dispatch" },
        { outcome: "failed", label: "Marquer echec", variant: "outline" },
        data.destination.capabilities.supportsCancellation
          ? { outcome: "canceled", label: "Annuler", variant: "destructive" }
          : null,
      ].filter((value): value is DispatchDecisionAction => value !== null);
    case "dispatched":
      return [
        { outcome: "acknowledged", label: "Confirmer ack" },
        { outcome: "failed", label: "Marquer echec", variant: "outline" },
        data.destination.capabilities.supportsCancellation
          ? { outcome: "canceled", label: "Annuler", variant: "destructive" }
          : null,
      ].filter((value): value is DispatchDecisionAction => value !== null);
    case "failed":
      return [
        data.retryPolicy.eligibility.eligible
          ? { outcome: "retried", label: "Relancer" }
          : null,
        data.destination.capabilities.supportsCancellation
          ? { outcome: "canceled", label: "Annuler", variant: "destructive" }
          : null,
      ].filter((value): value is DispatchDecisionAction => value !== null);
    case "retried":
      return [
        { outcome: "dispatched", label: "Re-dispatcher" },
        { outcome: "failed", label: "Marquer echec", variant: "outline" },
        data.destination.capabilities.supportsCancellation
          ? { outcome: "canceled", label: "Annuler", variant: "destructive" }
          : null,
      ].filter((value): value is DispatchDecisionAction => value !== null);
    default:
      return [];
  }
}

function buildDecisionReasonCode(outcome: DispatchDecisionOutcome): string {
  switch (outcome) {
    case "dispatched":
      return "dispatch_progressed";
    case "acknowledged":
      return "destination_acknowledged";
    case "failed":
      return "dispatch_failed";
    case "retried":
      return "dispatch_retried";
    case "canceled":
      return "dispatch_canceled";
  }
}

function buildDecisionReadOnlyState({
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  actionCount,
}: {
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  actionCount: number;
}): MutationReadOnlyState | null {
  if (data.dispatchMode === "dry_run") {
    return {
      title: "Dry-run uniquement",
      message:
        "Ce dispatch ne peut pas progresser vers une execution live tant qu'il reste en mode dry-run.",
    };
  }
  const permissionState = getDispatchPermissionReadOnlyState({
    canManageDispatch,
    contractAllowsWriteback,
    missingWritebackPermissions,
    ...DECISION_PERMISSION_COPY,
  });
  if (permissionState) {
    return permissionState;
  }
  if (actionCount === 0) {
    return {
      title: "Aucune transition disponible",
      message:
        "Ce dispatch est dans un etat terminal ou ne peut plus progresser depuis cette vue.",
    };
  }
  return null;
}

function useDecisionPanelState({
  orgId,
  actionId,
  onDecisionSaved,
}: {
  orgId: string;
  actionId: string;
  onDecisionSaved: () => void;
}) {
  const [comment, setComment] = useState("");
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const mutation = useApiPost<
    ActionDispatchDecisionRequest,
    ActionDispatchDecisionResponse
  >(ADMIN_ENDPOINTS.orgActionDispatchDecision(orgId, actionId));

  async function submitDecision(outcome: DispatchDecisionOutcome) {
    const trimmedComment = comment.trim();
    const response = await mutation.mutate({
      outcome,
      reasonCode: buildDecisionReasonCode(outcome),
      comment: trimmedComment.length > 0 ? trimmedComment : undefined,
      errorCode: outcome === "failed" ? "manual_dispatch_failure" : undefined,
    });
    if (!response) {
      return;
    }
    setComment("");
    setLastOutcome(response.actionStatus);
    onDecisionSaved();
  }

  return { comment, setComment, lastOutcome, mutation, submitDecision };
}

function DecisionActionButtons({
  actions,
  loading,
  onAction,
}: {
  actions: readonly DispatchDecisionAction[];
  loading: boolean;
  onAction: (outcome: DispatchDecisionOutcome) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.outcome}
          size="sm"
          variant={action.variant}
          loading={loading}
          onClick={() => onAction(action.outcome)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function DecisionMutationCard({
  actions,
  comment,
  lastOutcome,
  error,
  loading,
  setComment,
  onAction,
}: {
  actions: readonly DispatchDecisionAction[];
  comment: string;
  lastOutcome: string | null;
  error: string | null;
  loading: boolean;
  setComment: (value: string) => void;
  onAction: (outcome: DispatchDecisionOutcome) => void;
}) {
  return (
    <MutationPanelShell>
      <MutationPanelHeader
        title="Decision de dispatch"
        description="Cette action met a jour le lifecycle persistant du dispatch et resynchronise le ledger le plus recent lie a la recommendation."
        statusLabel={lastOutcome ? `Statut applique: ${lastOutcome}` : null}
      />
      <MutationCommentField
        value={comment}
        placeholder="Ajouter le contexte de progression, d'echec ou de relance."
        onChange={setComment}
      />
      <MutationErrorText message={error} />
      <DecisionActionButtons
        actions={actions}
        loading={loading}
        onAction={onAction}
      />
    </MutationPanelShell>
  );
}

export function DispatchDecisionPanel({
  orgId,
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  onDecisionSaved,
}: {
  orgId: string;
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  onDecisionSaved: () => void;
}) {
  const actions = buildDispatchDecisionActions(data);
  const readOnlyState = buildDecisionReadOnlyState({
    data,
    canManageDispatch,
    contractAllowsWriteback,
    missingWritebackPermissions,
    actionCount: actions.length,
  });
  const { comment, setComment, lastOutcome, mutation, submitDecision } =
    useDecisionPanelState({
      orgId,
      actionId: data.actionId,
      onDecisionSaved,
    });

  if (readOnlyState) {
    return <MutationReadOnlyCard {...readOnlyState} />;
  }

  return (
    <DecisionMutationCard
      actions={actions}
      comment={comment}
      lastOutcome={lastOutcome}
      error={mutation.error}
      loading={mutation.loading}
      setComment={setComment}
      onAction={(outcome) => void submitDecision(outcome)}
    />
  );
}
