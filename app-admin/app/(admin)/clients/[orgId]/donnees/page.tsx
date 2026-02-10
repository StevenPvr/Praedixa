"use client";

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
  errorMessage?: string;
}

export default function DonneesPage() {
  const { orgId, selectedSiteId } = useClientContext();

  const canonicalUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgCanonical(orgId)}?site_id=${selectedSiteId}`
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

  const canonicalColumns: DataTableColumn<CanonicalRecord>[] = [
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

  const ingestionColumns: DataTableColumn<IngestionLogEntry>[] = [
    { key: "fileName", label: "Fichier" },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span
          className={
            row.status === "completed"
              ? "text-green-600"
              : row.status === "failed"
                ? "text-red-500"
                : "text-amber-500"
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
        <span className={row.rowsRejected ? "text-red-500" : ""}>
          {row.rowsRejected ?? 0}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Date",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-neutral-900">
        Donnees
      </h2>

      {/* Data Quality */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
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
          <p className="text-sm text-neutral-500">{qualityError}</p>
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

      {/* Canonical Data */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
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
                columns={canonicalColumns}
                data={canonical ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ingestion Logs */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
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
                columns={ingestionColumns}
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
