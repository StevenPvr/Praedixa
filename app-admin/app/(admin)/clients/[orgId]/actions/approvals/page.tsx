"use client";

import { useState } from "react";

import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalInboxItem,
  ApprovalInboxResponse,
} from "@praedixa/shared-types/api";
import {
  Button,
  Card,
  CardContent,
  SkeletonCard,
  StatCard,
} from "@praedixa/ui";
import { AlertTriangle, Clock3, ShieldCheck } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useClientContext } from "../../client-context";
import {
  ReadOnlyDetailHeader,
  ReadOnlyStateCard,
} from "../../read-only-detail";

function formatDateTime(value?: string): string {
  if (!value) {
    return "Aucune echeance";
  }

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatAmount(amount: number | null): string {
  if (amount == null) {
    return "N/A";
  }

  return `${Math.round(amount)} EUR`;
}

function buildApprovalsViewModel(data: ApprovalInboxResponse) {
  const hasItems = data.items.length > 0;
  const hasGroups = data.groups.length > 0;
  const degradedReasons = hasGroups
    ? []
    : [
        "La repartition par groupe n'est pas encore disponible pour cette file.",
      ];

  return {
    hasItems,
    hasGroups,
    degradedReasons,
  };
}

function ApprovalDecisionPanel({
  orgId,
  item,
  canManageApprovals,
  onDecisionSaved,
}: {
  orgId: string;
  item: ApprovalInboxItem;
  canManageApprovals: boolean;
  onDecisionSaved: () => void;
}) {
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const mutation = useApiPost<
    ApprovalDecisionRequest,
    ApprovalDecisionResponse
  >(ADMIN_ENDPOINTS.orgApprovalDecision(orgId, item.approvalId));

  async function submitDecision(outcome: "granted" | "rejected") {
    const trimmedComment = comment.trim();
    if (item.requiresJustification && trimmedComment.length === 0) {
      setLocalError("Une justification est requise pour cette decision.");
      return;
    }

    setLocalError(null);
    const response = await mutation.mutate({
      outcome,
      reasonCode:
        outcome === "granted" ? "approved_by_admin" : "rejected_by_admin",
      comment: trimmedComment.length > 0 ? trimmedComment : undefined,
    });

    if (!response) {
      return;
    }

    setComment("");
    setLastOutcome(outcome);
    onDecisionSaved();
  }

  if (item.status !== "requested") {
    return null;
  }

  if (!canManageApprovals) {
    return (
      <ReadOnlyStateCard
        tone="warning"
        title="Action restreinte"
        message="La lecture de l'inbox est autorisee, mais la decision d'approbation exige la permission admin:org:write."
      />
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-sunken p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Decision d'approbation</p>
          <p className="text-xs text-ink-tertiary">
            Cette action met a jour l'inbox, les approbations soeurs encore
            ouvertes et l'etat interne action/ledger. Aucun dispatch externe
            n'est simule ici.
          </p>
        </div>
        {lastOutcome ? (
          <span className="rounded-full bg-success-50 px-3 py-1 text-xs text-success-700">
            {lastOutcome === "granted" ? "Approuvee" : "Rejetee"}
          </span>
        ) : null}
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-tertiary">
          {item.requiresJustification
            ? "Justification requise"
            : "Commentaire optionnel"}
        </span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Ajouter le contexte de validation ou de rejet."
          className="min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink shadow-sm outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[color:var(--brand)]/20"
        />
      </label>

      {localError || mutation.error ? (
        <p className="text-sm text-danger-text">
          {localError ?? mutation.error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          loading={mutation.loading}
          onClick={() => void submitDecision("granted")}
        >
          Approuver
        </Button>
        <Button
          size="sm"
          variant="destructive"
          loading={mutation.loading}
          onClick={() => void submitDecision("rejected")}
        >
          Rejeter
        </Button>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const canManageApprovals = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const { data, loading, error, refetch } = useApiGet<ApprovalInboxResponse>(
    ADMIN_ENDPOINTS.orgApprovalsInbox(orgId),
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <ReadOnlyDetailHeader
          backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
          backLabel="Retour aux actions"
          title="Inbox d'approbation"
          description="File read-only des validations, priorites et justifications requises."
        />
        <ErrorFallback
          message={error ?? "Impossible de charger l'inbox d'approbation"}
          onRetry={refetch}
        />
      </div>
    );
  }

  const viewModel = buildApprovalsViewModel(data);

  if (!viewModel.hasItems) {
    return (
      <div className="space-y-6">
        <ReadOnlyDetailHeader
          backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
          backLabel="Retour aux actions"
          title="Inbox d'approbation"
          description="File read-only des validations, priorites et justifications requises."
        />

        <ErrorFallback
          variant="empty"
          message="Aucune approbation en attente ne remonte encore sur ce perimetre."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReadOnlyDetailHeader
        backHref={`/clients/${encodeURIComponent(orgId)}/actions`}
        backLabel="Retour aux actions"
        title="Inbox d'approbation"
        description="File read-only des validations, priorites et justifications requises."
      />

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
          <Card key={item.approvalId} className="rounded-2xl shadow-soft">
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
                  <span className="text-ink">
                    {formatDateTime(item.deadlineAt)}
                  </span>
                </p>
                <p>
                  Age: <span className="text-ink">{item.ageHours} h</span>
                </p>
                <p>
                  Risque:{" "}
                  <span className="text-ink">{item.riskBadge.label}</span>
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
                onDecisionSaved={() => {
                  void refetch();
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
