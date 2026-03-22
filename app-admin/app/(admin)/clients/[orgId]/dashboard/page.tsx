"use client";

import { SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";

import {
  DashboardBottomSection,
  DashboardDeletionSection,
  DashboardHeader,
  DashboardTables,
  MirrorStats,
  OrganizationOverviewCard,
} from "./dashboard-sections";
import { useClientDashboardPageModel } from "./use-client-dashboard-page-model";

export default function ClientDashboardPage() {
  const {
    orgId,
    org,
    mirror,
    billing,
    topAlerts,
    topScenarios,
    loading,
    error,
    refetch,
    canManageLifecycle,
    canDeleteTestClient,
    deleteForm,
    setDeleteForm,
    deleteLoading,
    suspendLoading,
    reactivateLoading,
    handleSuspend,
    handleReactivate,
    handleDeleteOrganization,
  } = useClientDashboardPageModel();

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !org) {
    return (
      <ErrorFallback
        message={error ?? "Client introuvable"}
        onRetry={refetch}
      />
    );
  }

  const dashboardContent = (
    <div className="space-y-6">
      <DashboardHeader org={org} />
      <OrganizationOverviewCard org={org} />
      <MirrorStats mirror={mirror} />
      <DashboardTables topAlerts={topAlerts} topScenarios={topScenarios} />
      <DashboardBottomSection
        orgId={orgId}
        org={org}
        billing={billing}
        canManageLifecycle={canManageLifecycle}
        suspendLoading={suspendLoading}
        reactivateLoading={reactivateLoading}
        handleSuspend={handleSuspend}
        handleReactivate={handleReactivate}
      />
      <DashboardDeletionSection
        org={org}
        canDeleteTestClient={canDeleteTestClient}
        deleteForm={deleteForm}
        setDeleteForm={setDeleteForm}
        deleteLoading={deleteLoading}
        handleDeleteOrganization={handleDeleteOrganization}
      />
    </div>
  );

  return dashboardContent;
}
