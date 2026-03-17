"use client";

import { useEffect, useState } from "react";
import { SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

import { ConfigReadonlyNotice } from "./config-readonly-notice";
import { createIntegrationOperations } from "./config-operations";
import { IntegrationsContent } from "./integrations-section-view";
import type {
  ConfigActionHandlers,
  IntegrationConnection,
  IntegrationConnectionTestResult,
  IntegrationIngestCredential,
  IntegrationIssueIngestCredentialResult,
  IntegrationRawEvent,
  IntegrationSyncRun,
  IntegrationSyncTrigger,
} from "./config-types";

interface IntegrationsSectionProps extends ConfigActionHandlers {
  orgId: string;
  canReadIntegrations: boolean;
  canManageIntegrations: boolean;
}

function useIntegrationConnections(
  orgId: string,
  canReadIntegrations: boolean,
) {
  return useApiGet<IntegrationConnection[]>(
    canReadIntegrations
      ? ADMIN_ENDPOINTS.orgIntegrationConnections(orgId)
      : null,
  );
}

function useIntegrationSelection(
  connections: IntegrationConnection[] | null | undefined,
) {
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!selectedIntegrationId && connections && connections.length > 0) {
      setSelectedIntegrationId(connections[0]?.id ?? null);
    }
  }, [connections, selectedIntegrationId]);

  return {
    selectedIntegrationId,
    setSelectedIntegrationId,
    effectiveIntegrationId:
      selectedIntegrationId ?? connections?.[0]?.id ?? null,
  };
}

function useIntegrationResources(
  orgId: string,
  canReadIntegrations: boolean,
  effectiveIntegrationId: string | null,
) {
  const credentials = useApiGet<IntegrationIngestCredential[]>(
    canReadIntegrations && effectiveIntegrationId
      ? ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
          orgId,
          effectiveIntegrationId,
        )
      : null,
  );
  const rawEvents = useApiGet<IntegrationRawEvent[]>(
    canReadIntegrations && effectiveIntegrationId
      ? ADMIN_ENDPOINTS.orgIntegrationRawEvents(orgId, effectiveIntegrationId)
      : null,
  );
  const syncRuns = useApiGet<IntegrationSyncRun[]>(
    canReadIntegrations && effectiveIntegrationId
      ? `${ADMIN_ENDPOINTS.orgIntegrationSyncRuns(orgId)}?connectionId=${encodeURIComponent(effectiveIntegrationId)}`
      : null,
  );

  return { credentials, rawEvents, syncRuns };
}

function useIntegrationControls(effectiveIntegrationId: string | null) {
  const [ingestCredentialLabel, setIngestCredentialLabel] =
    useState("CRM outbound");
  const [issuedCredential, setIssuedCredential] =
    useState<IntegrationIssueIngestCredentialResult | null>(null);
  const [connectionTestResult, setConnectionTestResult] =
    useState<IntegrationConnectionTestResult | null>(null);
  const [syncTriggerType, setSyncTriggerType] =
    useState<IntegrationSyncTrigger>("manual");
  const [syncForceFull, setSyncForceFull] = useState(false);
  const [syncWindowStartInput, setSyncWindowStartInput] = useState("");
  const [syncWindowEndInput, setSyncWindowEndInput] = useState("");

  useEffect(() => {
    setConnectionTestResult(null);
  }, [effectiveIntegrationId]);

  return {
    ingestCredentialLabel,
    setIngestCredentialLabel,
    issuedCredential,
    setIssuedCredential,
    connectionTestResult,
    setConnectionTestResult,
    syncTriggerType,
    setSyncTriggerType,
    syncForceFull,
    setSyncForceFull,
    syncWindowStartInput,
    setSyncWindowStartInput,
    syncWindowEndInput,
    setSyncWindowEndInput,
  };
}

