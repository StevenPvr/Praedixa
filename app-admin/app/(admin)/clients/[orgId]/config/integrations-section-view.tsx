"use client";

import { Card, CardContent } from "@praedixa/ui";

import { ConfigReadonlyNotice } from "./config-readonly-notice";
import {
  IntegrationCreateForm,
  IntegrationOperationsPanel,
  IntegrationSelectionForm,
  IntegrationStatusCards,
} from "./integrations-section-ops";
import {
  ConnectionsTable,
  IntegrationDataPanels,
  type AsyncTableState,
} from "./integrations-section-tables";
import type {
  IntegrationCatalogItem,
  IntegrationConnection,
  IntegrationConnectionTestResult,
  IntegrationIssueIngestCredentialResult,
  IntegrationRawEvent,
  IntegrationSyncRun,
  IntegrationSyncTrigger,
} from "./config-types";

type IntegrationCredentialTableState = AsyncTableState<
  IntegrationIssueIngestCredentialResult["credential"]
>;

interface IntegrationsContentProps {
  catalog: IntegrationCatalogItem[];
  connections: IntegrationConnection[];
  activeConnection: IntegrationConnection | null;
  effectiveIntegrationId: string | null;
  createVendor: string;
  createDisplayName: string;
  createAuthMode: string;
  createSourceObjectsInput: string;
  createRuntimeEnvironment: "production" | "sandbox";
  createBaseUrlInput: string;
  createConfigJsonInput: string;
  createCredentialsJsonInput: string;
  ingestCredentialLabel: string;
  issuedCredential: IntegrationIssueIngestCredentialResult | null;
  connectionTestResult: IntegrationConnectionTestResult | null;
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  syncRuns: AsyncTableState<IntegrationSyncRun>;
  credentials: IntegrationCredentialTableState;
  rawEvents: AsyncTableState<IntegrationRawEvent>;
  onSelectIntegration: (value: string | null) => void;
  onCreateVendorChange: (value: string) => void;
  onCreateDisplayNameChange: (value: string) => void;
  onCreateAuthModeChange: (value: string) => void;
  onCreateSourceObjectsInputChange: (value: string) => void;
  onCreateRuntimeEnvironmentChange: (value: "production" | "sandbox") => void;
  onCreateBaseUrlInputChange: (value: string) => void;
  onCreateConfigJsonInputChange: (value: string) => void;
  onCreateCredentialsJsonInputChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onTriggerChange: (value: IntegrationSyncTrigger) => void;
  onSyncForceFullChange: (value: boolean) => void;
  onSyncWindowStartChange: (value: string) => void;
  onSyncWindowEndChange: (value: string) => void;
  onIssueCredential: () => void;
  onCreateConnection: () => void;
  onTestConnection: () => void;
  onTriggerSync: () => void;
  onRevokeCredential: (credentialId: string) => void;
}

type CredentialSummaryLinesProps = {
  issuedCredential: IntegrationIssueIngestCredentialResult;
};

type IssuedCredentialPanelProps = {
  issuedCredential: IntegrationIssueIngestCredentialResult | null;
};

