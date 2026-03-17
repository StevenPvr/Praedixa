"use client";

import { useState } from "react";
import type {
  ActionDispatchDetailResponse,
  ActionDispatchFallbackRequest,
  ActionDispatchFallbackResponse,
} from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import {
  MutationCommentField,
  MutationErrorText,
  MutationPanelHeader,
  MutationPanelShell,
  MutationReadOnlyCard,
  type MutationReadOnlyState,
} from "./dispatch-control-ui";

type DispatchFallbackOperation = ActionDispatchFallbackRequest["operation"];

interface DispatchFallbackAction {
  operation: DispatchFallbackOperation;
  label: string;
}

function canPrepareFallback(data: ActionDispatchDetailResponse): boolean {
  if (!data.fallback.supported || data.fallback.nextStep !== "prepare") {
    return false;
  }
  if (data.status === "retried") {
    return true;
  }
  if (data.destination.capabilities.requiresHumanFallbackOnFailure) {
    return true;
  }
  return !data.retryPolicy.eligibility.eligible;
}

function buildDispatchFallbackActions(
  data: ActionDispatchDetailResponse,
): DispatchFallbackAction[] {
  if (!data.fallback.supported) {
    return [];
  }
  if (canPrepareFallback(data)) {
    return [{ operation: "prepare", label: "Preparer fallback humain" }];
  }
  if (data.fallback.nextStep === "execute") {
    return [{ operation: "execute", label: "Marquer fallback execute" }];
  }
  return [];
}

function buildFallbackReasonCode(operation: DispatchFallbackOperation): string {
  return operation === "prepare"
    ? "human_fallback_prepared"
    : "human_fallback_executed";
}

function buildFallbackAccessState({
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
}: {
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
}): MutationReadOnlyState | null {
  if (!data.fallback.supported) {
    return {
      title: "Fallback non supporte",
      message: "Cette destination n'expose pas de fallback humain explicite.",
    };
  }
  if (!canManageDispatch) {
    return {
      tone: "warning",
      title: "Fallback restreint",
      message:
        "La lecture du fallback est autorisee, mais sa mutation exige la permission admin:org:write.",
    };
  }
  if (!contractAllowsWriteback) {
    return {
      tone: "warning",
      title: "Fallback bloque par contrat",
      message:
        "Le contrat actif n'autorise pas de write-back manuel pour cette destination.",
    };
  }
  if (missingWritebackPermissions.length > 0) {
    return {
      tone: "warning",
      title: "Permissions de write-back manquantes",
      message: `Le fallback humain exige aussi: ${missingWritebackPermissions.join(", ")}.`,
    };
  }
  return null;
}

function buildFallbackNoActionState(
  data: ActionDispatchDetailResponse,
): MutationReadOnlyState {
  if (
    data.fallback.nextStep === "prepare" &&
    data.retryPolicy.eligibility.eligible &&
    !data.destination.capabilities.requiresHumanFallbackOnFailure
  ) {
    return {
      title: "Retry prioritaire",
      message:
        "Le fallback humain reste bloque tant qu'un retry valide est encore disponible.",
    };
  }
  return {
    title: "Aucune action de fallback",
    message:
      "Le fallback humain est deja dans son etat final ou n'a pas besoin d'intervention supplementaire.",
  };
}

function buildFallbackPayload(
  operation: DispatchFallbackOperation,
  comment: string,
  data: ActionDispatchDetailResponse,
): ActionDispatchFallbackRequest {
  const trimmedComment = comment.trim();
  const commentValue = trimmedComment.length > 0 ? trimmedComment : undefined;

  if (operation === "prepare") {
    return {
      operation: "prepare",
      reasonCode: buildFallbackReasonCode(operation),
      comment: commentValue,
      channel: data.fallback.channel ?? "task_copy",
    };
  }

  return {
    operation: "execute",
    reasonCode: buildFallbackReasonCode(operation),
    comment: commentValue,
  };
}

function useFallbackPanelState({
  orgId,
  actionId,
  data,
  onFallbackSaved,
}: {
  orgId: string;
  actionId: string;
  data: ActionDispatchDetailResponse;
  onFallbackSaved: () => void;
}) {
  const [comment, setComment] = useState("");
  const [lastFallbackStatus, setLastFallbackStatus] = useState<string | null>(
    null,
  );
  const mutation = useApiPost<
    ActionDispatchFallbackRequest,
    ActionDispatchFallbackResponse
  >(ADMIN_ENDPOINTS.orgActionDispatchFallback(orgId, actionId));

  async function submitFallback(operation: DispatchFallbackOperation) {
    const response = await mutation.mutate(
      buildFallbackPayload(operation, comment, data),
    );
    if (!response) {
      return;
    }
    setComment("");
    setLastFallbackStatus(response.fallbackStatus);
    onFallbackSaved();
  }

  return {
    comment,
    setComment,
    lastFallbackStatus,
    mutation,
    submitFallback,
  };
}

function FallbackActionButtons({
  actions,
  loading,
  onAction,
}: {
  actions: readonly DispatchFallbackAction[];
  loading: boolean;
  onAction: (operation: DispatchFallbackOperation) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.operation}
          size="sm"
          variant={action.operation === "execute" ? "outline" : undefined}
          loading={loading}
          onClick={() => onAction(action.operation)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function FallbackMutationCard({
  actions,
  comment,
  lastFallbackStatus,
  error,
  loading,
  setComment,
  onAction,
}: {
  actions: readonly DispatchFallbackAction[];
  comment: string;
  lastFallbackStatus: string | null;
  error: string | null;
  loading: boolean;
  setComment: (value: string) => void;
  onAction: (operation: DispatchFallbackOperation) => void;
}) {
  return (
    <MutationPanelShell>
      <MutationPanelHeader
        title="Fallback humain"
        description="Cette action explicite la preparation puis l'execution manuelle du write-back quand la destination live ne peut pas aller au bout."
        statusLabel={
          lastFallbackStatus ? `Fallback applique: ${lastFallbackStatus}` : null
        }
      />
      <MutationCommentField
        value={comment}
        placeholder="Ajouter le contexte operateur, le canal ou la preuve d'execution manuelle."
        onChange={setComment}
      />
      <MutationErrorText message={error} />
      <FallbackActionButtons
        actions={actions}
        loading={loading}
        onAction={onAction}
      />
    </MutationPanelShell>
  );
}

export function DispatchFallbackPanel({
  orgId,
  data,
  canManageDispatch,
  contractAllowsWriteback,
  missingWritebackPermissions,
  onFallbackSaved,
}: {
  orgId: string;
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  onFallbackSaved: () => void;
}) {
  const actions = buildDispatchFallbackActions(data);
  const accessState = buildFallbackAccessState({
    data,
    canManageDispatch,
    contractAllowsWriteback,
    missingWritebackPermissions,
  });
  const { comment, setComment, lastFallbackStatus, mutation, submitFallback } =
    useFallbackPanelState({
      orgId,
      actionId: data.actionId,
      data,
      onFallbackSaved,
    });

  if (accessState) {
    return <MutationReadOnlyCard {...accessState} />;
  }
  if (actions.length === 0) {
    return <MutationReadOnlyCard {...buildFallbackNoActionState(data)} />;
  }

  return (
    <FallbackMutationCard
      actions={actions}
      comment={comment}
      lastFallbackStatus={lastFallbackStatus}
      error={mutation.error}
      loading={mutation.loading}
      setComment={setComment}
      onAction={(operation) => void submitFallback(operation)}
    />
  );
}
