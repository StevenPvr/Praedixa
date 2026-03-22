"use client";

import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Database, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";

import {
  CANONICAL_COLUMNS,
  INGESTION_COLUMNS,
  type CanonicalRecord,
  type IngestionLogEntry,
  type MedallionQualityReport,
  type QualityData,
} from "./donnees-page-model";
import { DonneesGoldExplorerCard } from "./donnees-gold-explorer-card";

type DonneesSummarySectionProps = {
  title: string;
  children: ReactNode;
};

function DonneesSummarySection(props: Readonly<DonneesSummarySectionProps>) {
  const { title, children } = props;
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">{title}</h3>
      {children}
    </div>
  );
}

function formatLastRunDate(report: MedallionQualityReport): string {
  const lastRunAt =
    report.lastRunSummary?.runAt ?? report.lastRunSummary?.run_at ?? null;
  if (!lastRunAt) {
    return "-";
  }
  return new Date(lastRunAt).toLocaleDateString("fr-FR");
}

function readRemovedGoldColumnsCount(report: MedallionQualityReport): number {
  return (
    report.goldFeatureQuality?.removedFromGoldColumnsCount ??
    report.goldFeatureQuality?.removed_from_gold_columns_count ??
    0
  );
}

type DonneesMedallionSectionProps = {
  datasetsEnabled: boolean;
  loading: boolean;
  error: string | null;
  report: MedallionQualityReport | null;
  qualityColumnsCount: number;
  unavailableMessage: string;
};

export function DonneesMedallionSection({
  datasetsEnabled,
  loading,
  error,
  report,
  qualityColumnsCount,
  unavailableMessage,
}: Readonly<DonneesMedallionSectionProps>) {
  let content: ReactNode = null;
  if (loading) {
    content = <SkeletonCard />;
  } else if (datasetsEnabled === false) {
    content = <p className="text-sm text-ink-tertiary">{unavailableMessage}</p>;
  } else if (error) {
    content = <p className="text-sm text-ink-tertiary">{error}</p>;
  } else if (report) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Client Gold"
          value={report.clientSlug ?? "n/a"}
          icon={<Database className="h-4 w-4" />}
        />
        <StatCard
          label="Colonnes qualite suivies"
          value={String(qualityColumnsCount)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Colonnes retirees du Gold"
          value={String(readRemovedGoldColumnsCount(report))}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <StatCard
          label="Derniere execution"
          value={formatLastRunDate(report)}
          icon={<CheckCircle className="h-4 w-4" />}
        />
      </div>
    );
  }

  return (
    <DonneesSummarySection title="Rapport imputation & outliers (admin)">
      {content}
    </DonneesSummarySection>
  );
}

type DonneesQualitySectionProps = {
  loading: boolean;
  error: string | null;
  quality: QualityData | null;
};

export function DonneesQualitySection({
  loading,
  error,
  quality,
}: Readonly<DonneesQualitySectionProps>) {
  const duplicateRecordsValue = quality?.duplicateRecords;
  const hasDuplicateRecords = duplicateRecordsValue != null;
  const duplicateVariant =
    hasDuplicateRecords && duplicateRecordsValue > 0 ? "warning" : undefined;
  const qualityScoreValue = quality?.qualityScore;
  const hasQualityScore = qualityScoreValue != null;
  const qualityScore = hasQualityScore
    ? `${Math.round(qualityScoreValue * 100)}%`
    : "-";
  let content: ReactNode = null;

  if (loading) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  } else if (error) {
    content = <p className="text-sm text-ink-tertiary">{error}</p>;
  } else if (quality) {
    content = (
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
          variant={duplicateVariant}
        />
        <StatCard
          label="Score qualite"
          value={qualityScore}
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
    );
  }

  return (
    <DonneesSummarySection title="Qualite des donnees">
      {content}
    </DonneesSummarySection>
  );
}

