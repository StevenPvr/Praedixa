"use client";

import { useState } from "react";
import type {
  LedgerDecisionRequest,
  LedgerDecisionResponse,
  LedgerDetailResponse,
} from "@praedixa/shared-types/api";
import { Card, CardContent } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ReadOnlyStateCard } from "../../../read-only-detail";
import {
  buildLedgerActionConfigs,
  LedgerDecisionCard,
  LedgerSnapshotColumn,
} from "./ledger-panel-sections";

interface LedgerDecisionPanelProps {
  orgId: string;
  data: LedgerDetailResponse;
  canManageLedger: boolean;
  onDecisionSaved: () => void;
}

type LedgerDecisionControllerInput = {
  orgId: string;
  data: LedgerDetailResponse;
  onDecisionSaved: () => void;
};

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
  if (canManageLedger === false) {
    return {
      tone: "warning" as const,
      title: "Action restreinte",
      message:
        "La lecture du ledger est autorisee, mais les decisions finance-grade exigent la permission admin:org:write.",
    };
  }
  const hasNoAvailableMutation =
    canClose === false && canRecalculate === false && canValidate === false;
  if (hasNoAvailableMutation) {
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
    ...(comment.trim() ? { comment: comment.trim() } : {}),
    actual,
    roi,
  };
}

function useLedgerDecisionController({
  orgId,
  data,
  onDecisionSaved,
}: Readonly<LedgerDecisionControllerInput>) {
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

export function LedgerDecisionPanel(props: Readonly<LedgerDecisionPanelProps>) {
  const { orgId, data, canManageLedger, onDecisionSaved } = props;
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

  const actions = buildLedgerActionConfigs({
    canClose,
    canRecalculate,
    canValidate,
    onCloseLike: async (operation) => {
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
      await controller.submitDecision(request);
    },
    onValidate: async (validationStatus) =>
      await controller.submitDecision({
        operation: "validate",
        reasonCode: "finance_validation_update",
        ...(controller.comment.trim()
          ? { comment: controller.comment.trim() }
          : {}),
        validationStatus,
      }),
  });

  return (
    <LedgerDecisionCard
      lastOutcome={controller.lastOutcome}
      comment={controller.comment}
      error={controller.localError ?? controller.mutation.error}
      loading={controller.mutation.loading}
      setComment={controller.setComment}
      actions={actions}
    />
  );
}

export function LedgerSnapshotsCard({
  data,
}: Readonly<{ data: LedgerDetailResponse }>) {
  const actualRecordedAt = data.actual?.recordedAt;
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
            formatDateTime={formatDateTime}
            renderMetricSnapshot={renderMetricSnapshot}
          />
          <LedgerSnapshotColumn
            title="Recommended"
            recordedAt={data.recommended.recordedAt}
            summary={data.recommended.actionSummary}
            values={data.recommended.values}
            emptyMessage="Aucune metrique recommandee disponible."
            formatDateTime={formatDateTime}
            renderMetricSnapshot={renderMetricSnapshot}
          />
          <LedgerSnapshotColumn
            title="Actual"
            {...(actualRecordedAt ? { recordedAt: actualRecordedAt } : {})}
            values={data.actual?.values ?? null}
            emptyMessage="Aucune metrique reelle disponible."
            formatDateTime={formatDateTime}
            renderMetricSnapshot={renderMetricSnapshot}
          />
        </div>
      </CardContent>
    </Card>
  );
}
