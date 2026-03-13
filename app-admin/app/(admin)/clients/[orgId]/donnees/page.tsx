"use client";

import { useMemo, useState } from "react";
import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  DataTable,
  StatCard,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { Database, CheckCircle, AlertTriangle, FileText } from "lucide-react";

interface CanonicalRecord {
  id: string;
  employeeId?: string;
  date?: string;
  absenceType?: string;
  hours?: number;
  siteName?: string;
  departmentName?: string;
}

interface QualityData {
  totalRecords?: number;
  validRecords?: number;
  duplicateRecords?: number;
  missingFields?: number;
  completenessRate?: number;
  qualityScore?: number;
}

interface IngestionLogEntry {
  id: string;
  fileName: string;
  status: string;
  rowsProcessed?: number;
  rowsRejected?: number;
  createdAt: string;
}

interface MedallionQualityReport {
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

const CANONICAL_COLUMNS: DataTableColumn<CanonicalRecord>[] = [
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

const INGESTION_COLUMNS: DataTableColumn<IngestionLogEntry>[] = [
  { key: "fileName", label: "Fichier" },
  {
    key: "status",
    label: "Statut",
    render: (row) => (
      <span
        className={
          row.status === "completed"
            ? "text-success"
            : row.status === "failed"
              ? "text-danger"
              : "text-primary"
        }
      >
        {row.status}
      </span>
    ),
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
    render: (row) => (
      <span className={row.rowsRejected ? "text-danger" : ""}>
        {row.rowsRejected ?? 0}
      </span>
    ),
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

export default function DonneesPage() {
  const { orgId, selectedSiteId } = useClientContext();

  const canonicalUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgCanonical(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgCanonical(orgId);

  const {
    data: canonical,
    loading: canonicalLoading,
    error: canonicalError,
    refetch: canonicalRefetch,
  } = useApiGet<CanonicalRecord[]>(canonicalUrl);

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
  } = useApiGet<IngestionLogEntry[]>(ADMIN_ENDPOINTS.orgIngestionLog(orgId));

  const {
    data: medallionReport,
    loading: medallionLoading,
    error: medallionError,
  } = useApiGet<MedallionQualityReport>(
    ADMIN_ENDPOINTS.orgMedallionQualityReport(orgId),
  );

  const {
    data: datasets,
    loading: datasetsLoading,
    error: datasetsError,
  } = useApiGet<AdminDatasetSummary[]>(ADMIN_ENDPOINTS.orgDatasets(orgId));

  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(
    null,
  );

  const effectiveDatasetId = useMemo(() => {
    if (selectedDatasetId) return selectedDatasetId;
    return datasets?.[0]?.id ?? null;
  }, [datasets, selectedDatasetId]);

  const {
    data: datasetData,
    loading: datasetDataLoading,
    error: datasetDataError,
  } = useApiGet<AdminDatasetDataResponse>(
    effectiveDatasetId
      ? ADMIN_ENDPOINTS.orgDatasetData(orgId, effectiveDatasetId)
      : null,
  );

  const {
    data: datasetFeatures,
    loading: datasetFeaturesLoading,
    error: datasetFeaturesError,
  } = useApiGet<AdminDatasetFeaturesResponse>(
    effectiveDatasetId
      ? ADMIN_ENDPOINTS.orgDatasetFeatures(orgId, effectiveDatasetId)
      : null,
  );

  const qualityColumnsCount = Object.keys(
    medallionReport?.silverQuality?.columns ?? {},
  ).length;

  const goldRows = datasetData?.rows ?? [];
  const goldColumns = useMemo(() => {
    const first = goldRows[0];
    if (!first || typeof first !== "object") return [];
    return Object.keys(first);
  }, [goldRows]);

  const goldTableColumns = useMemo<DataTableColumn<Record<string, unknown>>[]>(
    () =>
      goldColumns.map((column) => ({
        key: column,
        label: column,
        render: (row) => {
          const value = row[column];
          if (typeof value === "number") return value.toLocaleString("fr-FR");
          if (typeof value === "boolean") return value ? "true" : "false";
          return String(value ?? "");
        },
      })),
    [goldColumns],
  );

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Donnees</h2>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Rapport imputation & outliers (admin)
        </h3>
        {medallionLoading ? (
          <SkeletonCard />
        ) : medallionError ? (
          <p className="text-sm text-ink-tertiary">{medallionError}</p>
        ) : medallionReport ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Client Gold"
              value={medallionReport.clientSlug ?? "n/a"}
              icon={<Database className="h-4 w-4" />}
            />
            <StatCard
              label="Colonnes qualite suivies"
              value={String(qualityColumnsCount)}
              icon={<FileText className="h-4 w-4" />}
            />
            <StatCard
              label="Colonnes retirees du Gold"
              value={String(
                medallionReport.goldFeatureQuality
                  ?.removedFromGoldColumnsCount ??
                  medallionReport.goldFeatureQuality
                    ?.removed_from_gold_columns_count ??
                  0,
              )}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <StatCard
              label="Derniere execution"
              value={
                (medallionReport.lastRunSummary?.runAt ??
                medallionReport.lastRunSummary?.run_at)
                  ? new Date(
                      medallionReport.lastRunSummary?.runAt ??
                        medallionReport.lastRunSummary?.run_at ??
                        "",
                    ).toLocaleDateString("fr-FR")
                  : "-"
              }
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Qualite des donnees
        </h3>
        {qualityLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : qualityError ? (
          <p className="text-sm text-ink-tertiary">{qualityError}</p>
        ) : quality ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total enregistrements"
              value={String(quality.totalRecords ?? 0)}
              icon={<Database className="h-4 w-4" />}
            />
            <StatCard
              label="Enregistrements valides"
              value={String(quality.validRecords ?? 0)}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <StatCard
              label="Doublons"
              value={String(quality.duplicateRecords ?? 0)}
              icon={<AlertTriangle className="h-4 w-4" />}
              variant={
                quality.duplicateRecords && quality.duplicateRecords > 0
                  ? "warning"
                  : undefined
              }
            />
            <StatCard
              label="Score qualite"
              value={
                quality.qualityScore != null
                  ? `${Math.round(quality.qualityScore * 100)}%`
                  : "-"
              }
              icon={<FileText className="h-4 w-4" />}
            />
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Explorateur Gold
        </h3>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-4 p-4">
            {datasetsLoading ? (
              <SkeletonCard />
            ) : datasetsError ? (
              <p className="text-sm text-ink-tertiary">{datasetsError}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-ink-secondary">
                    Dataset
                  </span>
                  <select
                    value={effectiveDatasetId ?? ""}
                    onChange={(event) =>
                      setSelectedDatasetId(event.target.value || null)
                    }
                    className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-ink"
                  >
                    {(datasets ?? []).map((dataset) => (
                      <option key={dataset.id} value={dataset.id}>
                        {dataset.name}
                      </option>
                    ))}
                  </select>
                </label>

                <StatCard
                  label="Lignes"
                  value={String(goldRows.length)}
                  icon={<Database className="h-4 w-4" />}
                />
                <StatCard
                  label="Colonnes"
                  value={String(goldColumns.length)}
                  icon={<FileText className="h-4 w-4" />}
                />
                <StatCard
                  label="Features"
                  value={String(datasetFeatures?.features?.length ?? 0)}
                  icon={<CheckCircle className="h-4 w-4" />}
                />
              </div>
            )}

            {datasetDataError && (
              <p className="text-sm text-ink-tertiary">{datasetDataError}</p>
            )}
            {datasetFeaturesError && (
              <p className="text-sm text-ink-tertiary">
                {datasetFeaturesError}
              </p>
            )}

            {datasetDataLoading ? (
              <SkeletonCard />
            ) : goldTableColumns.length > 0 ? (
              <DataTable
                columns={goldTableColumns}
                data={goldRows}
                getRowKey={(row, index) =>
                  `${effectiveDatasetId ?? "dataset"}-${index}`
                }
                emptyMessage="Aucune ligne disponible"
              />
            ) : (
              <p className="text-sm text-ink-secondary">
                Aucune donnee Gold disponible.
              </p>
            )}

            <div>
              <p className="mb-2 text-xs font-medium text-ink-secondary">
                Features derivees
              </p>
              {datasetFeaturesLoading ? (
                <p className="text-sm text-ink-secondary">Chargement...</p>
              ) : (datasetFeatures?.features?.length ?? 0) === 0 ? (
                <p className="text-sm text-ink-secondary">
                  Aucune feature exposee.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(datasetFeatures?.features ?? []).map((feature) => (
                    <span
                      key={feature}
                      className="rounded-full border border-border bg-surface-sunken px-2 py-1 text-xs text-ink"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Donnees consolidees
        </h3>
        {canonicalLoading ? (
          <SkeletonCard />
        ) : canonicalError ? (
          <ErrorFallback message={canonicalError} onRetry={canonicalRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={CANONICAL_COLUMNS}
                data={canonical ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Journal d&apos;ingestion
        </h3>
        {ingestionLoading ? (
          <SkeletonCard />
        ) : ingestionError ? (
          <ErrorFallback message={ingestionError} onRetry={ingestionRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={INGESTION_COLUMNS}
                data={ingestion ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
