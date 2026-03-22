"use client";

import type { ApprovalInboxResponse } from "@praedixa/shared-types/api";

import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { useClientContext } from "../../client-context";

export const APPROVALS_PAGE_TITLE = "Inbox d'approbation";
export const APPROVALS_PAGE_DESCRIPTION =
  "File read-only des validations, priorites et justifications requises.";

export type ApprovalsViewModel = {
  hasItems: boolean;
  hasGroups: boolean;
  degradedReasons: string[];
};

export function formatDateTime(value?: string): string {
  if (!value) {
    return "Aucune echeance";
  }

  return new Date(value).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatAmount(amount: number | null): string {
  if (amount == null) {
    return "N/A";
  }

  return `${Math.round(amount)} EUR`;
}

export function buildApprovalsViewModel(
  data: ApprovalInboxResponse,
): ApprovalsViewModel {
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

export function useApprovalsPageModel() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const canManageApprovals = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const { data, loading, error, refetch } = useApiGet<ApprovalInboxResponse>(
    ADMIN_ENDPOINTS.orgApprovalsInbox(orgId),
  );
  const viewModel = data ? buildApprovalsViewModel(data) : null;

  return {
    orgId,
    canManageApprovals,
    data,
    loading,
    error,
    refetch,
    viewModel,
    backHref: `/clients/${encodeURIComponent(orgId)}/actions`,
  };
}
