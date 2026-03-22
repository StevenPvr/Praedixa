"use client";

import { useMemo, useState } from "react";
import type { DataTableColumn } from "@praedixa/ui";

import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  ADMIN_WORKSPACE_FEATURE_GATES,
  featureUnavailableMessage,
} from "@/lib/runtime/admin-workspace-feature-gates";

import { useClientContext } from "../client-context";

export interface CanonicalRecord {
  id: string;
  employeeId?: string;
  date?: string;
  absenceType?: string;
  hours?: number;
  siteName?: string;
  departmentName?: string;
}

export interface QualityData {
  totalRecords?: number;
  validRecords?: number;
  duplicateRecords?: number;
  missingFields?: number;
  completenessRate?: number;
  qualityScore?: number;
}

export interface IngestionLogEntry {
  id: string;
  fileName: string;
  status: string;
  rowsProcessed?: number;
  rowsRejected?: number;
  createdAt: string;
}

export interface MedallionQualityReport {
  clientSlug?: string | null;
  goldRevision?: string;
  silverQuality?: {
    columns?: Record<
      string,
      {
        missingRate?: number;
        missingMechanism?: string;
        imputedCount?: number;
        unresolvedMissingCount?: number;
        outliersClamped?: number;
      }
    >;
  };
  goldFeatureQuality?: {
    removed_from_gold_columns_count?: number;
    removedFromGoldColumnsCount?: number;
    removed_from_gold_columns?: string[];
    removedFromGoldColumns?: string[];
  };
  lastRunSummary?: {
    run_at?: string;
    runAt?: string;
    silver_rows?: number;
    silverRows?: number;
    gold_rows?: number;
    goldRows?: number;
  };
}

interface AdminDatasetSummary {
  id: string;
  name: string;
  status?: string;
  rowCount?: number;
  updatedAt?: string;
}

interface AdminDatasetDataResponse {
  datasetId: string;
  rows: Record<string, unknown>[];
}

interface AdminDatasetFeaturesResponse {
  datasetId: string;
  features: string[];
}

export const CANONICAL_COLUMNS: DataTableColumn<CanonicalRecord>[] = [
  { key: "employeeId", label: "Employe" },
  { key: "date", label: "Date" },
  { key: "absenceType", label: "Type" },
  {
    key: "hours",
    label: "Heures",
    align: "right",
    render: (row) => <span>{row.hours ?? "-"}</span>,
  },
  { key: "siteName", label: "Site" },
  { key: "departmentName", label: "Departement" },
];

export const INGESTION_COLUMNS: DataTableColumn<IngestionLogEntry>[] = [
  { key: "fileName", label: "Fichier" },
  {
    key: "status",
    label: "Statut",
    render: (row) => {
      let statusClassName = "text-primary";
      if (row.status === "completed") {
        statusClassName = "text-success";
      } else if (row.status === "failed") {
        statusClassName = "text-danger";
      }
      return <span className={statusClassName}>{row.status}</span>;
    },
  },
  {
    key: "rowsProcessed",
    label: "Lignes traitees",
    align: "right",
    render: (row) => <span>{row.rowsProcessed ?? 0}</span>,
  },
  {
    key: "rowsRejected",
    label: "Rejets",
    align: "right",
    render: (row) => {
      const hasRejectedRows = (row.rowsRejected ?? 0) > 0;
      const rejectedRowsClassName = hasRejectedRows ? "text-danger" : "";
      return (
        <span className={rejectedRowsClassName}>{row.rowsRejected ?? 0}</span>
      );
    },
  },
  {
    key: "createdAt",
    label: "Date",
    render: (row) => (
      <span className="text-xs text-ink-tertiary">
        {new Date(row.createdAt).toLocaleDateString("fr-FR")}
      </span>
    ),
  },
];

function buildCanonicalUrl(orgId: string, selectedSiteId: string | null) {
  if (!selectedSiteId) {
    return ADMIN_ENDPOINTS.orgCanonical(orgId);
  }

  return `${ADMIN_ENDPOINTS.orgCanonical(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`;
}

function buildGoldTableColumns(
  goldColumns: string[],
): DataTableColumn<Record<string, unknown>>[] {
  return goldColumns.map((column) => ({
    key: column,
    label: column,
    render: (row) => {
      const value = row[column];
      if (typeof value === "number") {
        return value.toLocaleString("fr-FR");
      }
      if (typeof value === "boolean") {
        return value ? "true" : "false";
      }
      return String(value ?? "");
    },
  }));
}

