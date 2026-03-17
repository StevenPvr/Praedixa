import type { DecisionEngineConfigVersion } from "@praedixa/shared-types";
import { Button, type DataTableColumn } from "@praedixa/ui";

import { sanitizeHttpHref } from "@/lib/security/navigation";

import type {
  CostParam,
  IntegrationConnection,
  IntegrationIngestCredential,
  IntegrationRawEvent,
  IntegrationSyncRun,
  ProofPack,
} from "./config-types";

function renderDateCell(value: string) {
  return (
    <span className="text-xs text-ink-tertiary">
      {new Date(value).toLocaleDateString("fr-FR")}
    </span>
  );
}

export function buildCostColumns(): DataTableColumn<CostParam>[] {
  return [
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
      render: (row) => renderDateCell(row.effectiveFrom),
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
}

export function buildProofColumns(): DataTableColumn<ProofPack>[] {
  return [
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
}

export function buildVersionColumns({
  compactVersionId,
  formatDateTime,
  canManageConfig,
  actionLoading,
  onRollback,
  onCancel,
}: {
  compactVersionId: (versionId: string) => string;
  formatDateTime: (value: string | undefined | null) => string;
  canManageConfig: boolean;
  actionLoading: string | null;
  onRollback: (version: DecisionEngineConfigVersion) => void;
  onCancel: (version: DecisionEngineConfigVersion) => void;
}): DataTableColumn<DecisionEngineConfigVersion>[] {
  return [
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
            onClick={() => onRollback(row)}
            disabled={!canManageConfig || actionLoading != null}
          >
            Rollback
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCancel(row)}
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
}

export function buildIntegrationColumns({
  formatDateTime,
}: {
  formatDateTime: (value: string | undefined | null) => string;
}): DataTableColumn<IntegrationConnection>[] {
  return [
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
}

export function buildIngestCredentialColumns({
  formatDateTime,
  canManageIntegrations,
  actionLoading,
  onRevoke,
}: {
  formatDateTime: (value: string | undefined | null) => string;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  onRevoke: (credentialId: string) => void;
}): DataTableColumn<IntegrationIngestCredential>[] {
  return [
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
          onClick={() => onRevoke(row.id)}
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
}

export function buildRawEventColumns({
  formatDateTime,
}: {
  formatDateTime: (value: string | undefined | null) => string;
}): DataTableColumn<IntegrationRawEvent>[] {
  return [
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
}

export function buildSyncRunColumns({
  formatDateTime,
}: {
  formatDateTime: (value: string | undefined | null) => string;
}): DataTableColumn<IntegrationSyncRun>[] {
  return [
    {
      key: "triggerType",
      label: "Trigger",
      render: (row) => (
        <span className="font-medium text-ink">{row.triggerType}</span>
      ),
    },
    { key: "status", label: "Statut" },
    {
      key: "sourceWindow",
      label: "Fenetre source",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {row.sourceWindowStart && row.sourceWindowEnd
            ? `${formatDateTime(row.sourceWindowStart)} -> ${formatDateTime(row.sourceWindowEnd)}`
            : "-"}
        </span>
      ),
    },
    {
      key: "recordsFetched",
      label: "Records lus",
      align: "right",
      render: (row) => (
        <span>{row.recordsFetched.toLocaleString("fr-FR")}</span>
      ),
    },
    {
      key: "recordsWritten",
      label: "Records ecrits",
      align: "right",
      render: (row) => (
        <span>{row.recordsWritten.toLocaleString("fr-FR")}</span>
      ),
    },
    {
      key: "createdAt",
      label: "Cree le",
      render: (row) => (
        <span className="text-xs text-ink-tertiary">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
  ];
}
