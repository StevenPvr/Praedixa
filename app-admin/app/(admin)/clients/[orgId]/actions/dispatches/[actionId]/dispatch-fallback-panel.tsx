"use client";

import type { ActionDispatchDetailResponse } from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import {
  MutationCommentField,
  MutationErrorText,
  MutationPanelHeader,
  MutationPanelShell,
  MutationReadOnlyCard,
} from "./dispatch-control-ui";
import {
  buildDispatchFallbackActions,
  buildFallbackAccessState,
  buildFallbackNoActionState,
  type DispatchFallbackAction,
  type DispatchFallbackOperation,
  useFallbackPanelState,
} from "./dispatch-fallback-model";

type FallbackActionButtonsProps = Readonly<{
  actions: readonly DispatchFallbackAction[];
  loading: boolean;
  onAction: (operation: DispatchFallbackOperation) => Promise<void>;
}>;

type FallbackMutationCardProps = Readonly<{
  actions: readonly DispatchFallbackAction[];
  comment: string;
  lastFallbackStatus: string | null;
  error: string | null;
  loading: boolean;
  setComment: (value: string) => void;
  onAction: (operation: DispatchFallbackOperation) => Promise<void>;
}>;

type DispatchFallbackPanelProps = Readonly<{
  orgId: string;
  data: ActionDispatchDetailResponse;
  canManageDispatch: boolean;
  contractAllowsWriteback: boolean;
  missingWritebackPermissions: readonly string[];
  onFallbackSaved: () => void;
}>;

function FallbackActionButtons({
  actions,
  loading,
  onAction,
}: FallbackActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.operation}
          size="sm"
          variant={action.operation === "execute" ? "outline" : undefined}
          loading={loading}
          onClick={async () => {
            await onAction(action.operation);
          }}
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
}: FallbackMutationCardProps) {
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
}: DispatchFallbackPanelProps) {
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
      onAction={async (operation) => {
        await submitFallback(operation);
      }}
    />
  );
}
