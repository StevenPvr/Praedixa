import type {
  DecisionEngineConfigPayload,
  DecisionEngineConfigVersion,
  ResolvedDecisionEngineConfig,
} from "@praedixa/shared-types";

import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError, apiPost } from "@/lib/api/client";
import { getValidAccessToken } from "@/lib/auth/client";

import type {
  ConfigActionHandlers,
  CreateIntegrationConnectionPayload,
  IntegrationCatalogItem,
  DecisionConfigActionBody,
  DecisionConfigRecomputeResponse,
  IntegrationConnectionTestResult,
  IntegrationIngestCredential,
  IntegrationIssueIngestCredentialResult,
  IntegrationSyncRun,
  IntegrationSyncTrigger,
  ScheduleVersionRequestBody,
} from "./config-types";

const CONFIG_WRITE_PERMISSION_MESSAGE = "Permission requise: admin:org:write";
const INTEGRATIONS_WRITE_PERMISSION_MESSAGE =
  "Permission requise: admin:integrations:write";

export function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateTime(value: string | undefined | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

export function compactVersionId(versionId: string): string {
  return versionId.length > 8 ? versionId.slice(0, 8) : versionId;
}

export function normalizeOptionalDateTimeInput(value: string): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError("invalid datetime");
  }

  return parsed.toISOString();
}

async function postAuthorizedAction<T>({
  url,
  body,
  allowed,
  missingPermissionMessage,
  setActionError,
}: {
  url: string;
  body: unknown;
  allowed: boolean;
  missingPermissionMessage: string;
  setActionError: (value: string | null) => void;
}): Promise<T | null> {
  if (!allowed) {
    setActionError(missingPermissionMessage);
    return null;
  }

  try {
    const response = await apiPost<T>(url, body, async () =>
      getValidAccessToken(),
    );
    return response.data;
  } catch (error) {
    setActionError(
      error instanceof ApiError ? error.message : "Une erreur est survenue",
    );
    return null;
  }
}

async function runManagedAction<T>({
  actionKey,
  handlers,
  prepare,
  execute,
}: {
  actionKey: string;
  handlers: Pick<
    ConfigActionHandlers,
    "setActionLoading" | "setActionError" | "setActionSuccess"
  >;
  prepare?: () => void;
  execute: () => Promise<T | null>;
}): Promise<T | null> {
  handlers.setActionLoading(actionKey);
  handlers.setActionError(null);
  handlers.setActionSuccess(null);
  prepare?.();

  const result = await execute();
  handlers.setActionLoading(null);
  return result;
}

interface DecisionConfigOperationsArgs extends ConfigActionHandlers {
  orgId: string;
  selectedSiteId: string | null;
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  effectiveAtInput: string;
  payloadDraft: string;
  changeReason: string;
  recomputeAlertId: string;
  canManageConfig: boolean;
  setLastRecompute: (value: DecisionConfigRecomputeResponse | null) => void;
  refetchResolvedConfig: () => void;
  refetchDecisionConfigVersions: () => void;
}

interface IntegrationOperationsArgs extends ConfigActionHandlers {
  orgId: string;
  catalog: IntegrationCatalogItem[];
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
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  canManageIntegrations: boolean;
  setIssuedCredential: (
    value: IntegrationIssueIngestCredentialResult | null,
  ) => void;
  setCreateDisplayName: (value: string) => void;
  setCreateAuthMode: (value: string) => void;
  setCreateSourceObjectsInput: (value: string) => void;
  setCreateBaseUrlInput: (value: string) => void;
  setCreateConfigJsonInput: (value: string) => void;
  setCreateCredentialsJsonInput: (value: string) => void;
  setConnectionTestResult: (
    value: IntegrationConnectionTestResult | null,
  ) => void;
  refetchIntegrations: () => void;
  refetchIngestCredentials: () => void;
  refetchRawEvents: () => void;
  refetchIntegrationSyncRuns: () => void;
}

function refreshDecisionConfigViews({
  refetchResolvedConfig,
  refetchDecisionConfigVersions,
}: Pick<
  DecisionConfigOperationsArgs,
  "refetchResolvedConfig" | "refetchDecisionConfigVersions"
>) {
  refetchResolvedConfig();
  refetchDecisionConfigVersions();
}

function refreshIntegrationViews({
  refetchIntegrations,
  refetchIngestCredentials,
  refetchRawEvents,
  refetchIntegrationSyncRuns,
}: Pick<
  IntegrationOperationsArgs,
  | "refetchIntegrations"
  | "refetchIngestCredentials"
  | "refetchRawEvents"
  | "refetchIntegrationSyncRuns"
>) {
  refetchIntegrations();
  refetchIngestCredentials();
  refetchRawEvents();
  refetchIntegrationSyncRuns();
}

