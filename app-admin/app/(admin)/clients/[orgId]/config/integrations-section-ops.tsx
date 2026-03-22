"use client";

import type { PropsWithChildren } from "react";
import { Button } from "@praedixa/ui";

import { formatDateTime } from "./config-operations";
import type {
  IntegrationCatalogItem,
  IntegrationConnection,
  IntegrationConnectionTestResult,
  IntegrationSyncTrigger,
} from "./config-types";

const CONTROL_CLASSNAME =
  "h-10 w-full rounded-lg border border-border px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

type FieldShellProps = PropsWithChildren<{
  label: string;
}>;

type SelectFieldProps = PropsWithChildren<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}>;

type InputFieldProps = {
  label: string;
  type?: "text" | "datetime-local";
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  background?: "surface" | "card";
};

type TextAreaFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  rows?: number;
};

type IntegrationCreateFormProps = {
  catalog: IntegrationCatalogItem[];
  createVendor: string;
  createDisplayName: string;
  createAuthMode: string;
  createSourceObjectsInput: string;
  createRuntimeEnvironment: "production" | "sandbox";
  createBaseUrlInput: string;
  createConfigJsonInput: string;
  createCredentialsJsonInput: string;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  onCreateVendorChange: (value: string) => void;
  onCreateDisplayNameChange: (value: string) => void;
  onCreateAuthModeChange: (value: string) => void;
  onCreateSourceObjectsInputChange: (value: string) => void;
  onCreateRuntimeEnvironmentChange: (value: "production" | "sandbox") => void;
  onCreateBaseUrlInputChange: (value: string) => void;
  onCreateConfigJsonInputChange: (value: string) => void;
  onCreateCredentialsJsonInputChange: (value: string) => void;
  onCreateConnection: () => void;
};

type IntegrationSelectionFormProps = {
  connections: IntegrationConnection[];
  effectiveIntegrationId: string | null;
  ingestCredentialLabel: string;
  canManageIntegrations: boolean;
  onSelect: (value: string | null) => void;
  onLabelChange: (value: string) => void;
};

type StatusCardProps = {
  label: string;
  value: string;
};

type IntegrationStatusCardsProps = {
  connection: IntegrationConnection | null;
};

type SyncWindowFieldsProps = {
  syncTriggerType: IntegrationSyncTrigger;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  canManageIntegrations: boolean;
  onTriggerChange: (value: IntegrationSyncTrigger) => void;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
};

type IntegrationActionButtonsProps = {
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  effectiveIntegrationId: string | null;
  onSyncForceFullChange: (value: boolean) => void;
  onTestConnection: () => void;
  onTriggerSync: () => void;
};

type ConnectionTestSummaryProps = {
  connectionTestResult: IntegrationConnectionTestResult | null;
};

