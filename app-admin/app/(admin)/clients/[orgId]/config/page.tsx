"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  DecisionEngineConfigPayload,
  DecisionEngineConfigVersion,
  ResolvedDecisionEngineConfig,
} from "@praedixa/shared-types";
import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError, apiPost } from "@/lib/api/client";
import { getValidAccessToken, useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import {
  Button,
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { sanitizeHttpHref } from "@/lib/security/navigation";

interface CostParam {
  id: string;
  category: string;
  value: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  siteName?: string;
}

interface ProofPack {
  id: string;
  name: string;
  status: string;
  generatedAt?: string;
  downloadUrl?: string;
}

interface DecisionConfigRecomputeResponse {
  alertId: string;
  recommendedOptionId: string | null;
  recommendationPolicyVersion: string;
  recomputedAt: string;
}

interface ScheduleVersionRequestBody {
  siteId?: string | null;
  effectiveAt: string;
  payload: DecisionEngineConfigPayload;
  reason?: string;
}

interface DecisionConfigActionBody {
  reason?: string;
}

interface IntegrationConnection {
  id: string;
  vendor: string;
  displayName: string;
  status: string;
  authorizationState?: string;
  authMode: string;
  sourceObjects?: string[];
  updatedAt: string;
}

interface IntegrationIngestCredential {
  id: string;
  label: string;
  keyId: string;
  authMode: "bearer" | "bearer_hmac";
  tokenPreview: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface IntegrationIssueIngestCredentialResult {
  credential: IntegrationIngestCredential;
  apiKey: string;
  signingSecret: string | null;
  ingestUrl: string;
  authScheme: "Bearer";
  signature: null | {
    algorithm: "hmac-sha256";
    keyIdHeader: string;
    timestampHeader: string;
    signatureHeader: string;
  };
}

interface IntegrationRawEvent {
  id: string;
  credentialId: string;
  eventId: string;
  sourceObject: string;
  sourceRecordId: string;
  schemaVersion: string;
  processingStatus?: "pending" | "processing" | "processed" | "failed";
  objectStoreKey?: string;
  sizeBytes: number;
  receivedAt: string;
}

function toLocalDateTimeInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDateTime(value: string | undefined | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

function compactVersionId(versionId: string): string {
  return versionId.length > 8 ? versionId.slice(0, 8) : versionId;
}

export default function ConfigPage() {
  const { orgId, selectedSiteId } = useClientContext();
  const currentUser = useCurrentUser();
  const [effectiveAtInput, setEffectiveAtInput] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 15 * 60 * 1000)),
  );
  const [payloadDraft, setPayloadDraft] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [recomputeAlertId, setRecomputeAlertId] = useState("alt-001");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lastRecompute, setLastRecompute] =
    useState<DecisionConfigRecomputeResponse | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<
    string | null
  >(null);
  const [ingestCredentialLabel, setIngestCredentialLabel] =
    useState("CRM outbound");
  const [issuedCredential, setIssuedCredential] =
    useState<IntegrationIssueIngestCredentialResult | null>(null);
  const canManageConfig = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);
  const canReadIntegrations = hasAnyPermission(currentUser?.permissions, [
    "admin:integrations:read",
  ]);
  const canManageIntegrations = hasAnyPermission(currentUser?.permissions, [
    "admin:integrations:write",
  ]);

  const costUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgCostParams(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgCostParams(orgId);

  const decisionConfigResolvedUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgDecisionConfigResolved(orgId)}?site_id=${encodeURIComponent(
        selectedSiteId,
      )}`
    : ADMIN_ENDPOINTS.orgDecisionConfigResolved(orgId);

  const decisionConfigVersionsUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgDecisionConfigVersions(orgId)}?site_id=${encodeURIComponent(
        selectedSiteId,
      )}`
    : ADMIN_ENDPOINTS.orgDecisionConfigVersions(orgId);

  const {
    data: costParams,
    loading: costLoading,
    error: costError,
    refetch: costRefetch,
  } = useApiGet<CostParam[]>(costUrl);

  const {
    data: proofPacks,
    loading: proofLoading,
    error: proofError,
    refetch: proofRefetch,
  } = useApiGet<ProofPack[]>(ADMIN_ENDPOINTS.orgProofPacks(orgId));

  const {
    data: resolvedConfig,
    loading: decisionConfigLoading,
    error: decisionConfigError,
    refetch: refetchResolvedConfig,
  } = useApiGet<ResolvedDecisionEngineConfig>(decisionConfigResolvedUrl);

  const {
    data: decisionConfigVersions,
    loading: decisionConfigVersionsLoading,
    error: decisionConfigVersionsError,
    refetch: refetchDecisionConfigVersions,
  } = useApiGet<DecisionEngineConfigVersion[]>(decisionConfigVersionsUrl);

  const {
    data: integrationConnections,
    loading: integrationsLoading,
    error: integrationsError,
    refetch: refetchIntegrations,
  } = useApiGet<IntegrationConnection[]>(
    canReadIntegrations
      ? ADMIN_ENDPOINTS.orgIntegrationConnections(orgId)
      : null,
  );

  useEffect(() => {
    if (
      !selectedIntegrationId &&
      integrationConnections &&
      integrationConnections.length > 0
    ) {
      setSelectedIntegrationId(integrationConnections[0]?.id ?? null);
    }
  }, [integrationConnections, selectedIntegrationId]);

  const effectiveIntegrationId =
    selectedIntegrationId ?? integrationConnections?.[0]?.id ?? null;

  const {
    data: ingestCredentials,
    loading: ingestCredentialsLoading,
    error: ingestCredentialsError,
    refetch: refetchIngestCredentials,
  } = useApiGet<IntegrationIngestCredential[]>(
    canReadIntegrations && effectiveIntegrationId
      ? ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
          orgId,
          effectiveIntegrationId,
        )
      : null,
  );

  const {
    data: rawEvents,
    loading: rawEventsLoading,
    error: rawEventsError,
    refetch: refetchRawEvents,
  } = useApiGet<IntegrationRawEvent[]>(
    canReadIntegrations && effectiveIntegrationId
      ? ADMIN_ENDPOINTS.orgIntegrationRawEvents(orgId, effectiveIntegrationId)
      : null,
  );

  const activeHorizon = useMemo(() => {
    const horizons = resolvedConfig?.payload?.horizons ?? [];
    if (horizons.length === 0) return null;
    const activeDefault = horizons.find(
      (horizon) => horizon.active && horizon.isDefault,
    );
    if (activeDefault) return activeDefault;
    return (
      [...horizons]
        .filter((horizon) => horizon.active)
        .sort((left, right) => left.rank - right.rank)[0] ?? null
    );
  }, [resolvedConfig]);

  useEffect(() => {
    if (!resolvedConfig?.payload) return;
    setPayloadDraft(JSON.stringify(resolvedConfig.payload, null, 2));
  }, [resolvedConfig?.versionId]);

  async function postAdminAction<T>(
    url: string,
    body: unknown,
  ): Promise<T | null> {
    if (!canManageConfig) {
      setActionError("Permission requise: admin:org:write");
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

  async function refreshDecisionConfigViews(): Promise<void> {
    refetchResolvedConfig();
    refetchDecisionConfigVersions();
  }

  async function scheduleVersionFromCurrentConfig(): Promise<void> {
    if (!resolvedConfig) return;
    const effectiveAt = new Date(effectiveAtInput);
    if (Number.isNaN(effectiveAt.getTime())) {
      setActionError("La date d'effet est invalide.");
      return;
    }

    let payload: DecisionEngineConfigPayload;
    try {
      const parsed = JSON.parse(payloadDraft) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("invalid payload");
      }
      payload = parsed as DecisionEngineConfigPayload;
    } catch {
      setActionError("Le payload decision-config doit etre un JSON valide.");
      return;
    }

    setActionLoading("schedule");
    setActionError(null);
    setActionSuccess(null);

    const created = await postAdminAction<DecisionEngineConfigVersion>(
      ADMIN_ENDPOINTS.orgDecisionConfigVersions(orgId),
      {
        siteId: selectedSiteId,
        effectiveAt: effectiveAt.toISOString(),
        payload,
        reason: changeReason.trim() || undefined,
      } satisfies ScheduleVersionRequestBody,
    );

    setActionLoading(null);
    if (!created) return;

    setActionSuccess(
      `Version ${compactVersionId(created.id)} planifiee pour ${formatDateTime(
        created.effectiveAt,
      )}.`,
    );
    await refreshDecisionConfigViews();
  }

  async function cancelScheduledVersion(
    version: DecisionEngineConfigVersion,
  ): Promise<void> {
    setActionLoading(`cancel-${version.id}`);
    setActionError(null);
    setActionSuccess(null);

    const cancelled = await postAdminAction<DecisionEngineConfigVersion>(
      ADMIN_ENDPOINTS.orgDecisionConfigVersionCancel(orgId, version.id),
      {
        reason: changeReason.trim() || undefined,
      } satisfies DecisionConfigActionBody,
    );

    setActionLoading(null);
    if (!cancelled) return;

    setActionSuccess(`Version ${compactVersionId(version.id)} annulee.`);
    await refreshDecisionConfigViews();
  }

  async function rollbackVersion(
    version: DecisionEngineConfigVersion,
  ): Promise<void> {
    setActionLoading(`rollback-${version.id}`);
    setActionError(null);
    setActionSuccess(null);

    const rollback = await postAdminAction<DecisionEngineConfigVersion>(
      ADMIN_ENDPOINTS.orgDecisionConfigVersionRollback(orgId, version.id),
      {
        reason: changeReason.trim() || undefined,
      } satisfies DecisionConfigActionBody,
    );

    setActionLoading(null);
    if (!rollback) return;

    setActionSuccess(
      `Rollback active via version ${compactVersionId(rollback.id)}.`,
    );
    await refreshDecisionConfigViews();
  }

  async function recomputeScenario(): Promise<void> {
    const alertId = recomputeAlertId.trim();
    if (alertId.length === 0) {
      setActionError("L'identifiant d'alerte est requis.");
      return;
    }

    setActionLoading("recompute");
    setActionError(null);
    setActionSuccess(null);

    const recompute = await postAdminAction<DecisionConfigRecomputeResponse>(
      ADMIN_ENDPOINTS.orgAlertScenarioRecompute(orgId, alertId),
      {},
    );

    setActionLoading(null);
    if (!recompute) return;

    setLastRecompute(recompute);
    setActionSuccess(`Scenarios recalcules pour ${recompute.alertId}.`);
  }

  async function refreshIntegrationViews(): Promise<void> {
    refetchIntegrations();
    refetchIngestCredentials();
    refetchRawEvents();
  }

  async function issueIngestCredential(): Promise<void> {
    if (!effectiveIntegrationId) {
      setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    setActionLoading("issue-ingest-credential");
    setActionError(null);
    setActionSuccess(null);
    setIssuedCredential(null);

    const issued =
      await postAdminAction<IntegrationIssueIngestCredentialResult>(
        ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
          orgId,
          effectiveIntegrationId,
        ),
        {
          label: ingestCredentialLabel.trim() || "Client outbound",
          requireSignature: true,
        },
      );

    setActionLoading(null);
    if (!issued) return;

    setIssuedCredential(issued);
    setActionSuccess(
      `Cle d'ingestion generee pour ${issued.credential.label}.`,
    );
    await refreshIntegrationViews();
  }

  async function revokeIngestCredential(credentialId: string): Promise<void> {
    if (!effectiveIntegrationId) {
      setActionError("Aucune connexion d'integration selectionnee.");
      return;
    }

    setActionLoading(`revoke-ingest-${credentialId}`);
    setActionError(null);
    setActionSuccess(null);

    const revoked = await postAdminAction<IntegrationIngestCredential>(
      ADMIN_ENDPOINTS.orgIntegrationIngestCredentialRevoke(
        orgId,
        effectiveIntegrationId,
        credentialId,
      ),
      {},
    );

    setActionLoading(null);
    if (!revoked) return;

    setActionSuccess(`Cle ${revoked.label} revoquee.`);
    await refreshIntegrationViews();
  }

  const costColumns: DataTableColumn<CostParam>[] = [
    {
      key: "category",
      label: "Categorie",
      render: (row) => (
        <span className="font-medium text-ink">{row.category}</span>
      ),
    },
    {
      key: "value",
      label: "Valeur",
      align: "right",
      render: (row) => <span>{row.value}</span>,
    },
    {
      key: "effectiveFrom",
      label: "Debut",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {new Date(row.effectiveFrom).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "effectiveUntil",
      label: "Fin",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {row.effectiveUntil
            ? new Date(row.effectiveUntil).toLocaleDateString("fr-FR")
            : "-"}
        </span>
      ),
    },
    {
      key: "siteName",
      label: "Site",
      render: (row) => <span>{row.siteName ?? "-"}</span>,
    },
  ];

  const proofColumns: DataTableColumn<ProofPack>[] = [
    {
      key: "name",
      label: "Nom",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span
          className={
            row.status === "generated"
              ? "text-success"
              : row.status === "pending"
                ? "text-primary"
                : "text-ink-tertiary"
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "generatedAt",
      label: "Genere le",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {row.generatedAt
            ? new Date(row.generatedAt).toLocaleDateString("fr-FR")
            : "-"}
        </span>
      ),
    },
    {
      key: "downloadUrl",
      label: "Telecharger",
      render: (row) => {
        const safeHref = sanitizeHttpHref(row.downloadUrl);
        return safeHref ? (
          <a
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:text-primary-700"
          >
            PDF
          </a>
        ) : (
          <span className="text-xs text-ink-placeholder">-</span>
        );
      },
    },
  ];

  const versionsColumns: DataTableColumn<DecisionEngineConfigVersion>[] = [
    {
      key: "id",
      label: "Version",
      render: (row) => (
        <span className="font-mono text-xs text-ink">
          {compactVersionId(row.id)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span
          className={
            row.status === "active"
              ? "text-success"
              : row.status === "scheduled"
                ? "text-primary"
                : "text-ink-tertiary"
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "effectiveAt",
      label: "Effet",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {formatDateTime(row.effectiveAt)}
        </span>
      ),
    },
    {
      key: "scope",
      label: "Scope",
      render: (row) => <span>{row.siteId ?? "Organisation"}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void rollbackVersion(row);
            }}
            disabled={!canManageConfig || actionLoading != null}
          >
            Rollback
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void cancelScheduledVersion(row);
            }}
            disabled={
              !canManageConfig ||
              row.status !== "scheduled" ||
              actionLoading != null
            }
          >
            Annuler
          </Button>
        </div>
      ),
    },
  ];

  const integrationColumns: DataTableColumn<IntegrationConnection>[] = [
    {
      key: "displayName",
      label: "Connexion",
      render: (row) => (
        <span className="font-medium text-ink">{row.displayName}</span>
      ),
    },
    { key: "vendor", label: "Vendor" },
    { key: "authMode", label: "Auth" },
    { key: "status", label: "Statut" },
    {
      key: "updatedAt",
      label: "Mise a jour",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {formatDateTime(row.updatedAt)}
        </span>
      ),
    },
  ];

  const ingestCredentialColumns: DataTableColumn<IntegrationIngestCredential>[] =
    [
      {
        key: "label",
        label: "Credential",
        render: (row) => (
          <span className="font-medium text-ink">{row.label}</span>
        ),
      },
      { key: "authMode", label: "Mode" },
      {
        key: "tokenPreview",
        label: "Preview",
        render: (row) => (
          <span className="font-mono text-xs text-ink">{row.tokenPreview}</span>
        ),
      },
      {
        key: "lastUsedAt",
        label: "Derniere utilisation",
        render: (row) => (
          <span className="text-xs text-ink-tertiary">
            {formatDateTime(row.lastUsedAt)}
          </span>
        ),
      },
      {
        key: "expiresAt",
        label: "Expire le",
        render: (row) => (
          <span className="text-xs text-ink-tertiary">
            {formatDateTime(row.expiresAt)}
          </span>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        render: (row) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void revokeIngestCredential(row.id);
            }}
            disabled={
              !canManageIntegrations ||
              row.revokedAt != null ||
              actionLoading != null
            }
          >
            Revoquer
          </Button>
        ),
      },
    ];

  const rawEventColumns: DataTableColumn<IntegrationRawEvent>[] = [
    { key: "sourceObject", label: "Objet" },
    { key: "sourceRecordId", label: "Record" },
    { key: "schemaVersion", label: "Schema" },
    {
      key: "processingStatus",
      label: "Traitement",
      render: (row) => <span>{row.processingStatus ?? "pending"}</span>,
    },
    {
      key: "sizeBytes",
      label: "Taille",
      align: "right",
      render: (row) => <span>{row.sizeBytes.toLocaleString("fr-FR")}</span>,
    },
    {
      key: "receivedAt",
      label: "Recu le",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {formatDateTime(row.receivedAt)}
        </span>
      ),
    },
  ];

  const orderedHorizons = useMemo(
    () =>
      [...(resolvedConfig?.payload?.horizons ?? [])].sort(
        (left, right) => left.rank - right.rank,
      ),
    [resolvedConfig],
  );

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">
        Configuration
      </h2>

      {(actionError || actionSuccess) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            actionError
              ? "border-warning-light bg-warning-light/20 text-warning-text"
              : "border-success/40 bg-success/10 text-success"
          }`}
        >
          {actionError ?? actionSuccess}
        </div>
      )}

      {!canManageConfig ? (
        <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
          Mode lecture seule. Permission requise pour planifier, annuler,
          rollbacker ou recalculer une configuration:{" "}
          <span className="font-medium text-ink">admin:org:write</span>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Parametres de cout
        </h3>
        {costLoading ? (
          <SkeletonCard />
        ) : costError ? (
          <ErrorFallback message={costError} onRetry={costRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={costColumns}
                data={costParams ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Moteur de recommandation
        </h3>
        {decisionConfigLoading ? (
          <SkeletonCard />
        ) : decisionConfigError ? (
          <ErrorFallback
            message={decisionConfigError}
            onRetry={refetchResolvedConfig}
          />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-xs text-ink-secondary">Version active</p>
                  <p className="font-mono text-sm text-ink">
                    {resolvedConfig
                      ? compactVersionId(resolvedConfig.versionId)
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-xs text-ink-secondary">
                    Horizon par defaut
                  </p>
                  <p className="text-sm font-medium text-ink">
                    {activeHorizon
                      ? `${activeHorizon.label} (${activeHorizon.days} jours)`
                      : "-"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-xs text-ink-secondary">Horizon actifs</p>
                  <p className="text-sm font-medium text-ink">
                    {resolvedConfig
                      ? (resolvedConfig.payload?.horizons ?? []).filter(
                          (horizon) => horizon.active,
                        ).length
                      : 0}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface px-3 py-2">
                  <p className="text-xs text-ink-secondary">Version suivante</p>
                  <p className="font-mono text-sm text-ink">
                    {resolvedConfig?.nextVersion
                      ? compactVersionId(resolvedConfig.nextVersion.id)
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  Horizons configures
                </p>
                <ul className="space-y-1 text-sm text-ink-secondary">
                  {orderedHorizons.map((horizon) => (
                    <li key={horizon.id}>
                      {horizon.label} ({horizon.id}) · {horizon.days} jours ·
                      rank {horizon.rank}
                      {horizon.active ? " · actif" : " · inactif"}
                      {horizon.isDefault ? " · defaut" : ""}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-ink">
                    Date d'effet
                  </span>
                  <input
                    type="datetime-local"
                    value={effectiveAtInput}
                    onChange={(event) =>
                      setEffectiveAtInput(event.target.value)
                    }
                    disabled={!canManageConfig}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-ink">
                    Motif (optionnel)
                  </span>
                  <input
                    type="text"
                    value={changeReason}
                    onChange={(event) => setChangeReason(event.target.value)}
                    placeholder="Mise a jour des poids recommandation"
                    disabled={!canManageConfig}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={() => {
                      void scheduleVersionFromCurrentConfig();
                    }}
                    disabled={
                      !canManageConfig ||
                      !resolvedConfig ||
                      actionLoading != null
                    }
                  >
                    Planifier version
                  </Button>
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-sm font-medium text-ink">
                  Payload decision-config (JSON)
                </span>
                <textarea
                  value={payloadDraft}
                  onChange={(event) => setPayloadDraft(event.target.value)}
                  rows={14}
                  disabled={!canManageConfig}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-ink">
                    Recalcul scenario alerte
                  </span>
                  <input
                    type="text"
                    value={recomputeAlertId}
                    onChange={(event) =>
                      setRecomputeAlertId(event.target.value)
                    }
                    placeholder="alt-001"
                    disabled={!canManageConfig}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      void recomputeScenario();
                    }}
                    disabled={!canManageConfig || actionLoading != null}
                  >
                    Recalculer
                  </Button>
                </div>
              </div>

              {lastRecompute && (
                <p className="text-xs text-ink-secondary">
                  Dernier recalcul: {lastRecompute.alertId} · recommande{" "}
                  {lastRecompute.recommendedOptionId ?? "-"} · policy{" "}
                  {compactVersionId(lastRecompute.recommendationPolicyVersion)}{" "}
                  · {formatDateTime(lastRecompute.recomputedAt)}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Versions decision-config
        </h3>
        {decisionConfigVersionsLoading ? (
          <SkeletonCard />
        ) : decisionConfigVersionsError ? (
          <ErrorFallback
            message={decisionConfigVersionsError}
            onRetry={refetchDecisionConfigVersions}
          />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={versionsColumns}
                data={decisionConfigVersions ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Integrations client
        </h3>
        {!canReadIntegrations ? (
          <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
            Permission requise:{" "}
            <span className="font-medium text-ink">
              admin:integrations:read
            </span>
          </div>
        ) : integrationsLoading ? (
          <SkeletonCard />
        ) : integrationsError ? (
          <ErrorFallback
            message={integrationsError}
            onRetry={refetchIntegrations}
          />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">
                  Connexions configurees
                </p>
                <DataTable
                  columns={integrationColumns}
                  data={integrationConnections ?? []}
                  getRowKey={(row) => row.id}
                />
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-ink">
                    Connexion active
                  </span>
                  <select
                    value={effectiveIntegrationId ?? ""}
                    onChange={(event) =>
                      setSelectedIntegrationId(event.target.value || null)
                    }
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  >
                    {(integrationConnections ?? []).map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.displayName} · {connection.vendor}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-ink">
                    Label de la cle
                  </span>
                  <input
                    type="text"
                    value={ingestCredentialLabel}
                    onChange={(event) =>
                      setIngestCredentialLabel(event.target.value)
                    }
                    disabled={!canManageIntegrations}
                    className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    void issueIngestCredential();
                  }}
                  disabled={
                    !canManageIntegrations ||
                    !effectiveIntegrationId ||
                    actionLoading != null
                  }
                >
                  Generer une cle d'ingestion
                </Button>
              </div>

              {issuedCredential && (
                <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm font-medium text-ink">
                    Credential pack a transmettre au client
                  </p>
                  <p className="text-xs text-ink-tertiary">
                    Ces secrets ne sont affiches qu'apres emission. Ils doivent
                    etre copies dans le CRM/WFM/iPaaS du client.
                  </p>
                  <div className="space-y-1 text-xs text-ink-secondary">
                    <p>
                      URL:{" "}
                      <span className="font-mono text-ink">
                        {issuedCredential.ingestUrl}
                      </span>
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
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Cles d'ingestion</p>
                {ingestCredentialsLoading ? (
                  <SkeletonCard />
                ) : ingestCredentialsError ? (
                  <ErrorFallback
                    message={ingestCredentialsError}
                    onRetry={refetchIngestCredentials}
                  />
                ) : (
                  <DataTable
                    columns={ingestCredentialColumns}
                    data={ingestCredentials ?? []}
                    getRowKey={(row) => row.id}
                  />
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Evenements recus</p>
                {rawEventsLoading ? (
                  <SkeletonCard />
                ) : rawEventsError ? (
                  <ErrorFallback
                    message={rawEventsError}
                    onRetry={refetchRawEvents}
                  />
                ) : (
                  <DataTable
                    columns={rawEventColumns}
                    data={rawEvents ?? []}
                    getRowKey={(row) => row.id}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Packs de preuves
        </h3>
        {proofLoading ? (
          <SkeletonCard />
        ) : proofError ? (
          <ErrorFallback message={proofError} onRetry={proofRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={proofColumns}
                data={proofPacks ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