function parseDecisionConfigPayload({
  payloadDraft,
  setActionError,
}: Pick<DecisionConfigOperationsArgs, "payloadDraft" | "setActionError">) {
  try {
    const parsed = JSON.parse(payloadDraft) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("invalid payload");
    }
    return parsed as DecisionEngineConfigPayload;
  } catch {
    setActionError("Le payload decision-config doit etre un JSON valide.");
    return null;
  }
}

function resolveSyncWindow(args: IntegrationOperationsArgs) {
  try {
    const sourceWindowStart = normalizeOptionalDateTimeInput(
      args.syncWindowStartInput,
    );
    const sourceWindowEnd = normalizeOptionalDateTimeInput(
      args.syncWindowEndInput,
    );
    if (
      args.syncTriggerType !== "manual" &&
      (sourceWindowStart == null || sourceWindowEnd == null)
    ) {
      args.setActionError(
        "Une fenetre source complete est requise pour replay ou backfill.",
      );
      return null;
    }
    return { sourceWindowStart, sourceWindowEnd };
  } catch {
    args.setActionError("La fenetre source doit utiliser des dates valides.");
    return null;
  }
}

function requireSelectedIntegrationId(
  args: Pick<
    IntegrationOperationsArgs,
    "effectiveIntegrationId" | "setActionError"
  >,
) {
  if (!args.effectiveIntegrationId) {
    args.setActionError("Aucune connexion d'integration selectionnee.");
    return null;
  }

  return args.effectiveIntegrationId;
}

function parseJsonObjectInput(
  rawValue: string,
  label: string,
): Record<string, unknown> | null {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new TypeError("invalid object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new TypeError(`${label} doit etre un objet JSON valide.`);
  }
}

