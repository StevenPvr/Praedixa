"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import {
  buildContractSlug,
  nextSelectionFromResult,
  type ContractStudioSelection,
} from "./contract-studio-shared";

type CreateDraftInput = {
  selectedTemplate:
    | DecisionContractTemplateListResponse["items"][number]
    | null;
  name: string;
  contractId: string;
  reason: string;
};

function useCreateTemplateState(
  activeTemplates: DecisionContractTemplateListResponse["items"],
  orgId: string,
) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    activeTemplates[0]?.templateId ?? "",
  );
  const [name, setName] = useState(activeTemplates[0]?.name ?? "");
  const [contractId, setContractId] = useState(
    buildContractSlug(activeTemplates[0]?.templateId ?? ""),
  );
  const [reason, setReason] = useState("bootstrap_contract_line");
  const [localError, setLocalError] = useState<string | null>(null);
  const mutation = useApiPost<
    DecisionContractStudioCreateRequest,
    DecisionContractStudioDetailResponse
  >(ADMIN_ENDPOINTS.orgDecisionContracts(orgId));
  const selectedTemplate = useMemo(
    () =>
      activeTemplates.find((item) => item.templateId === selectedTemplateId) ??
      null,
    [activeTemplates, selectedTemplateId],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }
    setName((current) =>
      current.length > 0 ? current : selectedTemplate.name,
    );
    setContractId((current) =>
      current.length > 0
        ? current
        : buildContractSlug(selectedTemplate.templateId),
    );
  }, [selectedTemplate]);

  return {
    contractId,
    localError,
    mutation,
    name,
    reason,
    selectedTemplate,
    selectedTemplateId,
    setContractId,
    setLocalError,
    setName,
    setReason,
    setSelectedTemplateId,
  };
}

function buildCreateDraftRequest({
  selectedTemplate,
  name,
  contractId,
  reason,
}: CreateDraftInput):
  | { error: string }
  | { request: DecisionContractStudioCreateRequest } {
  const trimmedName = name.trim();
  const trimmedContractId = contractId.trim();
  const trimmedReason = reason.trim();

  if (!selectedTemplate) {
    return { error: "Aucun template actif n'est disponible." };
  }
  if (trimmedName.length === 0 || trimmedContractId.length === 0) {
    return { error: "Le nom et le contractId sont requis." };
  }
  if (trimmedReason.length === 0) {
    return { error: "Un motif de creation est requis." };
  }

  return {
    request: {
      templateId: selectedTemplate.templateId,
      templateVersion: selectedTemplate.templateVersion,
      contractId: trimmedContractId,
      name: trimmedName,
      reason: trimmedReason,
      ...(selectedTemplate.description
        ? { description: selectedTemplate.description }
        : {}),
      ...(selectedTemplate.tags ? { tags: selectedTemplate.tags } : {}),
    } satisfies DecisionContractStudioCreateRequest,
  };
}

export function useContractStudioCreateController(
  templates: DecisionContractTemplateListResponse,
  orgId: string,
  onCreated: (selection: ContractStudioSelection) => void,
) {
  const activeTemplates = useMemo(
    () => templates.items.filter((item) => item.status === "active"),
    [templates.items],
  );
  const state = useCreateTemplateState(activeTemplates, orgId);

  async function submitCreate() {
    const result = buildCreateDraftRequest({
      selectedTemplate: state.selectedTemplate,
      name: state.name,
      contractId: state.contractId,
      reason: state.reason,
    });
    if ("error" in result) {
      state.setLocalError(result.error);
      return;
    }
    state.setLocalError(null);
    const response = await state.mutation.mutate(result.request);
    const selection = nextSelectionFromResult(response);
    if (selection) {
      onCreated(selection);
    }
  }

  return { activeTemplates, state, submitCreate };
}