function useIntegrationsSectionModel({
  orgId,
  canReadIntegrations,
  canManageIntegrations,
  ...actions
}: IntegrationsSectionProps) {
  const connections = useIntegrationConnections(orgId, canReadIntegrations);
  const selection = useIntegrationSelection(connections.data);
  const controls = useIntegrationControls(selection.effectiveIntegrationId);
  const resources = useIntegrationResources(
    orgId,
    canReadIntegrations,
    selection.effectiveIntegrationId,
  );
  const activeConnection =
    connections.data?.find(
      (connection) => connection.id === selection.effectiveIntegrationId,
    ) ?? null;
  const operations = createIntegrationOperations({
    orgId,
    effectiveIntegrationId: selection.effectiveIntegrationId,
    ingestCredentialLabel: controls.ingestCredentialLabel,
    syncTriggerType: controls.syncTriggerType,
    syncForceFull: controls.syncForceFull,
    syncWindowStartInput: controls.syncWindowStartInput,
    syncWindowEndInput: controls.syncWindowEndInput,
    canManageIntegrations,
    setIssuedCredential: controls.setIssuedCredential,
    setConnectionTestResult: controls.setConnectionTestResult,
    refetchIntegrations: connections.refetch,
    refetchIngestCredentials: resources.credentials.refetch,
    refetchRawEvents: resources.rawEvents.refetch,
    refetchIntegrationSyncRuns: resources.syncRuns.refetch,
    ...actions,
  });

  return {
    connections,
    selection,
    controls,
    resources,
    activeConnection,
    operations,
    actionLoading: actions.actionLoading,
    canReadIntegrations,
    canManageIntegrations,
  };
}

function IntegrationsSectionState({
  model,
}: {
  model: ReturnType<typeof useIntegrationsSectionModel>;
}) {
  if (!model.canReadIntegrations) {
    return (
      <ConfigReadonlyNotice
        message="Permission requise:"
        permission="admin:integrations:read"
      />
    );
  }

  if (model.connections.loading) return <SkeletonCard />;
  if (model.connections.error) {
    return (
      <ErrorFallback
        message={model.connections.error}
        onRetry={model.connections.refetch}
      />
    );
  }

  return <LoadedIntegrationsState model={model} />;
}

function LoadedIntegrationsState({
  model,
}: {
  model: ReturnType<typeof useIntegrationsSectionModel>;
}) {
  return (
    <IntegrationsContent
      connections={model.connections.data ?? []}
      activeConnection={model.activeConnection}
      effectiveIntegrationId={model.selection.effectiveIntegrationId}
      ingestCredentialLabel={model.controls.ingestCredentialLabel}
      issuedCredential={model.controls.issuedCredential}
      connectionTestResult={model.controls.connectionTestResult}
      syncTriggerType={model.controls.syncTriggerType}
      syncForceFull={model.controls.syncForceFull}
      syncWindowStartInput={model.controls.syncWindowStartInput}
      syncWindowEndInput={model.controls.syncWindowEndInput}
      canManageIntegrations={model.canManageIntegrations}
      actionLoading={model.actionLoading}
      credentials={model.resources.credentials}
      rawEvents={model.resources.rawEvents}
      syncRuns={model.resources.syncRuns}
      onSelectIntegration={model.selection.setSelectedIntegrationId}
      onLabelChange={model.controls.setIngestCredentialLabel}
      onTriggerChange={model.controls.setSyncTriggerType}
      onSyncForceFullChange={model.controls.setSyncForceFull}
      onSyncWindowStartChange={model.controls.setSyncWindowStartInput}
      onSyncWindowEndChange={model.controls.setSyncWindowEndInput}
      onIssueCredential={() => void model.operations.issueIngestCredential()}
      onTestConnection={() =>
        void model.operations.testIntegrationConnectionAction()
      }
      onTriggerSync={() => void model.operations.triggerIntegrationSyncAction()}
      onRevokeCredential={(credentialId) =>
        void model.operations.revokeIngestCredential(credentialId)
      }
    />
  );
}

export function IntegrationsSection(props: IntegrationsSectionProps) {
  const model = useIntegrationsSectionModel(props);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-ink-secondary">
        Integrations client
      </h3>
      <IntegrationsSectionState model={model} />
    </div>
  );
}
