"use client";

import { useState } from "react";
import type {
  CompleteOnboardingCaseTaskRequest,
  OnboardingApiSourceActivationResult,
  OnboardingCaseBundle,
  OnboardingFileSourceUploadResult,
} from "@praedixa/shared-types/api";

import { apiPost, apiPostFormData } from "@/lib/api/client";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { getValidAccessToken } from "@/lib/auth/client";
import { readString } from "./task-action-payload";
import {
  getErrorMessage,
  type OnboardingCaseActionContext,
} from "./onboarding-case-actions.shared";

type UseOnboardingCaseTaskActionsArgs = OnboardingCaseActionContext;

function hasSelectedCase(
  selectedCaseId: string | null,
): selectedCaseId is string {
  return selectedCaseId !== null;
}

async function saveTaskBundle(
  orgId: string,
  selectedCaseId: string,
  taskId: string,
  note: string | null,
  payloadJson: Record<string, unknown>,
) {
  await apiPost<OnboardingCaseBundle>(
    ADMIN_ENDPOINTS.orgOnboardingTaskSave(orgId, selectedCaseId, taskId),
    { note, payloadJson },
    async () => getValidAccessToken(),
  );
}

export function useOnboardingCaseTaskActions({
  orgId,
  selectedCaseId,
  refetchCases,
  refetchCaseDetail,
  toast,
}: UseOnboardingCaseTaskActionsArgs) {
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [activatingApiSourceTaskId, setActivatingApiSourceTaskId] = useState<
    string | null
  >(null);
  const [uploadingFileSourceTaskId, setUploadingFileSourceTaskId] = useState<
    string | null
  >(null);

  async function handleSaveTask(
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) {
    if (!hasSelectedCase(selectedCaseId)) {
      return;
    }

    setSavingTaskId(taskId);
    try {
      await saveTaskBundle(orgId, selectedCaseId, taskId, note, payloadJson);
      toast.success("Brouillon onboarding enregistre");
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          "Impossible d'enregistrer le brouillon onboarding",
        ),
      );
    } finally {
      setSavingTaskId(null);
    }
  }

  async function handleCompleteTask(
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) {
    if (!hasSelectedCase(selectedCaseId)) {
      return;
    }

    setCompletingTaskId(taskId);
    try {
      await apiPost<OnboardingCaseBundle>(
        ADMIN_ENDPOINTS.orgOnboardingTaskComplete(
          orgId,
          selectedCaseId,
          taskId,
        ),
        { note, payloadJson } satisfies CompleteOnboardingCaseTaskRequest,
        async () => getValidAccessToken(),
      );
      toast.success("Tache onboarding completee");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Impossible de completer la tache onboarding"),
      );
    } finally {
      setCompletingTaskId(null);
    }
  }

  async function handleActivateApiSource(
    taskId: string,
    payloadJson: Record<string, unknown>,
  ) {
    if (!hasSelectedCase(selectedCaseId)) {
      return;
    }

    const connectionId = readString(payloadJson, "connectionId").trim();
    if (!connectionId) {
      toast.error("Renseigne un Connection ID avant l'activation.");
      return;
    }

    setActivatingApiSourceTaskId(taskId);
    try {
      await apiPost<OnboardingApiSourceActivationResult>(
        ADMIN_ENDPOINTS.orgOnboardingTaskActivateApiSource(
          orgId,
          selectedCaseId,
          taskId,
        ),
        { connectionId },
        async () => getValidAccessToken(),
      );
      toast.success("Source API activee et premier cycle lance");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(getErrorMessage(error, "Impossible d'activer la source API"));
    } finally {
      setActivatingApiSourceTaskId(null);
    }
  }

  async function handleUploadFileSource(
    taskId: string,
    payloadJson: Record<string, unknown>,
    file: File | null,
  ) {
    if (!hasSelectedCase(selectedCaseId)) {
      return;
    }
    if (!file) {
      toast.error("Selectionne un fichier CSV, TSV ou XLSX.");
      return;
    }

    const label = readString(payloadJson, "sourceLabel").trim();
    const domain = readString(payloadJson, "sourceDomain").trim();
    const datasetKey = readString(payloadJson, "datasetKey").trim();
    const importProfile = readString(payloadJson, "importProfile").trim();
    const replayStrategy = readString(payloadJson, "replayStrategy").trim();

    if (!label || !domain || !datasetKey || !importProfile) {
      toast.error(
        "Renseigne label, domaine, dataset key et profil d'import avant l'upload.",
      );
      return;
    }

    const formData = new FormData();
    formData.set("label", label);
    formData.set("domain", domain);
    formData.set("datasetKey", datasetKey);
    formData.set("importProfile", importProfile);
    if (replayStrategy) {
      formData.set("replayStrategy", replayStrategy);
    }
    formData.set("file", file);

    setUploadingFileSourceTaskId(taskId);
    try {
      await apiPostFormData<OnboardingFileSourceUploadResult>(
        ADMIN_ENDPOINTS.orgOnboardingTaskFileUpload(
          orgId,
          selectedCaseId,
          taskId,
        ),
        formData,
        async () => getValidAccessToken(),
      );
      toast.success("Fichier source charge et pipeline bronze declenche");
      refetchCases();
      refetchCaseDetail();
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Impossible d'importer le fichier source"),
      );
    } finally {
      setUploadingFileSourceTaskId(null);
    }
  }

  return {
    savingTaskId,
    completingTaskId,
    activatingApiSourceTaskId,
    uploadingFileSourceTaskId,
    handleSaveTask,
    handleCompleteTask,
    handleActivateApiSource,
    handleUploadFileSource,
  };
}
