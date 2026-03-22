"use client";

import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

import { useClientContext } from "../client-context";
import type { PlanTier } from "@/components/plan-badge";
import type { OrgStatus } from "@/components/org-status-badge";

export interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  sector?: string;
  size?: string;
  userCount?: number;
  siteCount?: number;
  createdAt?: string;
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
  currentUsage?: number;
  usageLimit?: number;
  nextBillingDate?: string;
  monthlyAmount?: number;
}

export function useVueClientPageModel() {
  const { orgId } = useClientContext();
  const currentUser = useCurrentUser();
  const toast = useToast();
  const canManageLifecycle = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const canReadBilling = hasAnyPermission(currentUser?.permissions, [
    "admin:billing:read",
  ]);

  const {
    data: org,
    loading: orgLoading,
    error: orgError,
    refetch: orgRefetch,
  } = useApiGet<OrgDetail>(ADMIN_ENDPOINTS.organization(orgId));

  const {
    data: mirror,
    loading: mirrorLoading,
    error: mirrorError,
  } = useApiGet<MirrorData>(ADMIN_ENDPOINTS.orgMirror(orgId));

  const {
    data: billing,
    loading: billingLoading,
    error: billingError,
  } = useApiGet<BillingData>(
    canReadBilling ? ADMIN_ENDPOINTS.orgBilling(orgId) : null,
  );

  const { mutate: suspend, loading: suspendLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgSuspend(orgId));

  const { mutate: reactivate, loading: reactivateLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgReactivate(orgId));

  async function handleSuspend() {
    if (!canManageLifecycle) {
      toast.error("Permission requise: admin:org:write");
      return;
    }

    const result = await suspend({});
    if (result) {
      toast.success("Client suspendu");
      orgRefetch();
      return;
    }

    toast.error("Impossible de suspendre le client");
  }

  async function handleReactivate() {
    if (!canManageLifecycle) {
      toast.error("Permission requise: admin:org:write");
      return;
    }

    const result = await reactivate({});
    if (result) {
      toast.success("Client reactive");
      orgRefetch();
      return;
    }

    toast.error("Impossible de reactiver le client");
  }

  return {
    org,
    orgLoading,
    orgError,
    orgRefetch,
    mirror,
    mirrorLoading,
    mirrorError,
    billing,
    canReadBilling,
    billingLoading,
    billingError,
    canManageLifecycle,
    suspendLoading,
    reactivateLoading,
    handleSuspend,
    handleReactivate,
  };
}
