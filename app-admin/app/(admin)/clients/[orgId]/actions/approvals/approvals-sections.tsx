"use client";

import type {
  ApprovalInboxItem,
  ApprovalInboxResponse,
} from "@praedixa/shared-types/api";
import { Card, CardContent, SkeletonCard, StatCard } from "@praedixa/ui";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import {
  ReadOnlyDetailHeader,
  ReadOnlyStateCard,
} from "../../read-only-detail";
import { ApprovalDecisionPanel } from "./approval-decision-panel";
import {
  APPROVALS_PAGE_DESCRIPTION,
  APPROVALS_PAGE_TITLE,
  formatAmount,
  formatDateTime,
  type ApprovalsViewModel,
} from "./page-model";

type ApprovalsPageHeaderProps = {
  backHref: string;
};

type ApprovalsLoadingStateProps = {
  backHref: string;
};

type ApprovalsErrorStateProps = {
  backHref: string;
  message: string;
  onRetry: () => void;
};

type ApprovalsEmptyStateProps = {
  backHref: string;
};

type ApprovalsPageContentProps = {
  orgId: string;
  data: ApprovalInboxResponse;
  viewModel: ApprovalsViewModel;
  canManageApprovals: boolean;
  onDecisionSaved: () => void;
  backHref: string;
};

type ApprovalInboxItemCardProps = {
  orgId: string;
  item: ApprovalInboxItem;
  canManageApprovals: boolean;
  onDecisionSaved: () => void;
};

function ApprovalInboxItemCard(props: Readonly<ApprovalInboxItemCardProps>) {
  const { orgId, item, canManageApprovals, onDecisionSaved } = props;
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-base font-semibold text-ink">
              {item.contractId} v{item.contractVersion}
            </p>
            <p className="text-sm text-ink-tertiary">
              {item.approverRole} · {item.scope.label}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-surface-sunken px-3 py-1 text-ink-secondary">
              {item.priorityBadge.label}
            </span>
            <span className="rounded-full bg-surface-sunken px-3 py-1 text-ink-secondary">
              {item.statusBadge.label}
            </span>
            {item.requiresJustification ? (
              <span className="rounded-full bg-warning-50 px-3 py-1 text-warning-700">
                Justification requise
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 text-sm text-ink-tertiary md:grid-cols-2 xl:grid-cols-4">
          <p>
            Echeance:{" "}
            <span className="text-ink">{formatDateTime(item.deadlineAt)}</span>
          </p>
          <p>
            Age: <span className="text-ink">{item.ageHours} h</span>
          </p>
          <p>
            Risque: <span className="text-ink">{item.riskBadge.label}</span>
          </p>
          <p>
            Cout estime:{" "}
            <span className="text-ink">
              {formatAmount(item.costBadge.amountEur)}
            </span>
          </p>
        </div>

        <div className="grid gap-2 text-sm text-ink-tertiary md:grid-cols-2">
          <p>
            Demande par:{" "}
            <span className="text-ink">{item.requestedBy.label}</span>
          </p>
          <p>
            Actions ciblees:{" "}
            <span className="text-ink">
              {item.policy.actionTypes.join(", ") || "Aucune"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-ink-tertiary">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2.5 py-1"
            >
              {tag}
            </span>
          ))}
        </div>

        <ApprovalDecisionPanel
          orgId={orgId}
          item={item}
          canManageApprovals={canManageApprovals}
          onDecisionSaved={onDecisionSaved}
        />
      </CardContent>
    </Card>
  );
}

export function ApprovalsPageHeader(props: Readonly<ApprovalsPageHeaderProps>) {
  const { backHref } = props;
  return (
    <ReadOnlyDetailHeader
      backHref={backHref}
      backLabel="Retour aux actions"
      title={APPROVALS_PAGE_TITLE}
      description={APPROVALS_PAGE_DESCRIPTION}
    />
  );
}

export function ApprovalsLoadingState(
  props: Readonly<ApprovalsLoadingStateProps>,
) {
  const { backHref } = props;
  return (
    <div className="space-y-4">
      <ApprovalsPageHeader backHref={backHref} />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function ApprovalsErrorState(props: Readonly<ApprovalsErrorStateProps>) {
  const { backHref, message, onRetry } = props;
  return (
    <div className="space-y-6">
      <ApprovalsPageHeader backHref={backHref} />
      <ErrorFallback message={message} onRetry={onRetry} />
    </div>
  );
}

export function ApprovalsEmptyState(props: Readonly<ApprovalsEmptyStateProps>) {
  const { backHref } = props;
  return (
    <div className="space-y-6">
      <ApprovalsPageHeader backHref={backHref} />
      <ErrorFallback
        variant="empty"
        message="Aucune approbation en attente ne remonte encore sur ce perimetre."
      />
    </div>
  );
}

export function ApprovalsPageContent(
  props: Readonly<ApprovalsPageContentProps>,
) {
  const {
    orgId,
    data,
    viewModel,
    canManageApprovals,
    onDecisionSaved,
    backHref,
  } = props;
  return (
    <div className="space-y-6">
      <ApprovalsPageHeader backHref={backHref} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Demandes visibles"
          value={String(data.summary.total)}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <StatCard
          label="Non lues"
          value={String(data.summary.unread)}
          icon={<Clock3 className="h-4 w-4" />}
        />
        <StatCard
          label="Urgentes"
          value={String(data.summary.urgent)}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={data.summary.urgent > 0 ? "warning" : undefined}
        />
        <StatCard
          label="En retard"
          value={String(data.summary.overdue)}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={data.summary.overdue > 0 ? "danger" : undefined}
        />
      </div>

      {viewModel.degradedReasons.length > 0 ? (
        <ReadOnlyStateCard
          tone="warning"
          title="Lecture partielle"
          message="La file est exploitable, mais certains regroupements read-only restent indisponibles."
          details={viewModel.degradedReasons}
        />
      ) : null}

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="space-y-3 p-5">
          <h3 className="text-sm font-medium text-ink-secondary">
            Repartition de la file
          </h3>
          {viewModel.hasGroups ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {data.groups.map((group) => (
                <div
                  key={`${group.groupBy}:${group.groupKey}`}
                  className="rounded-xl border border-border bg-surface-sunken p-3"
                >
                  <p className="text-sm font-semibold text-ink">
                    {group.groupLabel}
                  </p>
                  <p className="mt-1 text-xs text-ink-tertiary">
                    {group.total} demandes · {group.urgent} urgentes ·{" "}
                    {group.unread} non lues
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <ReadOnlyStateCard
              title="Aucun regroupement disponible"
              message="Le detail des groupes d'approbation n'a pas encore ete publie pour cette organisation."
            />
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.items.map((item) => (
          <ApprovalInboxItemCard
            key={item.approvalId}
            orgId={orgId}
            item={item}
            canManageApprovals={canManageApprovals}
            onDecisionSaved={onDecisionSaved}
          />
        ))}
      </div>
    </div>
  );
}
