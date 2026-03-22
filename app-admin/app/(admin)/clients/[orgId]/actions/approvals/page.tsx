"use client";

import {
  ApprovalsEmptyState,
  ApprovalsErrorState,
  ApprovalsLoadingState,
  ApprovalsPageContent,
} from "./approvals-sections";
import { useApprovalsPageModel } from "./page-model";

export default function ApprovalsPage() {
  const model = useApprovalsPageModel();
  const {
    backHref,
    canManageApprovals,
    data,
    error,
    loading,
    orgId,
    refetch,
    viewModel,
  } = model;

  if (loading) {
    return <ApprovalsLoadingState backHref={backHref} />;
  }

  if (error || !data) {
    return (
      <ApprovalsErrorState
        backHref={backHref}
        message={error ?? "Impossible de charger l'inbox d'approbation"}
        onRetry={refetch}
      />
    );
  }

  if (!viewModel?.hasItems) {
    return <ApprovalsEmptyState backHref={backHref} />;
  }

  return (
    <ApprovalsPageContent
      orgId={orgId}
      data={data}
      viewModel={viewModel}
      canManageApprovals={canManageApprovals}
      onDecisionSaved={refetch}
      backHref={backHref}
    />
  );
}