function buildCreateConnectionPayload(
  args: IntegrationOperationsArgs,
): CreateIntegrationConnectionPayload {
  const selectedCatalogItem = args.catalog.find(
    (item) => item.vendor === args.createVendor,
  );
  if (!selectedCatalogItem) {
    throw new TypeError("Selectionne un type de source valide.");
  }
  const displayName = args.createDisplayName.trim();
  if (displayName.length < 3) {
    throw new TypeError(
      "Le nom de la source doit contenir au moins 3 caracteres.",
    );
  }
  if (!selectedCatalogItem.authModes.includes(args.createAuthMode)) {
    throw new TypeError(
      "Le mode d'authentification ne correspond pas au vendor choisi.",
    );
  }

  const sourceObjects = Array.from(
    new Set(
      args.createSourceObjectsInput
        .split(/[\n,;]+/u)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
  const config =
    parseJsonObjectInput(args.createConfigJsonInput, "La config") ?? {};
  const credentials = parseJsonObjectInput(
    args.createCredentialsJsonInput,
    "Les credentials",
  );

  return {
    vendor: args.createVendor,
    displayName,
    authMode: args.createAuthMode,
    runtimeEnvironment: args.createRuntimeEnvironment,
    baseUrl: args.createBaseUrlInput.trim() || null,
    config,
    ...(sourceObjects.length > 0 ? { sourceObjects } : {}),
    ...(credentials != null && Object.keys(credentials).length > 0
      ? { credentials }
      : {}),
  };
}

function postDecisionConfigAction<T>(
  args: Pick<
    DecisionConfigOperationsArgs,
    "canManageConfig" | "setActionError"
  >,
  url: string,
  body: unknown,
) {
  return postAuthorizedAction<T>({
    url,
    body,
    allowed: args.canManageConfig,
    missingPermissionMessage: CONFIG_WRITE_PERMISSION_MESSAGE,
    setActionError: args.setActionError,
  });
}

function postIntegrationAction<T>(
  args: Pick<
    IntegrationOperationsArgs,
    "canManageIntegrations" | "setActionError"
  >,
  url: string,
  body: unknown,
) {
  return postAuthorizedAction<T>({
    url,
    body,
    allowed: args.canManageIntegrations,
    missingPermissionMessage: INTEGRATIONS_WRITE_PERMISSION_MESSAGE,
    setActionError: args.setActionError,
  });
}

function buildScheduleVersionFromCurrentConfig(
  args: DecisionConfigOperationsArgs,
) {
  return async function scheduleVersionFromCurrentConfig() {
    if (!args.resolvedConfig) return;

    const effectiveAt = new Date(args.effectiveAtInput);
    if (Number.isNaN(effectiveAt.getTime())) {
      args.setActionError("La date d'effet est invalide.");
      return;
    }

    const payload = parseDecisionConfigPayload(args);
    if (!payload) {
      return;
    }

    const created = await runManagedAction({
      actionKey: "schedule",
      handlers: args,
      execute: () =>
        postDecisionConfigAction<DecisionEngineConfigVersion>(
          args,
          ADMIN_ENDPOINTS.orgDecisionConfigVersions(args.orgId),
          {
            siteId: args.selectedSiteId,
            effectiveAt: effectiveAt.toISOString(),
            payload,
            ...(args.changeReason.trim()
              ? { reason: args.changeReason.trim() }
              : {}),
          } satisfies ScheduleVersionRequestBody,
        ),
    });
    if (!created) return;

    args.setActionSuccess(
      `Version ${compactVersionId(created.id)} planifiee pour ${formatDateTime(created.effectiveAt)}.`,
    );
    refreshDecisionConfigViews(args);
  };
}

function buildCancelScheduledVersion(args: DecisionConfigOperationsArgs) {
  return async function cancelScheduledVersion(
    version: DecisionEngineConfigVersion,
  ) {
    const cancelled = await runManagedAction({
      actionKey: `cancel-${version.id}`,
      handlers: args,
      execute: () =>
        postDecisionConfigAction<DecisionEngineConfigVersion>(
          args,
          ADMIN_ENDPOINTS.orgDecisionConfigVersionCancel(
            args.orgId,
            version.id,
          ),
          {
            ...(args.changeReason.trim()
              ? { reason: args.changeReason.trim() }
              : {}),
          } satisfies DecisionConfigActionBody,
        ),
    });
    if (!cancelled) return;

    args.setActionSuccess(`Version ${compactVersionId(version.id)} annulee.`);
    refreshDecisionConfigViews(args);
  };
}

function buildRollbackVersion(args: DecisionConfigOperationsArgs) {
  return async function rollbackVersion(version: DecisionEngineConfigVersion) {
    const rollback = await runManagedAction({
      actionKey: `rollback-${version.id}`,
      handlers: args,
      execute: () =>
        postDecisionConfigAction<DecisionEngineConfigVersion>(
          args,
          ADMIN_ENDPOINTS.orgDecisionConfigVersionRollback(
            args.orgId,
            version.id,
          ),
          {
            ...(args.changeReason.trim()
              ? { reason: args.changeReason.trim() }
              : {}),
          } satisfies DecisionConfigActionBody,
        ),
    });
    if (!rollback) return;

    args.setActionSuccess(
      `Rollback active via version ${compactVersionId(rollback.id)}.`,
    );
    refreshDecisionConfigViews(args);
  };
}

function buildRecomputeScenario(args: DecisionConfigOperationsArgs) {
  return async function recomputeScenario() {
    const alertId = args.recomputeAlertId.trim();
    if (alertId.length === 0) {
      args.setActionError("L'identifiant d'alerte est requis.");
      return;
    }

    const recompute = await runManagedAction({
      actionKey: "recompute",
      handlers: args,
      execute: () =>
        postDecisionConfigAction<DecisionConfigRecomputeResponse>(
          args,
          ADMIN_ENDPOINTS.orgAlertScenarioRecompute(args.orgId, alertId),
          {},
        ),
    });
    if (!recompute) return;

    args.setLastRecompute(recompute);
    args.setActionSuccess(`Scenarios recalcules pour ${recompute.alertId}.`);
  };
}

function buildIssueIngestCredential(args: IntegrationOperationsArgs) {
  return async function issueIngestCredential() {
    const integrationId = requireSelectedIntegrationId(args);
    if (!integrationId) {
      return;
    }

    const issued = await runManagedAction({
      actionKey: "issue-ingest-credential",
      handlers: args,
      prepare: () => args.setIssuedCredential(null),
      execute: () =>
        postIntegrationAction<IntegrationIssueIngestCredentialResult>(
          args,
          ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
            args.orgId,
            integrationId,
          ),
          {
            label: args.ingestCredentialLabel.trim() || "Client outbound",
            requireSignature: true,
          },
        ),
    });
    if (!issued) return;

    args.setIssuedCredential(issued);
    args.setActionSuccess(
      `Cle d'ingestion generee pour ${issued.credential.label}.`,
    );
    refreshIntegrationViews(args);
  };
}

function buildCreateIntegrationConnectionAction(
  args: IntegrationOperationsArgs,
) {
  return async function createIntegrationConnectionAction() {
    let payload: CreateIntegrationConnectionPayload;
    try {
      payload = buildCreateConnectionPayload(args);
    } catch (error) {
      args.setActionError(
        error instanceof Error
          ? error.message
          : "La source ne peut pas etre creee.",
      );
      return;
    }

    const created = await runManagedAction({
      actionKey: "integration-create",
      handlers: args,
      prepare: () => args.setIssuedCredential(null),
      execute: () =>
        postIntegrationAction<{ id: string; displayName: string }>(
          args,
          ADMIN_ENDPOINTS.orgIntegrationConnections(args.orgId),
          payload,
        ),
    });
    if (!created) return;

    args.setCreateDisplayName("");
    args.setCreateSourceObjectsInput("");
    args.setCreateBaseUrlInput("");
    args.setCreateConfigJsonInput('{\n  "datasetMappings": {}\n}');
    args.setCreateCredentialsJsonInput('{\n  "apiKey": ""\n}');
    args.setActionSuccess(`Source ${created.displayName} creee.`);
    refreshIntegrationViews(args);
  };
}

function buildRevokeIngestCredential(args: IntegrationOperationsArgs) {
  return async function revokeIngestCredential(credentialId: string) {
    const integrationId = requireSelectedIntegrationId(args);
    if (!integrationId) {
      return;
    }

    const revoked = await runManagedAction({
      actionKey: `revoke-ingest-${credentialId}`,
      handlers: args,
      execute: () =>
        postIntegrationAction<IntegrationIngestCredential>(
          args,
          ADMIN_ENDPOINTS.orgIntegrationIngestCredentialRevoke(
            args.orgId,
            integrationId,
            credentialId,
          ),
          {},
        ),
    });
    if (!revoked) return;

    args.setActionSuccess(`Cle ${revoked.label} revoquee.`);
    refreshIntegrationViews(args);
  };
}

function buildTestIntegrationConnectionAction(args: IntegrationOperationsArgs) {
  return async function testIntegrationConnectionAction() {
    const integrationId = requireSelectedIntegrationId(args);
    if (!integrationId) {
      return;
    }

    const result = await runManagedAction({
      actionKey: "integration-test",
      handlers: args,
      prepare: () => args.setConnectionTestResult(null),
      execute: () =>
        postIntegrationAction<IntegrationConnectionTestResult>(
          args,
          ADMIN_ENDPOINTS.orgIntegrationConnectionTest(
            args.orgId,
            integrationId,
          ),
          {},
        ),
    });
    if (!result) return;

    args.setConnectionTestResult(result);
    args.setActionSuccess(`Connexion testee en ${result.latencyMs} ms.`);
    refreshIntegrationViews(args);
  };
}

function buildTriggerIntegrationSyncAction(args: IntegrationOperationsArgs) {
  return async function triggerIntegrationSyncAction() {
    const integrationId = requireSelectedIntegrationId(args);
    if (!integrationId) {
      return;
    }

    const syncWindow = resolveSyncWindow(args);
    if (!syncWindow) {
      return;
    }

    const run = await runManagedAction({
      actionKey: "integration-sync",
      handlers: args,
      execute: () =>
        postIntegrationAction<IntegrationSyncRun>(
          args,
          ADMIN_ENDPOINTS.orgIntegrationSync(args.orgId, integrationId),
          {
            triggerType: args.syncTriggerType,
            forceFullSync: args.syncForceFull,
            sourceWindowStart: syncWindow.sourceWindowStart,
            sourceWindowEnd: syncWindow.sourceWindowEnd,
          },
        ),
    });
    if (!run) return;

    args.setActionSuccess(
      `Run ${run.triggerType} ${run.status} cree le ${formatDateTime(run.createdAt)}.`,
    );
    refreshIntegrationViews(args);
  };
}

export function createDecisionConfigOperations(
  args: DecisionConfigOperationsArgs,
) {
  return {
    scheduleVersionFromCurrentConfig:
      buildScheduleVersionFromCurrentConfig(args),
    cancelScheduledVersion: buildCancelScheduledVersion(args),
    rollbackVersion: buildRollbackVersion(args),
    recomputeScenario: buildRecomputeScenario(args),
  };
}

export function createIntegrationOperations(args: IntegrationOperationsArgs) {
  return {
    createIntegrationConnectionAction:
      buildCreateIntegrationConnectionAction(args),
    issueIngestCredential: buildIssueIngestCredential(args),
    revokeIngestCredential: buildRevokeIngestCredential(args),
    testIntegrationConnectionAction: buildTestIntegrationConnectionAction(args),
    triggerIntegrationSyncAction: buildTriggerIntegrationSyncAction(args),
  };
}
