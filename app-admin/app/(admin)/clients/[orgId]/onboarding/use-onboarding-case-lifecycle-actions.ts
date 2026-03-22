"use client";

import { useState } from "react";
import type {
  OnboardingCaseBundle,
  OnboardingCaseDetail,
  OnboardingCaseLifecycleRequest,
} from "@praedixa/shared-types/api";

import { apiPost } from "@/lib/api/client";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { getValidAccessToken } from "@/lib/auth/client";
import {
  getErrorMessage,
  type OnboardingCaseActionContext,
} from "./onboarding-case-actions.shared";

type UseOnboardingCaseLifecycleActionsArgs = OnboardingCaseActionContext & {
  setSelectedCaseId: (caseId: string | null) => void;
};

export function useOnboardingCaseLifecycleActions({
  orgId,
  selectedCaseId,
  setSelectedCaseId,
  refetchCases,
  refetchCaseDetail,
  toast,
}: UseOnboardingCaseLifecycleActionsArgs) {
  const [lifecycleAction, setLifecycleAction] = useState<string | null>(null);

  async function handleRecomputeReadiness() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("recompute");
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingCaseRecompute(orgId, selectedCaseId),
        {},
        async () => getValidAccessToken(),
      );
      toast.success("Readiness onboarding recalculee");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Impossible de recalculer la readiness onboarding",
        ),
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  async function handleCancelCase() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("cancel");
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingCaseCancel(orgId, selectedCaseId),
        {
          reason: "Cancelled from admin onboarding workspace",
        } satisfies OnboardingCaseLifecycleRequest,
        async () => getValidAccessToken(),
      );
      toast.success("Case onboarding annule");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Impossible d'annuler le case onboarding"),
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  async function handleReopenCase() {
    if (!selectedCaseId) {
      return;
    }

    setLifecycleAction("reopen");
    try {
      const response = await apiPost<OnboardingCaseDetail>(
        ADMIN_ENDPOINTS.orgOnboardingCaseReopen(orgId, selectedCaseId),
        {
          reason: "Reopened from admin onboarding workspace",
        } satisfies OnboardingCaseLifecycleRequest,
        async () => getValidAccessToken(),
      );
      setSelectedCaseId(response.data.id);
      toast.success("Nouveau case onboarding cree depuis la reouverture");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Impossible de rouvrir le case onboarding"),
      );
    } finally {
      setLifecycleAction(null);
    }
  }

  return {
    lifecycleAction,
    handleRecomputeReadiness,
    handleCancelCase,
    handleReopenCase,
  };
}
