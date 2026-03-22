"use client";

import type { OnboardingSourceActivation } from "@praedixa/shared-types/api";

import { TextField } from "./task-action-form-fields";

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

export function readSourceActivationsFromPayload(
  payload: Record<string, unknown>,
): OnboardingSourceActivation[] {
  const rawValue = payload["sourceActivations"];
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.filter((entry): entry is OnboardingSourceActivation =>
    Boolean(entry && typeof entry === "object"),
  );
}

function statusTone(status: OnboardingSourceActivation["status"]): string {
  if (status === "ready") {
    return "text-emerald-700";
  }
  if (status === "failed") {
    return "text-rose-700";
  }
  if (status === "processing") {
    return "text-amber-700";
  }
  return "text-ink-tertiary";
}

type SourceActivationSummaryListProps = {
  payload: Record<string, unknown>;
  emptyMessage: string;
};

export function SourceActivationSummaryList(
  props: Readonly<SourceActivationSummaryListProps>,
) {
  const activations = readSourceActivationsFromPayload(props.payload);
  if (activations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-ink-tertiary">
        {props.emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activations.map((activation) => (
        <div
          key={activation.id}
          className="rounded-lg border border-border bg-surface-sunken/50 px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-ink">{activation.label}</span>
            <span className={statusTone(activation.status)}>
              {activation.status}
            </span>
          </div>
          <p className="mt-1 text-ink-tertiary">
            {activation.sourceMode} · {activation.domain} ·{" "}
            {activation.datasetKey}
          </p>
          {"fileName" in activation ? (
            <p className="mt-1 text-ink-tertiary">
              {activation.fileName} · {activation.fileFormat}
            </p>
          ) : (
            <p className="mt-1 text-ink-tertiary">
              {activation.displayName} · {activation.vendor}
            </p>
          )}
          {activation.lastError ? (
            <p className="mt-1 text-rose-700">{activation.lastError}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

type FileSourceDraftFieldsProps = {
  payload: Record<string, unknown>;
  disabled: boolean;
  onChange: (next: Partial<Record<string, unknown>>) => void;
};

export function FileSourceDraftFields(
  props: Readonly<FileSourceDraftFieldsProps>,
) {
  const payload = props.payload;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField
        label="Libelle de la source"
        value={readString(payload, "sourceLabel")}
        disabled={props.disabled}
        onChange={(value) => props.onChange({ sourceLabel: value })}
      />
      <TextField
        label="Domaine"
        value={readString(payload, "sourceDomain")}
        disabled={props.disabled}
        placeholder="planning"
        onChange={(value) => props.onChange({ sourceDomain: value })}
      />
      <TextField
        label="Cle du jeu de donnees"
        value={readString(payload, "datasetKey")}
        disabled={props.disabled}
        placeholder="planning_shifts"
        onChange={(value) => props.onChange({ datasetKey: value })}
      />
      <TextField
        label="Profil d'import"
        value={readString(payload, "importProfile")}
        disabled={props.disabled}
        onChange={(value) => props.onChange({ importProfile: value })}
      />
    </div>
  );
}

type ApiActivationDraftFieldsProps = {
  payload: Record<string, unknown>;
  disabled: boolean;
  onChange: (next: Partial<Record<string, unknown>>) => void;
  options: Array<{ value: string; label: string }>;
};

export function ApiActivationDraftFields(
  props: Readonly<ApiActivationDraftFieldsProps>,
) {
  return (
    <div className="grid gap-3">
      <label className="space-y-1 text-xs text-ink-tertiary">
        <span>Connexion API</span>
        <select
          value={readString(props.payload, "connectionId")}
          disabled={props.disabled}
          onChange={(event) =>
            props.onChange({ connectionId: event.target.value })
          }
          className="min-h-[40px] w-full rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-surface-sunken"
        >
          <option value="">Selectionner une connexion</option>
          {props.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
