"use client";

import type {
  DecisionContractStudioDetailResponse,
  DecisionContractStudioRollbackCandidateResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";
import { Card, CardContent, SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { ReadOnlyStateCard } from "../read-only-detail";
import { ContractStudioPanels } from "./contract-studio-panels";
import type { ContractStudioSelection } from "./contract-studio-shared";

interface ContractStudioDetailColumnProps {
  orgId: string;
  detailLoading: boolean;
  rollbackLoading: boolean;
  detailError: string | null;
  rollbackError: string | null;
  detail: DecisionContractStudioDetailResponse | null;
  rollbackCandidates: DecisionContractStudioRollbackCandidateResponse | null;
  templates: DecisionContractTemplateListResponse | null;
  canMutate: boolean;
  onSelectionChange: (selection: ContractStudioSelection) => void;
  onRetryDetail: () => void;
}

export function ContractStudioDetailColumn(
  props: ContractStudioDetailColumnProps,
) {
  const detailState = getContractStudioDetailState(props);
  if (detailState) {
    return detailState;
  }
  return (
    <ContractStudioDetailCards
      orgId={props.orgId}
      detail={props.detail as DecisionContractStudioDetailResponse}
      rollbackError={props.rollbackError}
      rollbackCandidates={props.rollbackCandidates}
      templates={props.templates}
      canMutate={props.canMutate}
      onSelectionChange={props.onSelectionChange}
    />
  );
}

function getContractStudioDetailState({
  detailLoading,
  rollbackLoading,
  detailError,
  detail,
  onRetryDetail,
}: ContractStudioDetailColumnProps) {
  if (detailLoading || rollbackLoading) {
    return <SkeletonCard />;
  }
  if (detailError) {
    return <ErrorFallback message={detailError} onRetry={onRetryDetail} />;
  }
  if (!detail) {
    return (
      <ReadOnlyStateCard
        title="Selection requise"
        message="Choisir une version de contrat pour ouvrir son detail gouverne."
      />
    );
  }
  return null;
}

function ContractStudioDetailCards({
  orgId,
  detail,
  rollbackError,
  rollbackCandidates,
  templates,
  canMutate,
  onSelectionChange,
}: {
  orgId: string;
  detail: DecisionContractStudioDetailResponse;
  rollbackError: string | null;
  rollbackCandidates: DecisionContractStudioRollbackCandidateResponse | null;
  templates: DecisionContractTemplateListResponse | null;
  canMutate: boolean;
  onSelectionChange: (selection: ContractStudioSelection) => void;
}) {
  return (
    <>
      {rollbackError ? (
        <ContractStudioRollbackWarning error={rollbackError} />
      ) : null}
      <ContractStudioPanels
        orgId={orgId}
        detail={detail}
        rollbackCandidates={rollbackCandidates}
        templates={templates}
        canMutate={canMutate}
        onSelectionChange={onSelectionChange}
      />
      <ContractStudioCurrentCard detail={detail} />
      <ContractStudioAuditCard detail={detail} />
    </>
  );
}

function ContractStudioRollbackWarning({ error }: { error: string }) {
  return (
    <ReadOnlyStateCard
      tone="warning"
      title="Rollback partiel"
      message="Le detail du contrat est charge, mais les candidates de rollback ne sont pas encore disponibles."
      details={[error]}
    />
  );
}

function ContractStudioCurrentCard({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <ContractStudioCurrentHeader detail={detail} />
        <ContractStudioContractMetrics detail={detail} />
        {detail.changeSummary ? (
          <ContractStudioChangeSummary detail={detail} />
        ) : null}
        <ContractStudioPublishChecklist detail={detail} />
      </CardContent>
    </Card>
  );
}

function ContractStudioCurrentHeader({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-secondary">
        Contrat courant
      </h3>
      <p className="text-sm text-ink-tertiary">
        {detail.contract.contractId} v{detail.contract.contractVersion} ·{" "}
        {detail.contract.status}
      </p>
    </div>
  );
}

function ContractStudioContractMetrics({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  const items = [
    [
      "Graph ref",
      `${detail.contract.graphRef.graphId} v${detail.contract.graphRef.graphVersion}`,
    ],
    ["Scope horizon", detail.contract.scope.horizonId],
    ["Validation", detail.validation.status],
    ["Publish readiness", detail.publishReadiness.badge.label],
  ] as const;
  return (
    <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2">
      {items.map(([label, value]) => (
        <p key={label}>
          {label}: <span className="text-ink">{value}</span>
        </p>
      ))}
    </div>
  );
}

function ContractStudioChangeSummary({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-4 text-sm text-ink-tertiary">
      <p className="font-medium text-ink">Resume des changements</p>
      <p>
        Variables: +{detail.changeSummary?.decisionVariables.added} / ~
        {detail.changeSummary?.decisionVariables.changed}
      </p>
      <p>
        Actions: +{detail.changeSummary?.actions.added} / ~
        {detail.changeSummary?.actions.changed}
      </p>
      <p>
        Policy hooks: +{detail.changeSummary?.policyHooks.added} / ~
        {detail.changeSummary?.policyHooks.changed}
      </p>
    </div>
  );
}

function ContractStudioPublishChecklist({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-sunken p-4 text-sm text-ink-tertiary">
      <p className="font-medium text-ink">Checklist de publish</p>
      <ul className="mt-2 space-y-1">
        {detail.publishReadiness.checklist.map((item) => (
          <li key={item.key}>
            {item.complete ? "OK" : "KO"} - {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContractStudioAuditCard({
  detail,
}: {
  detail: DecisionContractStudioDetailResponse;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">Audit recent</h3>
        {detail.history.length === 0 ? (
          <p className="text-sm text-ink-tertiary">
            Aucun evenement audite n'est encore disponible.
          </p>
        ) : (
          detail.history.map((entry) => (
            <div
              key={entry.auditId}
              className="rounded-xl border border-border bg-surface-sunken p-3"
            >
              <p className="text-sm font-semibold text-ink">{entry.action}</p>
              <p className="text-xs text-ink-tertiary">
                {entry.reason} ·{" "}
                {new Date(entry.createdAt).toLocaleString("fr-FR")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
