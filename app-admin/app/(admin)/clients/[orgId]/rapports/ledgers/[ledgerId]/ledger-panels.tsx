"use client";

import { useState } from "react";
import type {
  LedgerDecisionRequest,
  LedgerDecisionResponse,
  LedgerDetailResponse,
} from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ReadOnlyStateCard } from "../../../read-only-detail";

type LedgerValidationStatus = Extract<
  LedgerDecisionRequest,
  { operation: "validate" }
>["validationStatus"];

interface LedgerDecisionActionsProps {
  canClose: boolean;
  canRecalculate: boolean;
  canValidate: boolean;
  loading: boolean;
  onCloseLike: (operation: "close" | "recalculate") => void;
  onValidate: (status: LedgerValidationStatus) => void;
}

interface LedgerDecisionPanelProps {
  orgId: string;
  data: LedgerDetailResponse;
  canManageLedger: boolean;
  onDecisionSaved: () => void;
}

function formatDateTime(value?: string): string {
  if (!value) {
    return "N/A";
  }

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function renderMetricSnapshot(
  values: Record<string, string | number | boolean | null>,
  emptyMessage: string,
) {
  const entries = Object.entries(values);
  if (entries.length === 0) {
    return <p className="text-xs text-ink-tertiary">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 text-xs text-ink-tertiary"
        >
          <span>{key}</span>
          <span className="text-ink">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function buildLedgerRoiInput(data: LedgerDetailResponse) {
  return {
    currency: data.roi.currency,
    validationStatus: data.roi.validationStatus,
    components: data.roiComponents.map((component) => ({
      key: component.key,
      label: component.label,
      kind: component.kind,
      value: component.value,
      validationStatus: component.validationStatus,
    })),
  } satisfies Extract<
    LedgerDecisionRequest,
    { operation: "close" | "recalculate" }
  >["roi"];
}

function buildLedgerActualInput(data: LedgerDetailResponse) {
  if (!data.actual) {
    return null;
  }

  return {
    recordedAt: data.actual.recordedAt,
    values: data.actual.values,
  } satisfies Extract<
    LedgerDecisionRequest,
    { operation: "close" | "recalculate" }
  >["actual"];
}

function getLedgerReadOnlyState(
  canManageLedger: boolean,
  canClose: boolean,
  canRecalculate: boolean,
  canValidate: boolean,
) {
  if (!canManageLedger) {
    return {
      tone: "warning" as const,
      title: "Action restreinte",
      message:
        "La lecture du ledger est autorisee, mais les decisions finance-grade exigent la permission admin:org:write.",
    };
  }
  if (!canClose && !canRecalculate && !canValidate) {
    return {
      title: "Aucune mutation disponible",
      message:
        "Ce ledger est dans un etat terminal qui ne propose pas de nouvelle decision depuis cette vue.",
    };
  }
  return null;
}

function buildCloseLikeRequest(
  operation: "close" | "recalculate",
  comment: string,
  actual: ReturnType<typeof buildLedgerActualInput>,
  roi: ReturnType<typeof buildLedgerRoiInput>,
): LedgerDecisionRequest | string {
  if (!actual) {
    return "Une mesure actuelle est requise avant de fermer ou recalculer ce ledger.";
  }
  if (roi.components.length === 0) {
    return "Au moins un composant ROI est requis avant de fermer ou recalculer ce ledger.";
  }
  return {
    operation,
    reasonCode:
      operation === "close" ? "period_close_from_admin" : "late_actuals",
    comment: comment.trim() || undefined,
    actual,
    roi,
  };
}

function buildLedgerActionConfigs({
  canClose,
  canRecalculate,
  canValidate,
  onCloseLike,
  onValidate,
}: Omit<LedgerDecisionActionsProps, "loading">) {
  return [
    canClose
      ? {
          key: "close",
          label: "Clore la revision",
          onClick: () => onCloseLike("close"),
        }
      : null,
    canRecalculate
      ? {
          key: "recalculate",
          label: "Recalculer",
          variant: "outline" as const,
          onClick: () => onCloseLike("recalculate"),
        }
      : null,
    canValidate
      ? {
          key: "validated",
          label: "Valider finance",
          onClick: () => onValidate("validated"),
        }
      : null,
    canValidate
      ? {
          key: "estimated",
          label: "Marquer estime",
          variant: "outline" as const,
          onClick: () => onValidate("estimated"),
        }
      : null,
    canValidate
      ? {
          key: "contested",
          label: "Contester",
          variant: "destructive" as const,
          onClick: () => onValidate("contested"),
        }
      : null,
  ].filter((value) => value !== null);
}

function LedgerDecisionActions({
  canClose,
  canRecalculate,
  canValidate,
  loading,
  onCloseLike,
  onValidate,
}: LedgerDecisionActionsProps) {
  const actions = buildLedgerActionConfigs({
    canClose,
    canRecalculate,
    canValidate,
    onCloseLike,
    onValidate,
  });

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.key}
          size="sm"
          variant={action.variant}
          loading={loading}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function LedgerDecisionHeader({ lastOutcome }: { lastOutcome: string | null }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-sm font-medium text-ink-secondary">
          Decision finance et revision
        </h3>
        <p className="text-xs text-ink-tertiary">
          Cette action met a jour le ledger persistant, y compris la validation
          finance et les revisions de recalcul quand elles sont permises.
        </p>
      </div>
      {lastOutcome ? (
        <span className="rounded-full bg-success-50 px-3 py-1 text-xs text-success-700">
          Operation appliquee: {lastOutcome}
        </span>
      ) : null}
    </div>
  );
}

function LedgerDecisionCommentField({
  comment,
  setComment,
}: {
  comment: string;
  setComment: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        Commentaire optionnel
      </span>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Ajouter le contexte de validation, de cloture ou de recalcul."
        className="min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20"
      />
    </label>
  );
}

function LedgerDecisionCard({
  lastOutcome,
  comment,
  error,
  loading,
  setComment,
  canClose,
  canRecalculate,
  canValidate,
  onCloseLike,
  onValidate,
}: {
  lastOutcome: string | null;
  comment: string;
  error: string | null;
  loading: boolean;
  setComment: (value: string) => void;
  canClose: boolean;
  canRecalculate: boolean;
  canValidate: boolean;
  onCloseLike: (operation: "close" | "recalculate") => void;
  onValidate: (status: LedgerValidationStatus) => void;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <LedgerDecisionHeader lastOutcome={lastOutcome} />
        <LedgerDecisionCommentField comment={comment} setComment={setComment} />
        {error ? <p className="text-sm text-danger-text">{error}</p> : null}
        <LedgerDecisionActions
          canClose={canClose}
          canRecalculate={canRecalculate}
          canValidate={canValidate}
          loading={loading}
          onCloseLike={onCloseLike}
          onValidate={onValidate}
        />
      </CardContent>
    </Card>
  );
}

function useLedgerDecisionController({
  orgId,
  data,
  onDecisionSaved,
}: {
  orgId: string;
  data: LedgerDetailResponse;
  onDecisionSaved: () => void;
}) {
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const mutation = useApiPost<LedgerDecisionRequest, LedgerDecisionResponse>(
    ADMIN_ENDPOINTS.orgLedgerDecision(orgId, data.ledgerId),
  );
  const actualInput = buildLedgerActualInput(data);
  const roiInput = buildLedgerRoiInput(data);

  async function submitDecision(request: LedgerDecisionRequest) {
    setLocalError(null);
    const response = await mutation.mutate(request);
    if (!response) return;
    setComment("");
    setLastOutcome(`${response.operation} -> ${response.status}`);
    onDecisionSaved();
  }

  return {
    comment,
    setComment,
    localError,
    setLocalError,
    lastOutcome,
    mutation,
    actualInput,
    roiInput,
    submitDecision,
  };
}

function getLedgerMutationFlags(data: LedgerDetailResponse) {
  return {
    canClose: data.status === "open" || data.status === "measuring",
    canRecalculate: data.status === "closed",
    canValidate: data.status === "closed" || data.status === "recalculated",
  };
}

function LedgerSnapshotColumn({
  title,
  recordedAt,
  summary,
  values,
  emptyMessage,
}: {
  title: string;
  recordedAt?: string;
  summary?: string;
  values: Record<string, string | number | boolean | null> | null;
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-ink-tertiary">
        {formatDateTime(recordedAt)}
      </p>
      {summary ? (
        <p className="mt-1 text-xs text-ink-tertiary">{summary}</p>
      ) : null}
      <div className="mt-3">
        {values ? (
          renderMetricSnapshot(values, emptyMessage)
        ) : (
          <ReadOnlyStateCard
            title="Aucune mesure reelle"
            message="Le snapshot actual n'est pas encore renseigne pour cette revision."
          />
        )}
      </div>
    </div>
  );
}

export function LedgerDecisionPanel({
  orgId,
  data,
  canManageLedger,
  onDecisionSaved,
}: LedgerDecisionPanelProps) {
  const { canClose, canRecalculate, canValidate } =
    getLedgerMutationFlags(data);
  const readOnlyState = getLedgerReadOnlyState(
    canManageLedger,
    canClose,
    canRecalculate,
    canValidate,
  );
  const controller = useLedgerDecisionController({
    orgId,
    data,
    onDecisionSaved,
  });
  if (readOnlyState) return <ReadOnlyStateCard {...readOnlyState} />;

  return (
    <LedgerDecisionCard
      lastOutcome={controller.lastOutcome}
      comment={controller.comment}
      error={controller.localError ?? controller.mutation.error}
      loading={controller.mutation.loading}
      setComment={controller.setComment}
      canClose={canClose}
      canRecalculate={canRecalculate}
      canValidate={canValidate}
      onCloseLike={(operation) => {
        const request = buildCloseLikeRequest(
          operation,
          controller.comment,
          controller.actualInput,
          controller.roiInput,
        );
        if (typeof request === "string") {
          controller.setLocalError(request);
          return;
        }
        void controller.submitDecision(request);
      }}
      onValidate={(validationStatus) =>
        void controller.submitDecision({
          operation: "validate",
          reasonCode: "finance_validation_update",
          comment: controller.comment.trim() || undefined,
          validationStatus,
        })
      }
    />
  );
}

export function LedgerSnapshotsCard({ data }: { data: LedgerDetailResponse }) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Baseline / recommended / actual
        </h3>
        <div className="grid gap-4 xl:grid-cols-3">
          <LedgerSnapshotColumn
            title="Baseline"
            recordedAt={data.baseline.recordedAt}
            values={data.baseline.values}
            emptyMessage="Aucune metrique baseline disponible."
          />
          <LedgerSnapshotColumn
            title="Recommended"
            recordedAt={data.recommended.recordedAt}
            summary={data.recommended.actionSummary}
            values={data.recommended.values}
            emptyMessage="Aucune metrique recommandee disponible."
          />
          <LedgerSnapshotColumn
            title="Actual"
            recordedAt={data.actual?.recordedAt}
            values={data.actual?.values ?? null}
            emptyMessage="Aucune metrique reelle disponible."
          />
        </div>
      </CardContent>
    </Card>
  );
}
