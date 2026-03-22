"use client";

import { useEffect, useState } from "react";
import type {
  CreateOnboardingCaseRequest,
  OnboardingCaseBundle,
  OnboardingCaseDetail,
  OnboardingCaseSummary,
} from "@praedixa/shared-types/api";

import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUserState } from "@/lib/auth/client";
import {
  INTEGRATIONS_READ,
  USERS_ACCESS,
  USERS_WRITE,
} from "@/lib/auth/admin-route-policy-shared";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { ADMIN_WORKSPACE_FEATURE_GATES } from "@/lib/runtime/admin-workspace-feature-gates";
import { useClientContext } from "../client-context";
import {
  DEFAULT_FORM_STATE,
  type OnboardingFormState,
  type OrgUserItem,
} from "./page-model";
import {
  buildCreateCaseRequest,
  buildIntegrationOptions,
  getCaseSelection,
  getCreateCaseValidationError,
  getEffectiveUsersLoading,
  getStatsSource,
  getUsersAccessError,
} from "./onboarding-page-model-helpers";
import { useOnboardingCaseActions } from "./use-onboarding-case-actions";

type IntegrationConnectionOption = {
  id: string;
  displayName: string;
  vendor: string;
};

export function useOnboardingPageModel() {
  const { orgId, orgName, hierarchy } = useClientContext();
  const toast = useToast();
  const { user: currentUser, loading: currentUserLoading } =
    useCurrentUserState();

  const [page, setPage] = useState(1);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [form, setForm] = useState<OnboardingFormState>(DEFAULT_FORM_STATE);

  const canReadOrgUsers = hasAnyPermission(
    currentUser?.permissions,
    USERS_ACCESS,
  );
  const canInviteOrgUsers = hasAnyPermission(
    currentUser?.permissions,
    USERS_WRITE,
  );
  const canReadIntegrations = hasAnyPermission(
    currentUser?.permissions,
    INTEGRATIONS_READ,
  );

  const {
    data: cases,
    total,
    loading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useApiGetPaginated<OnboardingCaseSummary>(
    ADMIN_ENDPOINTS.orgOnboardingCases(orgId),
    page,
    20,
  );

  const {
    data: users,
    loading: usersLoading,
    error: usersError,
  } = useApiGet<OrgUserItem[]>(
    canReadOrgUsers ? ADMIN_ENDPOINTS.orgUsers(orgId) : null,
  );

  const {
    data: caseBundle,
    loading: caseDetailLoading,
    error: caseDetailError,
    refetch: refetchCaseDetail,
  } = useApiGet<OnboardingCaseBundle>(
    selectedCaseId
      ? ADMIN_ENDPOINTS.orgOnboardingCase(orgId, selectedCaseId)
      : null,
  );
  const { data: integrationConnections } = useApiGet<
    IntegrationConnectionOption[]
  >(
    canReadIntegrations && ADMIN_WORKSPACE_FEATURE_GATES.integrationsWorkspace
      ? ADMIN_ENDPOINTS.orgIntegrationConnections(orgId)
      : null,
  );

  const createCase = useApiPost<
    CreateOnboardingCaseRequest,
    OnboardingCaseDetail
  >(ADMIN_ENDPOINTS.orgOnboardingCases(orgId));

  useEffect(() => {
    if (createCase.error) {
      toast.error(createCase.error);
    }
  }, [createCase.error, toast]);

  useEffect(() => {
    setSelectedCaseId((currentSelectedCaseId) =>
      getCaseSelection(cases, currentSelectedCaseId),
    );
  }, [cases]);

  const statsSource = getStatsSource(caseBundle, cases);
  const integrationOptions = buildIntegrationOptions(integrationConnections);
  const effectiveUsersLoading = getEffectiveUsersLoading({
    currentUserLoading,
    canReadOrgUsers,
    usersLoading,
  });
  const effectiveUsersError = getUsersAccessError({
    currentUserLoading,
    canReadOrgUsers,
    usersError,
  });
  const {
    lifecycleAction,
    savingTaskId,
    completingTaskId,
    sendingInviteTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    handleSaveTask,
    handleCompleteTask,
    handleActivateApiSource,
    handleUploadFileSource,
    handleSendSecureInvites,
    handleRecomputeReadiness,
    handleCancelCase,
    handleReopenCase,
  } = useOnboardingCaseActions({
    orgId,
    selectedCaseId,
    setSelectedCaseId,
    canInviteOrgUsers,
    refetchCases,
    refetchCaseDetail,
    toast,
  });

  async function handleCreateCase() {
    const validationError = getCreateCaseValidationError(form);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const created = await createCase.mutate(buildCreateCaseRequest(form));

    if (!created) {
      return;
    }

    setForm(DEFAULT_FORM_STATE);
    setSelectedCaseId(created.id);
    toast.success("Case onboarding cree");
    refetchCases();
    refetchCaseDetail();
  }

  return {
    orgId,
    orgName,
    hierarchy,
    page,
    setPage,
    total,
    cases,
    casesLoading,
    casesError,
    refetchCases,
    selectedCaseId,
    setSelectedCaseId,
    form,
    setForm,
    users,
    effectiveUsersLoading,
    effectiveUsersError,
    createCaseLoading: createCase.loading,
    caseBundle,
    caseDetailLoading,
    caseDetailError,
    refetchCaseDetail,
    statsSource,
    lifecycleAction,
    completingTaskId,
    savingTaskId,
    sendingInviteTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    integrationOptions,
    canInviteOrgUsers,
    handleCreateCase,
    handleSaveTask,
    handleCompleteTask,
    handleActivateApiSource,
    handleUploadFileSource,
    handleSendSecureInvites,
    handleRecomputeReadiness,
    handleCancelCase,
    handleReopenCase,
  };
}
