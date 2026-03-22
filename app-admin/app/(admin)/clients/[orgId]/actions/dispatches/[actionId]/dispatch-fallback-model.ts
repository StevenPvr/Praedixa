"use client";

import { useState } from "react";
import type {
  ActionDispatchDetailResponse,
  ActionDispatchFallbackRequest,
  ActionDispatchFallbackResponse,
} from "@praedixa/shared-types/api";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import type { MutationReadOnlyState } from "./dispatch-control-ui";

export type DispatchFallbackOperation =
  ActionDispatchFallbackRequest["operation"];

export interface DispatchFallbackAction {
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

export function buildDispatchFallbackActions(
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

export function buildFallbackAccessState({
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

export function buildFallbackNoActionState(
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
      ...(commentValue ? { comment: commentValue } : {}),
      channel: data.fallback.channel ?? "task_copy",
    };
  }

  return {
    operation: "execute",
    reasonCode: buildFallbackReasonCode(operation),
    ...(commentValue ? { comment: commentValue } : {}),
  };
}

export function useFallbackPanelState({
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
