"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DeleteAdminOrganizationRequest,
  DeleteAdminOrganizationResponse,
} from "@praedixa/shared-types/api";

import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import type { PlanTier } from "@/components/plan-badge";
import type { OrgStatus } from "@/components/org-status-badge";
import type { TestClientDeletionFormState } from "./test-client-deletion-card";

export interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  isTest: boolean;
  sector?: string;
  userCount?: number;
  siteCount?: number;
}

export interface MirrorData {
  totalEmployees?: number;
  totalSites?: number;
  activeAlerts?: number;
  forecastAccuracy?: number;
  avgAbsenteeism?: number;
  coverageRate?: number;
}

export interface BillingData {
  plan: PlanTier;
  billingCycle?: string;
  monthlyAmount?: number;
  nextBillingDate?: string;
}

export interface AlertItem {
  id: string;
  date: string;
  type: string;
  severity: string;
  status: string;
  siteId?: string;
  siteName?: string;
}

export interface ScenarioItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface OrgOverview {
  organization: OrgDetail;
  mirror: MirrorData;
  billing: BillingData;
  alerts: AlertItem[];
  scenarios: ScenarioItem[];
}

const INITIAL_DELETE_FORM: TestClientDeletionFormState = {
  organizationSlug: "",
  confirmationText: "",
  acknowledgeTestDeletion: false,
};

export function useClientDashboardPageModel() {
  const router = useRouter();
  const { orgId, selectedSiteId } = useClientContext();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const [deleteForm, setDeleteForm] = useState(INITIAL_DELETE_FORM);

  const {
    data: overview,
    loading,
    error,
    refetch,
  } = useApiGet<OrgOverview>(ADMIN_ENDPOINTS.orgOverview(orgId));

  const { mutate: suspend, loading: suspendLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgSuspend(orgId));
  const { mutate: reactivate, loading: reactivateLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgReactivate(orgId));
  const { mutate: deleteOrganization, loading: deleteLoading } = useApiPost<
    DeleteAdminOrganizationRequest,
    DeleteAdminOrganizationResponse
  >(ADMIN_ENDPOINTS.orgDelete(orgId));

  const org = overview?.organization;
  const mirror = overview?.mirror;
  const billing = overview?.billing;
  const canManageLifecycle = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const canDeleteTestClient =
    canManageLifecycle &&
    currentUser?.role === "super_admin" &&
    org?.isTest === true;

  const topAlerts = useMemo(() => {
    const alerts = overview?.alerts ?? [];
    const scopedAlerts =
      selectedSiteId == null
        ? alerts
        : alerts.filter((alert) => alert.siteId === selectedSiteId);
    return scopedAlerts.slice(0, 5);
  }, [overview?.alerts, selectedSiteId]);

  const topScenarios = useMemo(
    () => (overview?.scenarios ?? []).slice(0, 5),
    [overview?.scenarios],
  );

  async function handleSuspend() {
    if (!canManageLifecycle) {
      toast.error("Permissions insuffisantes pour suspendre ce client");
      return;
    }

    const result = await suspend({});
    if (!result) {
      toast.error("Impossible de suspendre le client");
      return;
    }

    toast.success("Client suspendu");
    refetch();
  }

  async function handleReactivate() {
    if (!canManageLifecycle) {
      toast.error("Permissions insuffisantes pour reactiver ce client");
      return;
    }

    const result = await reactivate({});
    if (!result) {
      toast.error("Impossible de reactiver le client");
      return;
    }

    toast.success("Client reactive");
    refetch();
  }

  async function handleDeleteOrganization() {
    if (!org || !canDeleteTestClient) {
      toast.error("Seul le super admin peut supprimer un client test");
      return;
    }

    const organizationSlug = deleteForm.organizationSlug.trim().toLowerCase();
    const confirmationText = deleteForm.confirmationText.trim().toUpperCase();

    if (!deleteForm.acknowledgeTestDeletion) {
      toast.error("Confirme d'abord qu'il s'agit bien d'un client test");
      return;
    }

    if (organizationSlug !== org.slug) {
      toast.error("Le slug retape ne correspond pas au client courant");
      return;
    }

    if (confirmationText !== "SUPPRIMER") {
      toast.error("Retape SUPPRIMER pour confirmer la suppression");
      return;
    }

    const deleted = await deleteOrganization({
      organizationSlug,
      confirmationText: "SUPPRIMER",
      acknowledgeTestDeletion: true,
    });

    if (!deleted) {
      toast.error("Impossible de supprimer le client test");
      return;
    }

    toast.success("Client test supprime");
    router.push("/clients");
  }

  return {
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
  };
}
