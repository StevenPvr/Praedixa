"use client";

import type { SiteHierarchy } from "../client-context";
import { AccessModelTaskFields } from "./access-model-task-fields";
import {
  ApiActivationDraftFields,
  FileSourceDraftFields,
  SourceActivationSummaryList,
} from "./source-activation-task-fields";
import {
  CheckboxField,
  TextAreaField,
  TextField,
} from "./task-action-form-fields";
import {
  readBoolean,
  readNumber,
  readString,
  readStringList,
  toListValue,
} from "./task-action-payload";

type TaskActionEditorProps = {
  taskKey: string;
  payload: Record<string, unknown>;
  patchPayload: (next: Partial<Record<string, unknown>>) => void;
  disabled: boolean;
  hierarchy?: SiteHierarchy[];
  integrationOptions?: Array<{ value: string; label: string }>;
};

type TaskEditorRenderer = (
  props: TaskActionEditorProps,
) => React.JSX.Element | null;

function renderScopeContractEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextAreaField
        label="Scope contractuel"
        value={readString(payload, "contractScope")}
        disabled={disabled}
        onChange={(value) => patchPayload({ contractScope: value })}
      />
      <TextField
        label="Owner commercial"
        value={readString(payload, "commercialOwner")}
        disabled={disabled}
        onChange={(value) => patchPayload({ commercialOwner: value })}
      />
      <CheckboxField
        label="Residence data validee"
        checked={readBoolean(payload, "dataResidencyApproved")}
        disabled={disabled}
        onChange={(value) => patchPayload({ dataResidencyApproved: value })}
      />
      <CheckboxField
        label="Environnement cible valide"
        checked={readBoolean(payload, "environmentValidated")}
        disabled={disabled}
        onChange={(value) => patchPayload({ environmentValidated: value })}
      />
    </div>
  );
}

function renderSourceStrategyEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextAreaField
        label="Systemes critiques"
        value={readStringList(payload, "primarySystems")}
        disabled={disabled}
        placeholder="Workday&#10;SAP HR&#10;SIRH local"
        onChange={(value) =>
          patchPayload({ primarySystems: toListValue(value) })
        }
      />
      <TextField
        label="Owner source"
        value={readString(payload, "sourceOwner")}
        disabled={disabled}
        onChange={(value) => patchPayload({ sourceOwner: value })}
      />
      <TextField
        label="Cadence d'extraction"
        value={readString(payload, "extractionCadence")}
        disabled={disabled}
        onChange={(value) => patchPayload({ extractionCadence: value })}
      />
    </div>
  );
}

function renderActivateApiSourcesEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <ApiActivationDraftFields
        payload={payload}
        disabled={disabled}
        options={props.integrationOptions ?? []}
        onChange={patchPayload}
      />
      <CheckboxField
        label="Datasets verifies"
        checked={readBoolean(payload, "datasetsValidated")}
        disabled={disabled}
        onChange={(value) => patchPayload({ datasetsValidated: value })}
      />
      <SourceActivationSummaryList
        payload={payload}
        emptyMessage="Aucune connexion API n'a encore ete activee depuis cette tache."
      />
    </div>
  );
}

function renderConfigureFileSourcesEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <FileSourceDraftFields
        payload={payload}
        disabled={disabled}
        onChange={patchPayload}
      />
      <TextField
        label="Strategie replay/backfill"
        value={readString(payload, "replayStrategy")}
        disabled={disabled}
        onChange={(value) => patchPayload({ replayStrategy: value })}
      />
      <CheckboxField
        label="Fichier echantillon recu"
        checked={readBoolean(payload, "sampleFileReceived")}
        disabled={disabled}
        onChange={(value) => patchPayload({ sampleFileReceived: value })}
      />
      <CheckboxField
        label="Preview mapping validee"
        checked={readBoolean(payload, "mappingPreviewValidated")}
        disabled={disabled}
        onChange={(value) => patchPayload({ mappingPreviewValidated: value })}
      />
      <SourceActivationSummaryList
        payload={payload}
        emptyMessage="Aucun CSV/XLSX/SFTP n'a encore ete configure ou charge pour cette tache."
      />
    </div>
  );
}

function renderPublishMappingsEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label="Version mapping"
        value={readString(payload, "mappingVersion")}
        disabled={disabled}
        onChange={(value) => patchPayload({ mappingVersion: value })}
      />
      <TextField
        label="Couverture %"
        value={readNumber(payload, "coveragePercent")}
        disabled={disabled}
        onChange={(value) =>
          patchPayload({
            coveragePercent: value.trim().length === 0 ? null : Number(value),
          })
        }
      />
      <CheckboxField
        label="Champs critiques couverts"
        checked={readBoolean(payload, "criticalFieldsCovered")}
        disabled={disabled}
        onChange={(value) => patchPayload({ criticalFieldsCovered: value })}
      />
      <CheckboxField
        label="Quarantaine critique fermee"
        checked={readBoolean(payload, "quarantineClosed")}
        disabled={disabled}
        onChange={(value) => patchPayload({ quarantineClosed: value })}
      />
    </div>
  );
}

function renderConfigureProductScopeEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextAreaField
        label="KPI"
        value={readStringList(payload, "kpis")}
        disabled={disabled}
        onChange={(value) => patchPayload({ kpis: toListValue(value) })}
      />
      <TextAreaField
        label="Horizons"
        value={readStringList(payload, "horizons")}
        disabled={disabled}
        onChange={(value) => patchPayload({ horizons: toListValue(value) })}
      />
      <TextAreaField
        label="Leviers"
        value={readStringList(payload, "levers")}
        disabled={disabled}
        onChange={(value) => patchPayload({ levers: toListValue(value) })}
      />
      <CheckboxField
        label="Proof packs confirmes"
        checked={readBoolean(payload, "proofPacksConfirmed")}
        disabled={disabled}
        onChange={(value) => patchPayload({ proofPacksConfirmed: value })}
      />
    </div>
  );
}

function renderActivationReviewEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextField
        label="Owner go-live"
        value={readString(payload, "goLiveOwner")}
        disabled={disabled}
        onChange={(value) => patchPayload({ goLiveOwner: value })}
      />
      <CheckboxField
        label="Revue approuvee"
        checked={readBoolean(payload, "approvalGranted")}
        disabled={disabled}
        onChange={(value) => patchPayload({ approvalGranted: value })}
      />
      <CheckboxField
        label="Plan de rollback pret"
        checked={readBoolean(payload, "rollbackPlanReady")}
        disabled={disabled}
        onChange={(value) => patchPayload({ rollbackPlanReady: value })}
      />
      <CheckboxField
        label="Monitoring hypercare pret"
        checked={readBoolean(payload, "monitoringPlanReady")}
        disabled={disabled}
        onChange={(value) => patchPayload({ monitoringPlanReady: value })}
      />
    </div>
  );
}

function renderExecuteActivationEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextField
        label="Fenetre d'activation"
        value={readString(payload, "activationWindow")}
        disabled={disabled}
        onChange={(value) => patchPayload({ activationWindow: value })}
      />
      <TextField
        label="Active par"
        value={readString(payload, "activatedBy")}
        disabled={disabled}
        onChange={(value) => patchPayload({ activatedBy: value })}
      />
      <CheckboxField
        label="Smoke checks passes"
        checked={readBoolean(payload, "smokeCheckPassed")}
        disabled={disabled}
        onChange={(value) => patchPayload({ smokeCheckPassed: value })}
      />
    </div>
  );
}

function renderCloseHypercareEditor(props: TaskActionEditorProps) {
  const { payload, patchPayload, disabled } = props;
  return (
    <div className="grid gap-3">
      <TextAreaField
        label="Synthese de stabilisation"
        value={readString(payload, "closeSummary")}
        disabled={disabled}
        onChange={(value) => patchPayload({ closeSummary: value })}
      />
      <CheckboxField
        label="Incidents clos"
        checked={readBoolean(payload, "incidentsClosed")}
        disabled={disabled}
        onChange={(value) => patchPayload({ incidentsClosed: value })}
      />
      <CheckboxField
        label="Sign-off client recu"
        checked={readBoolean(payload, "clientSignoffReceived")}
        disabled={disabled}
        onChange={(value) => patchPayload({ clientSignoffReceived: value })}
      />
    </div>
  );
}

function renderAccessModelEditor(props: TaskActionEditorProps) {
  return (
    <AccessModelTaskFields
      payload={props.payload}
      disabled={props.disabled}
      hierarchy={props.hierarchy ?? []}
      onChange={props.patchPayload}
    />
  );
}

const TASK_ACTION_EDITORS: Record<string, TaskEditorRenderer> = {
  "scope-contract": renderScopeContractEditor,
  "access-model": renderAccessModelEditor,
  "source-strategy": renderSourceStrategyEditor,
  "activate-api-sources": renderActivateApiSourcesEditor,
  "configure-file-sources": renderConfigureFileSourcesEditor,
  "publish-mappings": renderPublishMappingsEditor,
  "configure-product-scope": renderConfigureProductScopeEditor,
  "activation-review": renderActivationReviewEditor,
  "execute-activation": renderExecuteActivationEditor,
  "close-hypercare": renderCloseHypercareEditor,
};

export function TaskActionEditor({
  taskKey,
  payload,
  patchPayload,
  disabled,
  hierarchy = [],
  integrationOptions = [],
}: TaskActionEditorProps) {
  const editor = TASK_ACTION_EDITORS[taskKey];
  if (!editor) {
    return null;
  }

  return editor({
    taskKey,
    payload,
    patchPayload,
    disabled,
    hierarchy,
    integrationOptions,
  });
}
