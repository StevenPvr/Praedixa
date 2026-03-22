"use client";

import { useEffect, useState } from "react";
import { SkeletonCard } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  ADMIN_WORKSPACE_FEATURE_GATES,
  integrationsUnavailableMessage,
} from "@/lib/runtime/admin-workspace-feature-gates";

import { ConfigReadonlyNotice } from "./config-readonly-notice";
import { createIntegrationOperations } from "./config-operations";
import { IntegrationsContent } from "./integrations-section-view";
import type {
  ConfigActionHandlers,
  IntegrationCatalogItem,
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
    canReadIntegrations && ADMIN_WORKSPACE_FEATURE_GATES.integrationsWorkspace
      ? ADMIN_ENDPOINTS.orgIntegrationConnections(orgId)
      : null,
  );
}

function useIntegrationCatalog(canReadIntegrations: boolean) {
  return useApiGet<IntegrationCatalogItem[]>(
    canReadIntegrations && ADMIN_WORKSPACE_FEATURE_GATES.integrationsWorkspace
      ? ADMIN_ENDPOINTS.integrationsCatalog
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
  const [createVendor, setCreateVendor] = useState("custom_data");
  const [createDisplayName, setCreateDisplayName] = useState("");
  const [createAuthMode, setCreateAuthMode] = useState("api_key");
  const [createSourceObjectsInput, setCreateSourceObjectsInput] =
    useState("dataset");
  const [createRuntimeEnvironment, setCreateRuntimeEnvironment] = useState<
    "production" | "sandbox"
  >("production");
  const [createBaseUrlInput, setCreateBaseUrlInput] = useState("");
  const [createConfigJsonInput, setCreateConfigJsonInput] = useState(
    '{\n  "datasetMappings": {}\n}',
  );
  const [createCredentialsJsonInput, setCreateCredentialsJsonInput] = useState(
    '{\n  "apiKey": ""\n}',
  );
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
    createVendor,
    setCreateVendor,
    createDisplayName,
    setCreateDisplayName,
    createAuthMode,
    setCreateAuthMode,
    createSourceObjectsInput,
    setCreateSourceObjectsInput,
    createRuntimeEnvironment,
    setCreateRuntimeEnvironment,
    createBaseUrlInput,
    setCreateBaseUrlInput,
    createConfigJsonInput,
    setCreateConfigJsonInput,
    createCredentialsJsonInput,
    setCreateCredentialsJsonInput,
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
}: Readonly<IntegrationsSectionProps>) {
  const catalog = useIntegrationCatalog(canReadIntegrations);
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
    catalog: catalog.data ?? [],
    effectiveIntegrationId: selection.effectiveIntegrationId,
    createVendor: controls.createVendor,
    createDisplayName: controls.createDisplayName,
    createAuthMode: controls.createAuthMode,
    createSourceObjectsInput: controls.createSourceObjectsInput,
    createRuntimeEnvironment: controls.createRuntimeEnvironment,
    createBaseUrlInput: controls.createBaseUrlInput,
    createConfigJsonInput: controls.createConfigJsonInput,
    createCredentialsJsonInput: controls.createCredentialsJsonInput,
    ingestCredentialLabel: controls.ingestCredentialLabel,
    syncTriggerType: controls.syncTriggerType,
    syncForceFull: controls.syncForceFull,
    syncWindowStartInput: controls.syncWindowStartInput,
    syncWindowEndInput: controls.syncWindowEndInput,
    canManageIntegrations,
    setIssuedCredential: controls.setIssuedCredential,
    setCreateDisplayName: controls.setCreateDisplayName,
    setCreateAuthMode: controls.setCreateAuthMode,
    setCreateSourceObjectsInput: controls.setCreateSourceObjectsInput,
    setCreateBaseUrlInput: controls.setCreateBaseUrlInput,
    setCreateConfigJsonInput: controls.setCreateConfigJsonInput,
    setCreateCredentialsJsonInput: controls.setCreateCredentialsJsonInput,
    setConnectionTestResult: controls.setConnectionTestResult,
    refetchIntegrations: connections.refetch,
    refetchIngestCredentials: resources.credentials.refetch,
    refetchRawEvents: resources.rawEvents.refetch,
    refetchIntegrationSyncRuns: resources.syncRuns.refetch,
    ...actions,
  });

  return {
    connections,
    catalog,
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

type IntegrationsSectionStateProps = {
  model: ReturnType<typeof useIntegrationsSectionModel>;
};

function IntegrationsSectionState(
  props: Readonly<IntegrationsSectionStateProps>,
) {
  const { model } = props;
  if (!model.canReadIntegrations) {
    return (
      <ConfigReadonlyNotice
        message="Permission requise:"
        permission="admin:integrations:read"
      />
    );
  }

  if (!ADMIN_WORKSPACE_FEATURE_GATES.integrationsWorkspace) {
    return <ErrorFallback message={integrationsUnavailableMessage()} />;
  }

  if (model.connections.loading) return <SkeletonCard />;
  if (model.catalog.loading) return <SkeletonCard />;
  if (model.catalog.error) {
    return (
      <ErrorFallback
        message={model.catalog.error}
        onRetry={model.catalog.refetch}
      />
    );
  }
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

function LoadedIntegrationsState(
  props: Readonly<IntegrationsSectionStateProps>,
) {
  const { model } = props;
  return (
    <IntegrationsContent
      catalog={model.catalog.data ?? []}
      connections={model.connections.data ?? []}
      activeConnection={model.activeConnection}
      effectiveIntegrationId={model.selection.effectiveIntegrationId}
      createVendor={model.controls.createVendor}
      createDisplayName={model.controls.createDisplayName}
      createAuthMode={model.controls.createAuthMode}
      createSourceObjectsInput={model.controls.createSourceObjectsInput}
      createRuntimeEnvironment={model.controls.createRuntimeEnvironment}
      createBaseUrlInput={model.controls.createBaseUrlInput}
      createConfigJsonInput={model.controls.createConfigJsonInput}
      createCredentialsJsonInput={model.controls.createCredentialsJsonInput}
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
      onCreateVendorChange={model.controls.setCreateVendor}
      onCreateDisplayNameChange={model.controls.setCreateDisplayName}
      onCreateAuthModeChange={model.controls.setCreateAuthMode}
      onCreateSourceObjectsInputChange={
        model.controls.setCreateSourceObjectsInput
      }
      onCreateRuntimeEnvironmentChange={
        model.controls.setCreateRuntimeEnvironment
      }
      onCreateBaseUrlInputChange={model.controls.setCreateBaseUrlInput}
      onCreateConfigJsonInputChange={model.controls.setCreateConfigJsonInput}
      onCreateCredentialsJsonInputChange={
        model.controls.setCreateCredentialsJsonInput
      }
      onLabelChange={model.controls.setIngestCredentialLabel}
      onTriggerChange={model.controls.setSyncTriggerType}
      onSyncForceFullChange={model.controls.setSyncForceFull}
      onSyncWindowStartChange={model.controls.setSyncWindowStartInput}
      onSyncWindowEndChange={model.controls.setSyncWindowEndInput}
      onIssueCredential={() => {
        model.operations.issueIngestCredential().catch(() => undefined);
      }}
      onCreateConnection={() => {
        model.operations
          .createIntegrationConnectionAction()
          .catch(() => undefined);
      }}
      onTestConnection={() => {
        model.operations
          .testIntegrationConnectionAction()
          .catch(() => undefined);
      }}
      onTriggerSync={() => {
        model.operations.triggerIntegrationSyncAction().catch(() => undefined);
      }}
      onRevokeCredential={(credentialId) => {
        model.operations
          .revokeIngestCredential(credentialId)
          .catch(() => undefined);
      }}
    />
  );
}

export function IntegrationsSection(props: Readonly<IntegrationsSectionProps>) {
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