type DonneesGoldExplorerSectionProps = {
  datasetsEnabled: boolean;
  loading: boolean;
  error: string | null;
  datasets: { id: string; name: string }[] | null;
  effectiveDatasetId: string | null;
  onDatasetChange: (datasetId: string | null) => void;
  goldRows: Record<string, unknown>[];
  goldColumns: string[];
  goldTableColumns: DataTableColumn<Record<string, unknown>>[];
  datasetDataLoading: boolean;
  datasetDataError: string | null;
  datasetFeatures: { features: string[] } | null;
  datasetFeaturesLoading: boolean;
  datasetFeaturesError: string | null;
  unavailableMessage: string;
};

export function DonneesGoldExplorerSection({
  datasetsEnabled,
  loading,
  error,
  datasets,
  effectiveDatasetId,
  onDatasetChange,
  goldRows,
  goldColumns,
  goldTableColumns,
  datasetDataLoading,
  datasetDataError,
  datasetFeatures,
  datasetFeaturesLoading,
  datasetFeaturesError,
  unavailableMessage,
}: Readonly<DonneesGoldExplorerSectionProps>) {
  let explorerContent: ReactNode;
  if (loading) {
    explorerContent = <SkeletonCard />;
  } else if (datasetsEnabled === false) {
    explorerContent = (
      <p className="text-sm text-ink-tertiary">{unavailableMessage}</p>
    );
  } else if (error) {
    explorerContent = <p className="text-sm text-ink-tertiary">{error}</p>;
  } else {
    explorerContent = (
      <DonneesGoldExplorerCard
        datasets={datasets}
        effectiveDatasetId={effectiveDatasetId}
        onDatasetChange={onDatasetChange}
        goldRows={goldRows}
        goldColumns={goldColumns}
        goldTableColumns={goldTableColumns}
        datasetDataLoading={datasetDataLoading}
        datasetFeatures={datasetFeatures}
        datasetFeaturesLoading={datasetFeaturesLoading}
      />
    );
  }

  return (
    <DonneesSummarySection title="Explorateur Gold">
      {explorerContent}
      {datasetDataError ? (
        <p className="text-sm text-ink-tertiary">{datasetDataError}</p>
      ) : null}
      {datasetFeaturesError ? (
        <p className="text-sm text-ink-tertiary">{datasetFeaturesError}</p>
      ) : null}
    </DonneesSummarySection>
  );
}

type DonneesCanonicalSectionProps = {
  loading: boolean;
  error: string | null;
  canonical: CanonicalRecord[] | null;
  onRetry: () => void;
};

export function DonneesCanonicalSection({
  loading,
  error,
  canonical,
  onRetry,
}: Readonly<DonneesCanonicalSectionProps>) {
  let content: ReactNode;
  if (loading) {
    content = <SkeletonCard />;
  } else if (error) {
    content = <ErrorFallback message={error} onRetry={onRetry} />;
  } else {
    content = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <DataTable
            columns={CANONICAL_COLUMNS}
            data={canonical ?? []}
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <DonneesSummarySection title="Donnees consolidees">
      {content}
    </DonneesSummarySection>
  );
}

type DonneesIngestionSectionProps = {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  ingestion: IngestionLogEntry[] | null;
  onRetry: () => void;
  unavailableMessage: string;
};

export function DonneesIngestionSection({
  enabled,
  loading,
  error,
  ingestion,
  onRetry,
  unavailableMessage,
}: Readonly<DonneesIngestionSectionProps>) {
  let content: ReactNode;
  if (loading) {
    content = <SkeletonCard />;
  } else if (enabled === false) {
    content = <ErrorFallback message={unavailableMessage} />;
  } else if (error) {
    content = <ErrorFallback message={error} onRetry={onRetry} />;
  } else {
    content = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <DataTable
            columns={INGESTION_COLUMNS}
            data={ingestion ?? []}
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <DonneesSummarySection title="Journal d'ingestion">
      {content}
    </DonneesSummarySection>
  );
}
