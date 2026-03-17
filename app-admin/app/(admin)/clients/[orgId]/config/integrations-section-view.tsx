"use client";

import { Card, CardContent } from "@praedixa/ui";

import { ConfigReadonlyNotice } from "./config-readonly-notice";
import {
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
  IntegrationConnection,
  IntegrationConnectionTestResult,
  IntegrationIssueIngestCredentialResult,
  IntegrationRawEvent,
  IntegrationSyncRun,
  IntegrationSyncTrigger,
} from "./config-types";

interface IntegrationsContentProps {
  connections: IntegrationConnection[];
  activeConnection: IntegrationConnection | null;
  effectiveIntegrationId: string | null;
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
  credentials: AsyncTableState<
    IntegrationIssueIngestCredentialResult["credential"]
  >;
  rawEvents: AsyncTableState<IntegrationRawEvent>;
  onSelectIntegration: (value: string | null) => void;
  onLabelChange: (value: string) => void;
  onTriggerChange: (value: IntegrationSyncTrigger) => void;
  onSyncForceFullChange: (value: boolean) => void;
  onSyncWindowStartChange: (value: string) => void;
  onSyncWindowEndChange: (value: string) => void;
  onIssueCredential: () => void;
  onTestConnection: () => void;
  onTriggerSync: () => void;
  onRevokeCredential: (credentialId: string) => void;
}

function CredentialSummaryLines({
  issuedCredential,
}: {
  issuedCredential: IntegrationIssueIngestCredentialResult;
}) {
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

function IssuedCredentialPanel({
  issuedCredential,
}: {
  issuedCredential: IntegrationIssueIngestCredentialResult | null;
}) {
  if (!issuedCredential) return null;

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

function IntegrationsCardBody(props: IntegrationsContentProps) {
  return (
    <>
      {!props.canManageIntegrations ? (
        <ConfigReadonlyNotice
          message="Mode lecture seule pour les operations connecteurs. Permission requise:"
          permission="admin:integrations:write"
        />
      ) : null}
      <ConnectionsTable connections={props.connections} />
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
    </>
  );
}

export function IntegrationsContent(props: IntegrationsContentProps) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <IntegrationsCardBody {...props} />
      </CardContent>
    </Card>
  );
}
