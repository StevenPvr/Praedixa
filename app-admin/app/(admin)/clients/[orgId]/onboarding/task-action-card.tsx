"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OnboardingCaseTask } from "@praedixa/shared-types/api";
import { Button } from "@praedixa/ui";

import type { SiteHierarchy } from "../client-context";
import {
  AccessModelTaskFields,
  hasPendingAccessInvites,
} from "./access-model-task-fields";
import { taskSurfaceLink } from "./page-model";

type TaskActionCardProps = {
  orgId: string;
  hierarchy: SiteHierarchy[];
  task: OnboardingCaseTask;
  actionable: boolean;
  saving: boolean;
  completing: boolean;
  sendingInvites: boolean;
  canSendSecureInvites: boolean;
  onSaveTask: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  onCompleteTask: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
  onSendSecureInvites: (
    taskId: string,
    payloadJson: Record<string, unknown>,
    note: string | null,
  ) => Promise<void>;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "string" ? payload[key] : "";
}

function readBoolean(payload: Record<string, unknown>, key: string): boolean {
  return payload[key] === true;
}

function readStringList(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (!Array.isArray(value)) {
    return "";
  }
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .join("\n");
}

function readNumber(payload: Record<string, unknown>, key: string): string {
  return typeof payload[key] === "number" ? String(payload[key]) : "";
}

function toListValue(value: string): string[] {
  return value
    .split(/\n|,/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function CheckboxField(props: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-secondary">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.checked)}
      />
      <span>{props.label}</span>
    </label>
  );
}

function TextField(props: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <input
        type="text"
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      />
    </label>
  );
}

function TextAreaField(props: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <textarea
        value={props.value}
        disabled={props.disabled}
        placeholder={props.placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[88px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  disabled?: boolean;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-ink-tertiary">
      <span>{props.label}</span>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value)}
        className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
      >
        <option value="">Selectionner</option>
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TaskActionCard({
  orgId,
  hierarchy,
  task,
  actionable,
  saving,
  completing,
  sendingInvites,
  canSendSecureInvites,
  onSaveTask,
  onCompleteTask,
  onSendSecureInvites,
}: TaskActionCardProps) {
  const [note, setNote] = useState("");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const surfaceLink = taskSurfaceLink(orgId, task.taskKey);
  const disabled = task.status === "done";

  useEffect(() => {
    const draftPayload = asRecord(task.detailsJson.draftPayload);
    const completionPayload = asRecord(task.detailsJson.completionPayload);
    setPayload(
      Object.keys(draftPayload).length > 0 ? draftPayload : completionPayload,
    );
    setNote(
      typeof task.detailsJson.lastDraftNote === "string"
        ? task.detailsJson.lastDraftNote
        : "",
    );
  }, [task.id, task.detailsJson]);

  function patchPayload(next: Partial<Record<string, unknown>>) {
    setPayload((current) => ({ ...current, ...next }));
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-ink">{task.title}</p>
          <p className="mt-1 text-xs text-ink-tertiary">
            {task.taskType} - {task.status}
          </p>
        </div>
        {surfaceLink ? (
          <Link
            href={surfaceLink.href}
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            {surfaceLink.label}
          </Link>
        ) : null}
      </div>

      {renderTaskFields(
        task.taskKey,
        payload,
        patchPayload,
        disabled,
        hierarchy,
      )}

      <TextAreaField
        label="Note operateur"
        value={note}
        disabled={disabled}
        placeholder="Contexte, preuve, points d'attention..."
        onChange={setNote}
      />

      <div className="flex flex-wrap items-center gap-2">
        {task.taskKey === "access-model" ? (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={
                disabled ||
                sendingInvites ||
                !canSendSecureInvites ||
                !hasPendingAccessInvites(payload)
              }
              onClick={() =>
                void onSendSecureInvites(task.id, payload, note || null)
              }
            >
              {sendingInvites ? "Envoi..." : "Envoyer invitations securisees"}
            </Button>
            {!canSendSecureInvites ? (
              <span className="text-xs text-ink-tertiary">
                Les invitations securisees exigent `admin:users:write`.
              </span>
            ) : null}
          </>
        ) : null}
        <Button
          size="sm"
          variant="outline"
          disabled={disabled || saving}
          onClick={() => void onSaveTask(task.id, payload, note || null)}
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
        <Button
          size="sm"
          disabled={disabled || completing || !actionable}
          onClick={() => void onCompleteTask(task.id, payload, note || null)}
        >
          {completing ? "Traitement..." : "Completer"}
        </Button>
        {!actionable && !disabled ? (
          <span className="text-xs text-ink-tertiary">
            Cette tache deviendra completable quand Camunda la rendra active.
          </span>
        ) : null}
      </div>

      {typeof task.detailsJson.lastSavedAt === "string" ? (
        <p className="text-xs text-ink-tertiary">
          Brouillon enregistre le{" "}
          {new Date(task.detailsJson.lastSavedAt).toLocaleString("fr-FR")}
        </p>
      ) : null}
    </div>
  );
}

function renderTaskFields(
  taskKey: string,
  payload: Record<string, unknown>,
  patchPayload: (next: Partial<Record<string, unknown>>) => void,
  disabled: boolean,
  hierarchy: SiteHierarchy[] = [],
) {
  switch (taskKey) {
    case "scope-contract":
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
    case "access-model":
      return (
        <AccessModelTaskFields
          payload={payload}
          disabled={disabled}
          hierarchy={hierarchy}
          onChange={patchPayload}
        />
      );
    case "source-strategy":
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
    case "activate-api-sources":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Connection ID"
            value={readString(payload, "connectionId")}
            disabled={disabled}
            onChange={(value) => patchPayload({ connectionId: value })}
          />
          <SelectField
            label="Probe"
            value={readString(payload, "probeStatus")}
            disabled={disabled}
            options={[
              { value: "pending", label: "En attente" },
              { value: "success", label: "OK" },
              { value: "warning", label: "Warning" },
              { value: "failed", label: "Failed" },
            ]}
            onChange={(value) => patchPayload({ probeStatus: value })}
          />
          <SelectField
            label="First sync"
            value={readString(payload, "syncStatus")}
            disabled={disabled}
            options={[
              { value: "pending", label: "En attente" },
              { value: "success", label: "OK" },
              { value: "warning", label: "Warning" },
              { value: "failed", label: "Failed" },
            ]}
            onChange={(value) => patchPayload({ syncStatus: value })}
          />
          <CheckboxField
            label="Datasets verifies"
            checked={readBoolean(payload, "datasetsValidated")}
            disabled={disabled}
            onChange={(value) => patchPayload({ datasetsValidated: value })}
          />
        </div>
      );
    case "configure-file-sources":
      return (
        <div className="grid gap-3">
          <TextField
            label="Profil d'import"
            value={readString(payload, "importProfile")}
            disabled={disabled}
            onChange={(value) => patchPayload({ importProfile: value })}
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
            onChange={(value) =>
              patchPayload({ mappingPreviewValidated: value })
            }
          />
        </div>
      );
    case "publish-mappings":
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
                coveragePercent:
                  value.trim().length === 0 ? null : Number(value),
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
    case "configure-product-scope":
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
    case "activation-review":
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
    case "execute-activation":
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
    case "close-hypercare":
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
    default:
      return null;
  }
}