function CredentialSummaryLines(props: Readonly<CredentialSummaryLinesProps>) {
  const { issuedCredential } = props;
  return (
    <div className="space-y-1 text-xs text-ink-secondary">
      <p>
        URL:{" "}
        <span className="font-mono text-ink">{issuedCredential.ingestUrl}</span>
      </p>
      <p>
        Auth:{" "}
        <span className="font-mono text-ink">
          {issuedCredential.authScheme} {issuedCredential.apiKey}
        </span>
      </p>
      {issuedCredential.signingSecret ? (
        <p>
          Secret signature:{" "}
          <span className="font-mono text-ink">
            {issuedCredential.signingSecret}
          </span>
        </p>
      ) : null}
      {issuedCredential.signature ? (
        <p>
          Headers HMAC:{" "}
          <span className="font-mono text-ink">
            {issuedCredential.signature.keyIdHeader},{" "}
            {issuedCredential.signature.timestampHeader},{" "}
            {issuedCredential.signature.signatureHeader}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function IssuedCredentialPanel(props: Readonly<IssuedCredentialPanelProps>) {
  const { issuedCredential } = props;
  const hasIssuedCredential = issuedCredential != null;
  if (!hasIssuedCredential) return null;

  return (
    <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-medium text-ink">
        Credential pack a transmettre au client
      </p>
      <p className="text-xs text-ink-tertiary">
        Ces secrets ne sont affiches qu'apres emission. Ils doivent etre copies
        dans le CRM/WFM/iPaaS du client.
      </p>
      <CredentialSummaryLines issuedCredential={issuedCredential} />
    </div>
  );
}

function IntegrationsCardBody(props: Readonly<IntegrationsContentProps>) {
  const isReadonlyIntegrations = props.canManageIntegrations === false;

  return (
    <div className="space-y-4">
      {isReadonlyIntegrations ? (
        <ConfigReadonlyNotice
          message="Mode lecture seule pour les operations connecteurs. Permission requise:"
          permission="admin:integrations:write"
        />
      ) : null}
      <ConnectionsTable connections={props.connections} />
      <IntegrationCreateForm
        catalog={props.catalog}
        createVendor={props.createVendor}
        createDisplayName={props.createDisplayName}
        createAuthMode={props.createAuthMode}
        createSourceObjectsInput={props.createSourceObjectsInput}
        createRuntimeEnvironment={props.createRuntimeEnvironment}
        createBaseUrlInput={props.createBaseUrlInput}
        createConfigJsonInput={props.createConfigJsonInput}
        createCredentialsJsonInput={props.createCredentialsJsonInput}
        canManageIntegrations={props.canManageIntegrations}
        actionLoading={props.actionLoading}
        onCreateVendorChange={props.onCreateVendorChange}
        onCreateDisplayNameChange={props.onCreateDisplayNameChange}
        onCreateAuthModeChange={props.onCreateAuthModeChange}
        onCreateSourceObjectsInputChange={
          props.onCreateSourceObjectsInputChange
        }
        onCreateRuntimeEnvironmentChange={
          props.onCreateRuntimeEnvironmentChange
        }
        onCreateBaseUrlInputChange={props.onCreateBaseUrlInputChange}
        onCreateConfigJsonInputChange={props.onCreateConfigJsonInputChange}
        onCreateCredentialsJsonInputChange={
          props.onCreateCredentialsJsonInputChange
        }
        onCreateConnection={props.onCreateConnection}
      />
      <IntegrationSelectionForm
        connections={props.connections}
        effectiveIntegrationId={props.effectiveIntegrationId}
        ingestCredentialLabel={props.ingestCredentialLabel}
        canManageIntegrations={props.canManageIntegrations}
        onSelect={props.onSelectIntegration}
        onLabelChange={props.onLabelChange}
      />
      <IntegrationStatusCards connection={props.activeConnection} />
      <IntegrationOperationsPanel
        syncTriggerType={props.syncTriggerType}
        syncForceFull={props.syncForceFull}
        syncWindowStartInput={props.syncWindowStartInput}
        syncWindowEndInput={props.syncWindowEndInput}
        connectionTestResult={props.connectionTestResult}
        canManageIntegrations={props.canManageIntegrations}
        actionLoading={props.actionLoading}
        effectiveIntegrationId={props.effectiveIntegrationId}
        onTriggerChange={props.onTriggerChange}
        onSyncForceFullChange={props.onSyncForceFullChange}
        onSyncWindowStartChange={props.onSyncWindowStartChange}
        onSyncWindowEndChange={props.onSyncWindowEndChange}
        onTestConnection={props.onTestConnection}
        onTriggerSync={props.onTriggerSync}
      />
      <IssuedCredentialPanel issuedCredential={props.issuedCredential} />
      <IntegrationDataPanels
        canManageIntegrations={props.canManageIntegrations}
        actionLoading={props.actionLoading}
        effectiveIntegrationId={props.effectiveIntegrationId}
        syncRuns={props.syncRuns}
        credentials={props.credentials}
        rawEvents={props.rawEvents}
        onIssueCredential={props.onIssueCredential}
        onRevokeCredential={props.onRevokeCredential}
      />
    </div>
  );
}

export function IntegrationsContent(props: Readonly<IntegrationsContentProps>) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <IntegrationsCardBody {...props} />
      </CardContent>
    </Card>
  );
}
