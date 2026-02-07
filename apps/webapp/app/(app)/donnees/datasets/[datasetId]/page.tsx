"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader, SkeletonTable, SkeletonCard } from "@praedixa/ui";
import type {
  DatasetDetailResponse,
  DatasetDataPreviewResponse,
  IngestionHistoryResponse,
} from "@praedixa/shared-types";
import { useApiGet } from "@/hooks/use-api";
import { isUuid } from "@/lib/uuid";
import { ErrorFallback } from "@/components/error-fallback";
import { DatasetStatusBadge } from "@/components/donnees/dataset-status-badge";
import { ColumnMetadataTable } from "@/components/donnees/column-metadata-table";
import { DatasetTable } from "@/components/donnees/dataset-table";
import { IngestionHistoryList } from "@/components/donnees/ingestion-history-list";

const PREVIEW_PAGE_SIZE = 25;

export default function DatasetDetailPage() {
  const params = useParams<{ datasetId: string }>();
  const datasetId = params.datasetId;
  const [previewPage, setPreviewPage] = useState(1);

  const safeId = isUuid(datasetId) ? datasetId : null;

  const {
    data: dataset,
    loading: datasetLoading,
    error: datasetError,
    refetch: refetchDataset,
  } = useApiGet<DatasetDetailResponse>(
    safeId ? `/api/v1/datasets/${encodeURIComponent(safeId)}` : null,
  );

  const {
    data: preview,
    loading: previewLoading,
    error: previewError,
    refetch: refetchPreview,
  } = useApiGet<DatasetDataPreviewResponse>(
    safeId
      ? `/api/v1/datasets/${encodeURIComponent(safeId)}/data?page=${previewPage}&pageSize=${PREVIEW_PAGE_SIZE}`
      : null,
  );

  const {
    data: ingestion,
    loading: ingestionLoading,
    error: ingestionError,
    refetch: refetchIngestion,
  } = useApiGet<IngestionHistoryResponse>(
    safeId
      ? `/api/v1/datasets/${encodeURIComponent(safeId)}/ingestion-log`
      : null,
  );

  if (!safeId) {
    return <ErrorFallback message="Identifiant de dataset invalide." />;
  }

  const breadcrumbs = [
    { label: "Donnees", href: "/donnees" },
    { label: "Datasets", href: "/donnees/datasets" },
    { label: dataset?.name ?? "...", href: "#" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      {datasetLoading ? (
        <SkeletonCard />
      ) : datasetError ? (
        <ErrorFallback message={datasetError} onRetry={refetchDataset} />
      ) : dataset ? (
        <>
          <PageHeader title={dataset.name} breadcrumbs={breadcrumbs}>
            <DatasetStatusBadge
              status={
                dataset.status as
                  | "active"
                  | "pending"
                  | "migrating"
                  | "archived"
              }
            />
          </PageHeader>

          {/* Metadata summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetadataItem label="Table" value={dataset.tableName} />
            <MetadataItem
              label="Index temporel"
              value={dataset.temporalIndex}
            />
            <MetadataItem
              label="Regroupements"
              value={dataset.groupBy.join(", ") || "Aucun"}
            />
            <MetadataItem
              label="Lignes"
              value={dataset.rowCount.toLocaleString("fr-FR")}
            />
          </div>

          {/* Columns metadata */}
          <section aria-label="Schema des colonnes">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">
              Schema des colonnes
            </h2>
            <ColumnMetadataTable data={dataset.columns} />
          </section>
        </>
      ) : null}

      {/* Data preview */}
      <section aria-label="Apercu des donnees">
        <h2 className="mb-3 text-lg font-semibold text-charcoal">
          Apercu des donnees
        </h2>
        {previewError ? (
          <ErrorFallback message={previewError} onRetry={refetchPreview} />
        ) : previewLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : preview ? (
          <DatasetTable
            columns={preview.columns}
            rows={preview.rows}
            maskedColumns={preview.maskedColumns}
            total={preview.total}
            page={previewPage}
            pageSize={PREVIEW_PAGE_SIZE}
            onPageChange={setPreviewPage}
          />
        ) : null}
      </section>

      {/* Ingestion history */}
      <section aria-label="Historique d'ingestion">
        <h2 className="mb-3 text-lg font-semibold text-charcoal">
          Historique d&apos;ingestion
        </h2>
        {ingestionError ? (
          <ErrorFallback message={ingestionError} onRetry={refetchIngestion} />
        ) : ingestionLoading ? (
          <SkeletonTable rows={3} columns={4} />
        ) : ingestion ? (
          <div className="rounded-card border border-gray-200 bg-card">
            <IngestionHistoryList entries={ingestion.entries} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-gray-200 bg-card px-4 py-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-charcoal">{value}</p>
    </div>
  );
}
