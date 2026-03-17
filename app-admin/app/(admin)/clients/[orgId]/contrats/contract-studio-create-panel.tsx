"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ReadOnlyStateCard } from "../read-only-detail";
import {
  buildContractSlug,
  nextSelectionFromResult,
  type ContractStudioSelection,
} from "./contract-studio-shared";

interface ContractStudioCreatePanelProps {
  orgId: string;
  templates: DecisionContractTemplateListResponse;
  canMutate: boolean;
  onCreated: (selection: ContractStudioSelection) => void;
}

interface CreateDraftInput {
  selectedTemplate:
    | DecisionContractTemplateListResponse["items"][number]
    | null;
  name: string;
  contractId: string;
  reason: string;
}

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
      description: selectedTemplate.description,
      reason: trimmedReason,
      tags: selectedTemplate.tags,
    } satisfies DecisionContractStudioCreateRequest,
  };
}

function ContractStudioTextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm text-ink-tertiary">
      <span>{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

function ContractStudioTemplateField({
  activeTemplates,
  selectedTemplateId,
  onTemplateChange,
}: {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
}) {
  return (
    <label className="block space-y-2 text-sm text-ink-tertiary">
      <span>Template</span>
      <select
        value={selectedTemplateId}
        onChange={(event) => onTemplateChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink"
      >
        {activeTemplates.map((template) => (
          <option key={template.templateId} value={template.templateId}>
            {template.name} v{template.templateVersion}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContractStudioCreateHeader() {
  return (
    <div>
      <h3 className="text-sm font-medium text-ink-secondary">
        Initialiser un contrat
      </h3>
      <p className="text-sm text-ink-tertiary">
        La creation materialise un draft persistant a partir d'un template
        versionne.
      </p>
    </div>
  );
}

function ContractStudioCreateFields({
  activeTemplates,
  state,
}: {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  state: ReturnType<typeof useCreateTemplateState>;
}) {
  return (
    <>
      <ContractStudioTemplateField
        activeTemplates={activeTemplates}
        selectedTemplateId={state.selectedTemplateId}
        onTemplateChange={(nextId) => {
          state.setSelectedTemplateId(nextId);
          const template =
            activeTemplates.find((item) => item.templateId === nextId) ?? null;
          if (!template) {
            return;
          }
          state.setName(template.name);
          state.setContractId(buildContractSlug(template.templateId));
        }}
      />
      <ContractStudioTextField
        label="Nom du contrat"
        value={state.name}
        onChange={state.setName}
      />
      <ContractStudioTextField
        label="Contract ID"
        value={state.contractId}
        onChange={(value) => state.setContractId(buildContractSlug(value))}
      />
      <ContractStudioTextField
        label="Motif"
        value={state.reason}
        onChange={state.setReason}
      />
    </>
  );
}

function ContractStudioCreateStatus({ error }: { error: string | null }) {
  return error ? <p className="text-sm text-danger-text">{error}</p> : null;
}

function ContractStudioCreateForm({
  activeTemplates,
  state,
  onSubmit,
}: {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  state: ReturnType<typeof useCreateTemplateState>;
  onSubmit: () => Promise<void>;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <ContractStudioCreateHeader />
        <ContractStudioCreateFields
          activeTemplates={activeTemplates}
          state={state}
        />
        <ContractStudioCreateStatus
          error={state.localError ?? state.mutation.error}
        />
        <Button
          loading={state.mutation.loading}
          onClick={() => void onSubmit()}
        >
          Creer le draft
        </Button>
      </CardContent>
    </Card>
  );
}

function useContractStudioCreateController(
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

export function ContractStudioCreatePanel({
  orgId,
  templates,
  canMutate,
  onCreated,
}: ContractStudioCreatePanelProps) {
  const { activeTemplates, state, submitCreate } =
    useContractStudioCreateController(templates, orgId, onCreated);

  if (activeTemplates.length === 0) {
    return (
      <ReadOnlyStateCard
        tone="warning"
        title="Templates indisponibles"
        message="Aucun template actif n'est publie pour initialiser une ligne de contrat."
      />
    );
  }
  if (!canMutate) {
    return (
      <ReadOnlyStateCard
        tone="warning"
        title="Creation restreinte"
        message="Le catalogue est visible, mais la creation d'un contrat exige la permission admin:org:write."
      />
    );
  }
  return (
    <ContractStudioCreateForm
      activeTemplates={activeTemplates}
      state={state}
      onSubmit={submitCreate}
    />
  );
}
