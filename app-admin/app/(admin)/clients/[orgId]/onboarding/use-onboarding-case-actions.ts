"use client";

import type { ToastLike } from "./onboarding-case-actions.shared";
import { useOnboardingCaseInviteActions } from "./use-onboarding-case-invite-actions";
import { useOnboardingCaseLifecycleActions } from "./use-onboarding-case-lifecycle-actions";
import { useOnboardingCaseTaskActions } from "./use-onboarding-case-task-actions";

type UseOnboardingCaseActionsArgs = {
  orgId: string;
  selectedCaseId: string | null;
  setSelectedCaseId: (caseId: string | null) => void;
  canInviteOrgUsers: boolean;
  refetchCases: () => void;
  refetchCaseDetail: () => void;
  toast: ToastLike;
};

export function useOnboardingCaseActions({
  orgId,
  selectedCaseId,
  setSelectedCaseId,
  canInviteOrgUsers,
  refetchCases,
  refetchCaseDetail,
  toast,
}: UseOnboardingCaseActionsArgs) {
  const {
    savingTaskId,
    completingTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    handleSaveTask,
    handleCompleteTask,
    handleActivateApiSource,
    handleUploadFileSource,
  } = useOnboardingCaseTaskActions({
    orgId,
    selectedCaseId,
    refetchCases,
    refetchCaseDetail,
    toast,
  });
  const { sendingInviteTaskId, handleSendSecureInvites } =
    useOnboardingCaseInviteActions({
      orgId,
      selectedCaseId,
      canInviteOrgUsers,
      refetchCases,
      refetchCaseDetail,
      toast,
    });
  const {
    lifecycleAction,
    handleRecomputeReadiness,
    handleCancelCase,
    handleReopenCase,
  } = useOnboardingCaseLifecycleActions({
    orgId,
    selectedCaseId,
    setSelectedCaseId,
    refetchCases,
    refetchCaseDetail,
    toast,
  });

  return {
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
  };
}
