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
  DecisionConfigActionBody,
  DecisionConfigRecomputeResponse,
  IntegrationConnectionTestResult,
  IntegrationIngestCredential,
  IntegrationIssueIngestCredentialResult,
  IntegrationSyncRun,
  IntegrationSyncTrigger,
  ScheduleVersionRequestBody,
} from "./config-types";

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
    throw new Error("invalid datetime");
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
  effectiveIntegrationId: string | null;
  ingestCredentialLabel: string;
  syncTriggerType: IntegrationSyncTrigger;
  syncForceFull: boolean;
  syncWindowStartInput: string;
  syncWindowEndInput: string;
  canManageIntegrations: boolean;
  setIssuedCredential: (
    value: IntegrationIssueIngestCredentialResult | null,
  ) => void;
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
      throw new Error("invalid payload");
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

    args.setActionLoading("schedule");
    args.setActionError(null);
    args.setActionSuccess(null);

    const created = await postAuthorizedAction<DecisionEngineConfigVersion>({
      url: ADMIN_ENDPOINTS.orgDecisionConfigVersions(args.orgId),
      body: {
        siteId: args.selectedSiteId,
        effectiveAt: effectiveAt.toISOString(),
        payload,
        reason: args.changeReason.trim() || undefined,
      } satisfies ScheduleVersionRequestBody,
      allowed: args.canManageConfig,
      missingPermissionMessage: "Permission requise: admin:org:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
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
    args.setActionLoading(`cancel-${version.id}`);
    args.setActionError(null);
    args.setActionSuccess(null);

    const cancelled = await postAuthorizedAction<DecisionEngineConfigVersion>({
      url: ADMIN_ENDPOINTS.orgDecisionConfigVersionCancel(
        args.orgId,
        version.id,
      ),
      body: {
        reason: args.changeReason.trim() || undefined,
      } satisfies DecisionConfigActionBody,
      allowed: args.canManageConfig,
      missingPermissionMessage: "Permission requise: admin:org:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
    if (!cancelled) return;

    args.setActionSuccess(`Version ${compactVersionId(version.id)} annulee.`);
    refreshDecisionConfigViews(args);
  };
}

function buildRollbackVersion(args: DecisionConfigOperationsArgs) {
  return async function rollbackVersion(version: DecisionEngineConfigVersion) {
    args.setActionLoading(`rollback-${version.id}`);
    args.setActionError(null);
    args.setActionSuccess(null);

    const rollback = await postAuthorizedAction<DecisionEngineConfigVersion>({
      url: ADMIN_ENDPOINTS.orgDecisionConfigVersionRollback(
        args.orgId,
        version.id,
      ),
      body: {
        reason: args.changeReason.trim() || undefined,
      } satisfies DecisionConfigActionBody,
      allowed: args.canManageConfig,
      missingPermissionMessage: "Permission requise: admin:org:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
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

    args.setActionLoading("recompute");
    args.setActionError(null);
    args.setActionSuccess(null);

    const recompute =
      await postAuthorizedAction<DecisionConfigRecomputeResponse>({
        url: ADMIN_ENDPOINTS.orgAlertScenarioRecompute(args.orgId, alertId),
        body: {},
        allowed: args.canManageConfig,
        missingPermissionMessage: "Permission requise: admin:org:write",
        setActionError: args.setActionError,
      });

    args.setActionLoading(null);
    if (!recompute) return;

    args.setLastRecompute(recompute);
    args.setActionSuccess(`Scenarios recalcules pour ${recompute.alertId}.`);
  };
}

function buildIssueIngestCredential(args: IntegrationOperationsArgs) {
  return async function issueIngestCredential() {
    if (!args.effectiveIntegrationId) {
      args.setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    args.setActionLoading("issue-ingest-credential");
    args.setActionError(null);
    args.setActionSuccess(null);
    args.setIssuedCredential(null);

    const issued =
      await postAuthorizedAction<IntegrationIssueIngestCredentialResult>({
        url: ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
          args.orgId,
          args.effectiveIntegrationId,
        ),
        body: {
          label: args.ingestCredentialLabel.trim() || "Client outbound",
          requireSignature: true,
        },
        allowed: args.canManageIntegrations,
        missingPermissionMessage:
          "Permission requise: admin:integrations:write",
        setActionError: args.setActionError,
      });

    args.setActionLoading(null);
    if (!issued) return;

    args.setIssuedCredential(issued);
    args.setActionSuccess(
      `Cle d'ingestion generee pour ${issued.credential.label}.`,
    );
    refreshIntegrationViews(args);
  };
}

function buildRevokeIngestCredential(args: IntegrationOperationsArgs) {
  return async function revokeIngestCredential(credentialId: string) {
    if (!args.effectiveIntegrationId) {
      args.setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    args.setActionLoading(`revoke-ingest-${credentialId}`);
    args.setActionError(null);
    args.setActionSuccess(null);

    const revoked = await postAuthorizedAction<IntegrationIngestCredential>({
      url: ADMIN_ENDPOINTS.orgIntegrationIngestCredentialRevoke(
        args.orgId,
        args.effectiveIntegrationId,
        credentialId,
      ),
      body: {},
      allowed: args.canManageIntegrations,
      missingPermissionMessage: "Permission requise: admin:integrations:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
    if (!revoked) return;

    args.setActionSuccess(`Cle ${revoked.label} revoquee.`);
    refreshIntegrationViews(args);
  };
}

function buildTestIntegrationConnectionAction(args: IntegrationOperationsArgs) {
  return async function testIntegrationConnectionAction() {
    if (!args.effectiveIntegrationId) {
      args.setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    args.setActionLoading("integration-test");
    args.setActionError(null);
    args.setActionSuccess(null);
    args.setConnectionTestResult(null);

    const result = await postAuthorizedAction<IntegrationConnectionTestResult>({
      url: ADMIN_ENDPOINTS.orgIntegrationConnectionTest(
        args.orgId,
        args.effectiveIntegrationId,
      ),
      body: {},
      allowed: args.canManageIntegrations,
      missingPermissionMessage: "Permission requise: admin:integrations:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
    if (!result) return;

    args.setConnectionTestResult(result);
    args.setActionSuccess(`Connexion testee en ${result.latencyMs} ms.`);
    refreshIntegrationViews(args);
  };
}

function buildTriggerIntegrationSyncAction(args: IntegrationOperationsArgs) {
  return async function triggerIntegrationSyncAction() {
    if (!args.effectiveIntegrationId) {
      args.setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    const syncWindow = resolveSyncWindow(args);
    if (!syncWindow) {
      return;
    }

    args.setActionLoading("integration-sync");
    args.setActionError(null);
    args.setActionSuccess(null);

    const run = await postAuthorizedAction<IntegrationSyncRun>({
      url: ADMIN_ENDPOINTS.orgIntegrationSync(
        args.orgId,
        args.effectiveIntegrationId,
      ),
      body: {
        triggerType: args.syncTriggerType,
        forceFullSync: args.syncForceFull,
        sourceWindowStart: syncWindow.sourceWindowStart,
        sourceWindowEnd: syncWindow.sourceWindowEnd,
      },
      allowed: args.canManageIntegrations,
      missingPermissionMessage: "Permission requise: admin:integrations:write",
      setActionError: args.setActionError,
    });

    args.setActionLoading(null);
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
    issueIngestCredential: buildIssueIngestCredential(args),
    revokeIngestCredential: buildRevokeIngestCredential(args),
    testIntegrationConnectionAction: buildTestIntegrationConnectionAction(args),
    triggerIntegrationSyncAction: buildTriggerIntegrationSyncAction(args),
  };
}
