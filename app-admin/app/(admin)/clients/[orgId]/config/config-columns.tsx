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

type FormatDateTime = (value: string | undefined | null) => string;

function renderMutedDateCell(value: string) {
  return (
    <span className="text-xs text-ink-tertiary">
      {new Date(value).toLocaleDateString("fr-FR")}
    </span>
  );
}

function renderOptionalDateCell(value?: string | null) {
  if (!value) {
    return <span className="text-xs text-ink-tertiary">-</span>;
  }

  return renderMutedDateCell(value);
}

function renderDateTimeCell(
  value: string | undefined | null,
  formatDateTime: FormatDateTime,
) {
  return (
    <span className="text-xs text-ink-tertiary">{formatDateTime(value)}</span>
  );
}

function renderMediumText(value: string) {
  return <span className="font-medium text-ink">{value}</span>;
}

function renderNumberCell(value: number) {
  return <span>{value}</span>;
}

function renderLocalizedNumberCell(value: number) {
  return <span>{value.toLocaleString("fr-FR")}</span>;
}

function resolveProofStatusClass(status: string) {
  if (status === "generated") {
    return "text-success";
  }
  if (status === "pending") {
    return "text-primary";
  }
  return "text-ink-tertiary";
}

function resolveVersionStatusClass(status: string) {
  if (status === "active") {
    return "text-success";
  }
  if (status === "scheduled") {
    return "text-primary";
  }
  return "text-ink-tertiary";
}

export function buildCostColumns(): DataTableColumn<CostParam>[] {
  return [
    {
      key: "category",
      label: "Categorie",
      render: (row) => renderMediumText(row.category),
    },
    {
      key: "value",
      label: "Valeur",
      align: "right",
      render: (row) => renderNumberCell(row.value),
    },
    {
      key: "effectiveFrom",
      label: "Debut",
      render: (row) => renderMutedDateCell(row.effectiveFrom),
    },
    {
      key: "effectiveUntil",
      label: "Fin",
      render: (row) => renderOptionalDateCell(row.effectiveUntil),
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
      render: (row) => renderMediumText(row.name),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span className={resolveProofStatusClass(row.status)}>
          {row.status}
        </span>
      ),
    },
    {
      key: "generatedAt",
      label: "Genere le",
      render: (row) => renderOptionalDateCell(row.generatedAt),
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
  formatDateTime: FormatDateTime;
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
        <span className={resolveVersionStatusClass(row.status)}>
          {row.status}
        </span>
      ),
    },
    {
      key: "effectiveAt",
      label: "Effet",
      render: (row) => renderDateTimeCell(row.effectiveAt, formatDateTime),
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
  formatDateTime: FormatDateTime;
}): DataTableColumn<IntegrationConnection>[] {
  return [
    {
      key: "displayName",
      label: "Connexion",
      render: (row) => renderMediumText(row.displayName),
    },
    { key: "vendor", label: "Vendor" },
    { key: "authMode", label: "Auth" },
    { key: "status", label: "Statut" },
    {
      key: "updatedAt",
      label: "Mise a jour",
      render: (row) => renderDateTimeCell(row.updatedAt, formatDateTime),
    },
  ];
}

export function buildIngestCredentialColumns({
  formatDateTime,
  canManageIntegrations,
  actionLoading,
  onRevoke,
}: {
  formatDateTime: FormatDateTime;
  canManageIntegrations: boolean;
  actionLoading: string | null;
  onRevoke: (credentialId: string) => void;
}): DataTableColumn<IntegrationIngestCredential>[] {
  return [
    {
      key: "label",
      label: "Credential",
      render: (row) => renderMediumText(row.label),
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
      render: (row) => renderDateTimeCell(row.lastUsedAt, formatDateTime),
    },
    {
      key: "expiresAt",
      label: "Expire le",
      render: (row) => renderDateTimeCell(row.expiresAt, formatDateTime),
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
  formatDateTime: FormatDateTime;
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
      render: (row) => renderLocalizedNumberCell(row.sizeBytes),
    },
    {
      key: "receivedAt",
      label: "Recu le",
      render: (row) => renderDateTimeCell(row.receivedAt, formatDateTime),
    },
  ];
}

export function buildSyncRunColumns({
  formatDateTime,
}: {
  formatDateTime: FormatDateTime;
}): DataTableColumn<IntegrationSyncRun>[] {
  return [
    {
      key: "triggerType",
      label: "Trigger",
      render: (row) => renderMediumText(row.triggerType),
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
      render: (row) => renderLocalizedNumberCell(row.recordsFetched),
    },
    {
      key: "recordsWritten",
      label: "Records ecrits",
      align: "right",
      render: (row) => renderLocalizedNumberCell(row.recordsWritten),
    },
    {
      key: "createdAt",
      label: "Cree le",
      render: (row) => renderDateTimeCell(row.createdAt, formatDateTime),
    },
  ];
}
