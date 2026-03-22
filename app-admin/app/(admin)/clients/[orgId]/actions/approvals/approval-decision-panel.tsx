"use client";

import { useState } from "react";

import type {
  ApprovalDecisionRequest,
  ApprovalDecisionResponse,
  ApprovalInboxItem,
} from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ReadOnlyStateCard } from "../../read-only-detail";

type ApprovalDecisionPanelProps = {
  orgId: string;
  item: ApprovalInboxItem;
  canManageApprovals: boolean;
  onDecisionSaved: () => void;
};

export function ApprovalDecisionPanel(
  props: Readonly<ApprovalDecisionPanelProps>,
) {
  const { orgId, item, canManageApprovals, onDecisionSaved } = props;
  const [comment, setComment] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<string | null>(null);
  const mutation = useApiPost<
    ApprovalDecisionRequest,
    ApprovalDecisionResponse
  >(ADMIN_ENDPOINTS.orgApprovalDecision(orgId, item.approvalId));

  async function submitDecision(outcome: "granted" | "rejected") {
    const trimmedComment = comment.trim();
    if (item.requiresJustification && trimmedComment.length == 0) {
      setLocalError("Une justification est requise pour cette decision.");
      return;
    }

    setLocalError(null);
    const response = await mutation.mutate({
      outcome,
      reasonCode:
        outcome === "granted" ? "approved_by_admin" : "rejected_by_admin",
      ...(trimmedComment.length > 0 ? { comment: trimmedComment } : {}),
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
          onClick={() => {
            submitDecision("granted").catch(() => undefined);
          }}
        >
          Approuver
        </Button>
        <Button
          size="sm"
          variant="destructive"
          loading={mutation.loading}
          onClick={() => {
            submitDecision("rejected").catch(() => undefined);
          }}
        >
          Rejeter
        </Button>
      </div>
    </div>
  );
}