export function useDonneesPageModel() {
  const { orgId, selectedSiteId } = useClientContext();
  const datasetsEnabled = ADMIN_WORKSPACE_FEATURE_GATES.datasetsWorkspace;
  const ingestionLogEnabled =
    ADMIN_WORKSPACE_FEATURE_GATES.ingestionLogWorkspace;
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    null,
  );

  const {
    data: canonical,
    loading: canonicalLoading,
    error: canonicalError,
    refetch: canonicalRefetch,
  } = useApiGet<CanonicalRecord[]>(buildCanonicalUrl(orgId, selectedSiteId));

  const {
    data: quality,
    loading: qualityLoading,
    error: qualityError,
  } = useApiGet<QualityData>(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId));

  const {
    data: ingestion,
    loading: ingestionLoading,
    error: ingestionError,
    refetch: ingestionRefetch,
  } = useApiGet<IngestionLogEntry[]>(
    ingestionLogEnabled ? ADMIN_ENDPOINTS.orgIngestionLog(orgId) : null,
  );

  const {
    data: medallionReport,
    loading: medallionLoading,
    error: medallionError,
  } = useApiGet<MedallionQualityReport>(
    datasetsEnabled ? ADMIN_ENDPOINTS.orgMedallionQualityReport(orgId) : null,
  );

  const {
    data: datasets,
    loading: datasetsLoading,
    error: datasetsError,
  } = useApiGet<AdminDatasetSummary[]>(
    datasetsEnabled ? ADMIN_ENDPOINTS.orgDatasets(orgId) : null,
  );

  const effectiveDatasetId = useMemo(() => {
    if (selectedDatasetId) {
      return selectedDatasetId;
    }
    return datasets?.[0]?.id ?? null;
  }, [datasets, selectedDatasetId]);

  const {
    data: datasetData,
    loading: datasetDataLoading,
    error: datasetDataError,
  } = useApiGet<AdminDatasetDataResponse>(
    datasetsEnabled && effectiveDatasetId != null
      ? ADMIN_ENDPOINTS.orgDatasetData(orgId, effectiveDatasetId)
      : null,
  );

  const {
    data: datasetFeatures,
    loading: datasetFeaturesLoading,
    error: datasetFeaturesError,
  } = useApiGet<AdminDatasetFeaturesResponse>(
    datasetsEnabled && effectiveDatasetId != null
      ? ADMIN_ENDPOINTS.orgDatasetFeatures(orgId, effectiveDatasetId)
      : null,
  );

  const qualityColumnsCount = Object.keys(
    medallionReport?.silverQuality?.columns ?? {},
  ).length;

  const goldRows = datasetData?.rows ?? [];
  const goldColumns = useMemo(() => {
    const firstRow = goldRows[0];
    if (!firstRow || typeof firstRow !== "object") {
      return [];
    }
    return Object.keys(firstRow);
  }, [goldRows]);

  const goldTableColumns = useMemo(
    () => buildGoldTableColumns(goldColumns),
    [goldColumns],
  );

  return {
    datasetsEnabled,
    ingestionLogEnabled,
    canonical,
    canonicalLoading,
    canonicalError,
    canonicalRefetch,
    quality,
    qualityLoading,
    qualityError,
    ingestion,
    ingestionLoading,
    ingestionError,
    ingestionRefetch,
    medallionReport,
    medallionLoading,
    medallionError,
    datasets,
    datasetsLoading,
    datasetsError,
    selectedDatasetId,
    setSelectedDatasetId,
    effectiveDatasetId,
    datasetDataLoading,
    datasetDataError,
    datasetFeatures,
    datasetFeaturesLoading,
    datasetFeaturesError,
    qualityColumnsCount,
    goldRows,
    goldColumns,
    goldTableColumns,
    medallionUnavailableMessage: featureUnavailableMessage(
      "Le rapport imputation/outliers et le medallion quality report",
    ),
    datasetsUnavailableMessage: featureUnavailableMessage(
      "L'explorateur Gold, les datasets et les features admin",
    ),
    ingestionUnavailableMessage: featureUnavailableMessage(
      "Le journal d'ingestion admin",
    ),
  };
}
