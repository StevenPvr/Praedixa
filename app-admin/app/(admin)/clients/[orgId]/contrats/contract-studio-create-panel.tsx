"use client";

import type { DecisionContractTemplateListResponse } from "@praedixa/shared-types/api";
import { Button, Card, CardContent } from "@praedixa/ui";

import { ReadOnlyStateCard } from "../read-only-detail";
import {
  buildContractSlug,
  type ContractStudioSelection,
} from "./contract-studio-shared";
import { useContractStudioCreateController } from "./contract-studio-create-controller";

interface ContractStudioCreatePanelProps {
  orgId: string;
  templates: DecisionContractTemplateListResponse;
  canMutate: boolean;
  onCreated: (selection: ContractStudioSelection) => void;
}

type ContractStudioCreateController = ReturnType<
  typeof useContractStudioCreateController
>;

type ContractStudioTextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

type ContractStudioTemplateFieldProps = {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  selectedTemplateId: string;
  onTemplateChange: (templateId: string) => void;
};

type ContractStudioCreateFieldsProps = {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  state: ContractStudioCreateController["state"];
};

type ContractStudioCreateStatusProps = {
  error: string | null;
};

type ContractStudioCreateFormProps = {
  activeTemplates: DecisionContractTemplateListResponse["items"];
  state: ContractStudioCreateController["state"];
  onSubmit: () => Promise<void>;
};

function ContractStudioTextField(
  props: Readonly<ContractStudioTextFieldProps>,
) {
  const { label, value, onChange } = props;
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

function ContractStudioTemplateField(
  props: Readonly<ContractStudioTemplateFieldProps>,
) {
  const { activeTemplates, selectedTemplateId, onTemplateChange } = props;
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

function ContractStudioCreateFields(
  props: Readonly<ContractStudioCreateFieldsProps>,
) {
  const { activeTemplates, state } = props;
  return (
    <div className="space-y-4">
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
    </div>
  );
}

function ContractStudioCreateStatus(
  props: Readonly<ContractStudioCreateStatusProps>,
) {
  const { error } = props;
  return error ? <p className="text-sm text-danger-text">{error}</p> : null;
}

function ContractStudioCreateForm(
  props: Readonly<ContractStudioCreateFormProps>,
) {
  const { activeTemplates, state, onSubmit } = props;
  async function handleSubmit() {
    await onSubmit();
  }

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
        <Button loading={state.mutation.loading} onClick={handleSubmit}>
          Creer le draft
        </Button>
      </CardContent>
    </Card>
  );
}

export function ContractStudioCreatePanel(
  props: Readonly<ContractStudioCreatePanelProps>,
) {
  const { orgId, templates, canMutate, onCreated } = props;
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
