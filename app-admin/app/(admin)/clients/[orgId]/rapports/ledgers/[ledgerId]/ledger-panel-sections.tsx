"use client";

import type { LedgerDecisionRequest } from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { ReadOnlyStateCard } from "../../../read-only-detail";

type LedgerValidationStatus = Extract<
  LedgerDecisionRequest,
  { operation: "validate" }
>["validationStatus"];

interface LedgerSnapshotColumnProps {
  title: string;
  recordedAt?: string;
  summary?: string;
  values: Record<string, string | number | boolean | null> | null;
  emptyMessage: string;
  formatDateTime: (value?: string) => string;
  renderMetricSnapshot: (
    values: Record<string, string | number | boolean | null>,
    emptyMessage: string,
  ) => React.ReactNode;
}

type LedgerActionConfig = {
  key: string;
  label: string;
  variant?: "outline" | "destructive";
  onClick: () => Promise<void>;
};

interface LedgerDecisionActionsProps {
  actions: LedgerActionConfig[];
  loading: boolean;
}

interface LedgerDecisionCardProps {
  lastOutcome: string | null;
  comment: string;
  error: string | null;
  loading: boolean;
  setComment: (value: string) => void;
  actions: LedgerActionConfig[];
}

export function buildLedgerActionConfigs({
  canClose,
  canRecalculate,
  canValidate,
  onCloseLike,
  onValidate,
}: Readonly<{
  canClose: boolean;
  canRecalculate: boolean;
  canValidate: boolean;
  onCloseLike: (operation: "close" | "recalculate") => Promise<void>;
  onValidate: (status: LedgerValidationStatus) => Promise<void>;
}>): LedgerActionConfig[] {
  const closeActions = canClose
    ? [
        {
          key: "close",
          label: "Clore la revision",
          onClick: () => onCloseLike("close"),
        } satisfies LedgerActionConfig,
      ]
    : [];
  const recalculateActions = canRecalculate
    ? [
        {
          key: "recalculate",
          label: "Recalculer",
          variant: "outline",
          onClick: () => onCloseLike("recalculate"),
        } satisfies LedgerActionConfig,
      ]
    : [];
  const validationActions = canValidate
    ? [
        {
          key: "validated",
          label: "Valider finance",
          onClick: () => onValidate("validated"),
        } satisfies LedgerActionConfig,
        {
          key: "estimated",
          label: "Marquer estime",
          variant: "outline",
          onClick: () => onValidate("estimated"),
        } satisfies LedgerActionConfig,
        {
          key: "contested",
          label: "Contester",
          variant: "destructive",
          onClick: () => onValidate("contested"),
        } satisfies LedgerActionConfig,
      ]
    : [];

  return [...closeActions, ...recalculateActions, ...validationActions];
}

function LedgerDecisionActions({
  actions,
  loading,
}: Readonly<LedgerDecisionActionsProps>) {
  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => {
        function handleClick() {
          action.onClick().catch(() => undefined);
        }

        return (
          <Button
            key={action.key}
            size="sm"
            variant={action.variant}
            loading={loading}
            onClick={handleClick}
          >
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}

function LedgerDecisionHeader({
  lastOutcome,
}: Readonly<{ lastOutcome: string | null }>) {
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
}: Readonly<{
  comment: string;
  setComment: (value: string) => void;
}>) {
  const commentFieldId = "ledger-decision-comment";
  return (
    <label htmlFor={commentFieldId} className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
        Commentaire optionnel
      </span>
      <textarea
        id={commentFieldId}
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Ajouter le contexte de validation, de cloture ou de recalcul."
        className="min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20"
      />
    </label>
  );
}

export function LedgerDecisionCard({
  lastOutcome,
  comment,
  error,
  loading,
  setComment,
  actions,
}: Readonly<LedgerDecisionCardProps>) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <LedgerDecisionHeader lastOutcome={lastOutcome} />
        <LedgerDecisionCommentField comment={comment} setComment={setComment} />
        {error ? <p className="text-sm text-danger-text">{error}</p> : null}
        <LedgerDecisionActions actions={actions} loading={loading} />
      </CardContent>
    </Card>
  );
}

export function LedgerSnapshotColumn({
  title,
  recordedAt,
  summary,
  values,
  emptyMessage,
  formatDateTime,
  renderMetricSnapshot,
}: Readonly<LedgerSnapshotColumnProps>) {
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
