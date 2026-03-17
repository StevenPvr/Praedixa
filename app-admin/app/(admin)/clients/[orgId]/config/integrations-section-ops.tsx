"use client";

import type { PropsWithChildren } from "react";
import { Button } from "@praedixa/ui";

import { formatDateTime } from "./config-operations";
import type {
  IntegrationConnection,
  IntegrationConnectionTestResult,
  IntegrationSyncTrigger,
} from "./config-types";

function SelectField({
  label,
  value,
  onChange,
  disabled = false,
  children,
}: PropsWithChildren<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function DateTimeField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function IntegrationSelectionForm({
  connections,
  effectiveIntegrationId,
  ingestCredentialLabel,
  canManageIntegrations,
  onSelect,
  onLabelChange,
}: {
  connections: IntegrationConnection[];
  effectiveIntegrationId: string | null;
  ingestCredentialLabel: string;
  canManageIntegrations: boolean;
  onSelect: (value: string | null) => void;
  onLabelChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
      <SelectField
        label="Connexion active"
        value={effectiveIntegrationId ?? ""}
        onChange={(value) => onSelect(value || null)}
      >
        {connections.map((connection) => (
          <option key={connection.id} value={connection.id}>
            {connection.displayName} · {connection.vendor}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Label de la cle"
        value={ingestCredentialLabel}
        disabled={!canManageIntegrations}
        onChange={onLabelChange}
      />
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

export function IntegrationStatusCards({
  connection,
}: {
  connection: IntegrationConnection | null;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StatusCard
        label="Etat d'autorisation"
        value={connection?.authorizationState ?? "-"}
      />
      <StatusCard
        label="Dernier succes sync"
        value={formatDateTime(connection?.lastSuccessfulSyncAt)}
      />
      <StatusCard
        label="Prochaine sync planifiee"
        value={formatDateTime(connection?.nextScheduledSyncAt)}
      />
    </div>
  );
}

function SyncWindowFields({
  syncTriggerType,
  syncWindowStartInput,
  syncWindowEndInput,
  canManageIntegrations,
  onTriggerChange,
  onStartChange,
  onEndChange,
}: {
  syncTriggerType: IntegrationSyncTrigger;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  canManageIntegrations: boolean;
  onTriggerChange: (value: IntegrationSyncTrigger) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)]">
      <SelectField
        label="Trigger"
        value={syncTriggerType}
        onChange={(value) => onTriggerChange(value as IntegrationSyncTrigger)}
        disabled={!canManageIntegrations}
      >
        <option value="manual">manual</option>
        <option value="replay">replay</option>
        <option value="backfill">backfill</option>
      </SelectField>
      <DateTimeField
        label="Fenetre source debut"
        value={syncWindowStartInput}
        disabled={!canManageIntegrations}
        onChange={onStartChange}
      />
      <DateTimeField
        label="Fenetre source fin"
        value={syncWindowEndInput}
        disabled={!canManageIntegrations}
        onChange={onEndChange}
      />
    </div>
  );
}

function IntegrationActionButtons({
  syncTriggerType,
  syncForceFull,
  canManageIntegrations,
  actionLoading,
  effectiveIntegrationId,
  onSyncForceFullChange,
  onTestConnection,
  onTriggerSync,
}: {
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  onSyncForceFullChange: (value: boolean) => void;
  onTestConnection: () => void;
  onTriggerSync: () => void;
}) {
  const disabled =
    !canManageIntegrations || !effectiveIntegrationId || actionLoading != null;

  return (
    <>
      <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={syncForceFull}
          onChange={(event) => onSyncForceFullChange(event.target.checked)}
          disabled={!canManageIntegrations}
        />
        Forcer une full sync sur ce run
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onTestConnection}
          disabled={disabled}
        >
          Tester la connexion
        </Button>
        <Button type="button" onClick={onTriggerSync} disabled={disabled}>
          Lancer {syncTriggerType}
        </Button>
      </div>
    </>
  );
}

function ConnectionTestSummary({
  connectionTestResult,
}: {
  connectionTestResult: IntegrationConnectionTestResult | null;
}) {
  if (!connectionTestResult) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-ink-secondary">
      <p className="font-medium text-ink">
        Dernier test: {connectionTestResult.ok ? "ok" : "en erreur"} ·{" "}
        {connectionTestResult.latencyMs} ms
      </p>
      <p>
        Scopes verifies:{" "}
        {connectionTestResult.checkedScopes.length > 0
          ? connectionTestResult.checkedScopes.join(", ")
          : "-"}
      </p>
      {connectionTestResult.warnings.length > 0 ? (
        <p>Warnings: {connectionTestResult.warnings.join(", ")}</p>
      ) : null}
    </div>
  );
}

type IntegrationOperationsPanelProps = {
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  connectionTestResult: IntegrationConnectionTestResult | null;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  onTriggerChange: (value: IntegrationSyncTrigger) => void;
  onSyncForceFullChange: (value: boolean) => void;
  onSyncWindowStartChange: (value: string) => void;
  onSyncWindowEndChange: (value: string) => void;
  onTestConnection: () => void;
  onTriggerSync: () => void;
};

function IntegrationOperationsIntro() {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-ink">Operations connecteur</p>
      <p className="text-xs text-ink-tertiary">
        Teste la connexion et declenche `manual`, `replay` ou `backfill` sans
        passer par les scripts runtime.
      </p>
    </div>
  );
}

export function IntegrationOperationsPanel({
  syncTriggerType,
  syncForceFull,
  syncWindowStartInput,
  syncWindowEndInput,
  connectionTestResult,
  canManageIntegrations,
  actionLoading,
  effectiveIntegrationId,
  onTriggerChange,
  onSyncForceFullChange,
  onSyncWindowStartChange,
  onSyncWindowEndChange,
  onTestConnection,
  onTriggerSync,
}: IntegrationOperationsPanelProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4">
      <IntegrationOperationsIntro />
      <SyncWindowFields
        syncTriggerType={syncTriggerType}
        syncWindowStartInput={syncWindowStartInput}
        syncWindowEndInput={syncWindowEndInput}
        canManageIntegrations={canManageIntegrations}
        onTriggerChange={onTriggerChange}
        onStartChange={onSyncWindowStartChange}
        onEndChange={onSyncWindowEndChange}
      />
      <IntegrationActionButtons
        syncTriggerType={syncTriggerType}
        syncForceFull={syncForceFull}
        canManageIntegrations={canManageIntegrations}
        actionLoading={actionLoading}
        effectiveIntegrationId={effectiveIntegrationId}
        onSyncForceFullChange={onSyncForceFullChange}
        onTestConnection={onTestConnection}
        onTriggerSync={onTriggerSync}
      />
      <ConnectionTestSummary connectionTestResult={connectionTestResult} />
    </div>
  );
}