function FieldShell(props: Readonly<FieldShellProps>) {
  const { label, children } = props;
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function SelectField(props: Readonly<SelectFieldProps>) {
  const { label, value, onChange, disabled = false, children } = props;
  return (
    <FieldShell label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${CONTROL_CLASSNAME} bg-surface`}
      >
        {children}
      </select>
    </FieldShell>
  );
}

function InputField(props: Readonly<InputFieldProps>) {
  const {
    label,
    type = "text",
    value,
    onChange,
    disabled,
    background = "surface",
  } = props;
  return (
    <FieldShell label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`${CONTROL_CLASSNAME} ${
          background === "card" ? "bg-card" : "bg-surface"
        }`}
      />
    </FieldShell>
  );
}

function TextAreaField(props: Readonly<TextAreaFieldProps>) {
  const { label, value, onChange, disabled, rows = 5 } = props;
  return (
    <FieldShell label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        rows={rows}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </FieldShell>
  );
}

function selectedCatalogItem(
  catalog: IntegrationCatalogItem[],
  createVendor: string,
): IntegrationCatalogItem | null {
  return catalog.find((item) => item.vendor === createVendor) ?? null;
}

export function IntegrationCreateForm(
  props: Readonly<IntegrationCreateFormProps>,
) {
  const {
    catalog,
    createVendor,
    createDisplayName,
    createAuthMode,
    createSourceObjectsInput,
    createRuntimeEnvironment,
    createBaseUrlInput,
    createConfigJsonInput,
    createCredentialsJsonInput,
    canManageIntegrations,
    actionLoading,
    onCreateVendorChange,
    onCreateDisplayNameChange,
    onCreateAuthModeChange,
    onCreateSourceObjectsInputChange,
    onCreateRuntimeEnvironmentChange,
    onCreateBaseUrlInputChange,
    onCreateConfigJsonInputChange,
    onCreateCredentialsJsonInputChange,
    onCreateConnection,
  } = props;
  const isReadonlyIntegrations = canManageIntegrations === false;
  const catalogItem = selectedCatalogItem(catalog, createVendor);
  const canCreate = !isReadonlyIntegrations && actionLoading == null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface px-4 py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-ink">Creer une source client</p>
        <p className="text-xs text-ink-tertiary">
          Cree une connexion generique ou vendor-specifique gouvernee par
          l&apos;admin. Pour les imports tabulaires a grande echelle, utilise
          `custom_data` avec un mapping par `sourceObject`.
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <SelectField
          label="Type de source"
          value={createVendor}
          onChange={onCreateVendorChange}
          disabled={isReadonlyIntegrations}
        >
          {catalog.map((item) => (
            <option key={item.vendor} value={item.vendor}>
              {item.label} · {item.vendor}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Mode d'authentification"
          value={createAuthMode}
          onChange={onCreateAuthModeChange}
          disabled={isReadonlyIntegrations}
        >
          {(catalogItem?.authModes ?? []).map((authMode) => (
            <option key={authMode} value={authMode}>
              {authMode}
            </option>
          ))}
        </SelectField>
        <InputField
          label="Nom de la source"
          value={createDisplayName}
          disabled={isReadonlyIntegrations}
          onChange={onCreateDisplayNameChange}
        />
        <SelectField
          label="Environnement runtime"
          value={createRuntimeEnvironment}
          onChange={(value) =>
            onCreateRuntimeEnvironmentChange(value as "production" | "sandbox")
          }
          disabled={isReadonlyIntegrations}
        >
          <option value="production">production</option>
          <option value="sandbox">sandbox</option>
        </SelectField>
        <InputField
          label="Base URL optionnelle"
          value={createBaseUrlInput}
          disabled={isReadonlyIntegrations}
          onChange={onCreateBaseUrlInputChange}
        />
      </div>
      <TextAreaField
        label="Source objects (un par ligne ou separes par virgule)"
        value={createSourceObjectsInput}
        disabled={isReadonlyIntegrations}
        rows={3}
        onChange={onCreateSourceObjectsInputChange}
      />
      <div className="grid gap-3 lg:grid-cols-2">
        <TextAreaField
          label="Config JSON"
          value={createConfigJsonInput}
          disabled={isReadonlyIntegrations}
          onChange={onCreateConfigJsonInputChange}
        />
        <TextAreaField
          label="Credentials JSON"
          value={createCredentialsJsonInput}
          disabled={isReadonlyIntegrations}
          onChange={onCreateCredentialsJsonInputChange}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onCreateConnection}
          disabled={!canCreate}
        >
          Creer la source
        </Button>
      </div>
    </div>
  );
}

export function IntegrationSelectionForm(
  props: Readonly<IntegrationSelectionFormProps>,
) {
  const {
    connections,
    effectiveIntegrationId,
    ingestCredentialLabel,
    canManageIntegrations,
    onSelect,
    onLabelChange,
  } = props;
  const isReadonlyIntegrations = canManageIntegrations === false;

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
      <InputField
        label="Label de la cle"
        value={ingestCredentialLabel}
        disabled={isReadonlyIntegrations}
        onChange={onLabelChange}
      />
    </div>
  );
}

function StatusCard(props: Readonly<StatusCardProps>) {
  const { label, value } = props;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

export function IntegrationStatusCards(
  props: Readonly<IntegrationStatusCardsProps>,
) {
  const { connection } = props;
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

function SyncWindowFields(props: Readonly<SyncWindowFieldsProps>) {
  const {
    syncTriggerType,
    syncWindowStartInput,
    syncWindowEndInput,
    canManageIntegrations,
    onTriggerChange,
    onStartChange,
    onEndChange,
  } = props;
  const isReadonlyIntegrations = canManageIntegrations === false;

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_minmax(0,1fr)]">
      <SelectField
        label="Trigger"
        value={syncTriggerType}
        onChange={(value) => onTriggerChange(value as IntegrationSyncTrigger)}
        disabled={isReadonlyIntegrations}
      >
        <option value="manual">manual</option>
        <option value="replay">replay</option>
        <option value="backfill">backfill</option>
      </SelectField>
      <InputField
        label="Fenetre source debut"
        type="datetime-local"
        value={syncWindowStartInput}
        disabled={isReadonlyIntegrations}
        background="card"
        onChange={onStartChange}
      />
      <InputField
        label="Fenetre source fin"
        type="datetime-local"
        value={syncWindowEndInput}
        disabled={isReadonlyIntegrations}
        background="card"
        onChange={onEndChange}
      />
    </div>
  );
}

function IntegrationActionButtons(
  props: Readonly<IntegrationActionButtonsProps>,
) {
  const {
    syncTriggerType,
    syncForceFull,
    canManageIntegrations,
    actionLoading,
    effectiveIntegrationId,
    onSyncForceFullChange,
    onTestConnection,
    onTriggerSync,
  } = props;
  const hasEffectiveIntegration = effectiveIntegrationId != null;
  const isActionIdle = actionLoading == null;
  const canTriggerAction =
    canManageIntegrations && hasEffectiveIntegration && isActionIdle;
  const isReadonlyIntegrations = canManageIntegrations === false;

  return (
    <>
      <label className="inline-flex items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={syncForceFull}
          onChange={(event) => onSyncForceFullChange(event.target.checked)}
          disabled={isReadonlyIntegrations}
        />
        <span>Forcer une full sync sur ce run</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onTestConnection}
          disabled={!canTriggerAction}
        >
          Tester la connexion
        </Button>
        <Button
          type="button"
          onClick={onTriggerSync}
          disabled={!canTriggerAction}
        >
          Lancer {syncTriggerType}
        </Button>
      </div>
    </>
  );
}

function ConnectionTestSummary(props: Readonly<ConnectionTestSummaryProps>) {
  const { connectionTestResult } = props;
  const hasConnectionTestResult = connectionTestResult != null;
  if (!hasConnectionTestResult) return null;

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

export function IntegrationOperationsPanel(
  props: Readonly<IntegrationOperationsPanelProps>,
) {
  const {
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
  } = props;
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
