"use client";

import { CheckCircle, Database, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";

type DonneesGoldExplorerCardProps = {
  datasets: { id: string; name: string }[] | null;
  effectiveDatasetId: string | null;
  onDatasetChange: (datasetId: string | null) => void;
  goldRows: Record<string, unknown>[];
  goldColumns: string[];
  goldTableColumns: DataTableColumn<Record<string, unknown>>[];
  datasetDataLoading: boolean;
  datasetFeatures: { features: string[] } | null;
  datasetFeaturesLoading: boolean;
};

type DatasetSelectorProps = {
  datasets: { id: string; name: string }[] | null;
  effectiveDatasetId: string | null;
  onDatasetChange: (datasetId: string | null) => void;
};

type GoldDatasetStatsProps = {
  goldRows: Record<string, unknown>[];
  goldColumns: string[];
  featureCount: number;
};

type GoldRowsTableProps = {
  goldTableColumns: DataTableColumn<Record<string, unknown>>[];
  goldRows: Record<string, unknown>[];
  effectiveDatasetId: string | null;
  datasetDataLoading: boolean;
};

type GoldFeaturesListProps = {
  datasetFeatures: { features: string[] } | null;
  datasetFeaturesLoading: boolean;
};

function DatasetSelector(props: Readonly<DatasetSelectorProps>) {
  const { datasets, effectiveDatasetId, onDatasetChange } = props;
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-ink-secondary">Dataset</span>
      <select
        value={effectiveDatasetId ?? ""}
        onChange={(event) => onDatasetChange(event.target.value || null)}
        className="h-9 w-full rounded-md border border-border bg-card px-2 text-sm text-ink"
      >
        {(datasets ?? []).map((dataset) => (
          <option key={dataset.id} value={dataset.id}>
            {dataset.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function GoldDatasetStats(props: Readonly<GoldDatasetStatsProps>) {
  const { goldRows, goldColumns, featureCount } = props;
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
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
        value={String(featureCount)}
        icon={<CheckCircle className="h-4 w-4" />}
      />
    </div>
  );
}

function GoldRowsTable(props: Readonly<GoldRowsTableProps>) {
  const { goldTableColumns, goldRows, effectiveDatasetId, datasetDataLoading } =
    props;
  if (datasetDataLoading) {
    return <SkeletonCard />;
  }
  if (goldTableColumns.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        Aucune donnee Gold disponible.
      </p>
    );
  }
  return (
    <DataTable
      columns={goldTableColumns}
      data={goldRows}
      getRowKey={(_, index) => `${effectiveDatasetId ?? "dataset"}-${index}`}
      emptyMessage="Aucune ligne disponible"
    />
  );
}

function GoldFeaturesList(props: Readonly<GoldFeaturesListProps>) {
  const { datasetFeatures, datasetFeaturesLoading } = props;
  const featureCount = datasetFeatures?.features?.length ?? 0;
  let content = (
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
  );

  if (datasetFeaturesLoading) {
    content = <p className="text-sm text-ink-secondary">Chargement...</p>;
  } else if (featureCount === 0) {
    content = (
      <p className="text-sm text-ink-secondary">Aucune feature exposee.</p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-ink-secondary">
        Features derivees
      </p>
      {content}
    </div>
  );
}

export function DonneesGoldExplorerCard(
  props: Readonly<DonneesGoldExplorerCardProps>,
) {
  const {
    datasets,
    effectiveDatasetId,
    onDatasetChange,
    goldRows,
    goldColumns,
    goldTableColumns,
    datasetDataLoading,
    datasetFeatures,
    datasetFeaturesLoading,
  } = props;
  const featureCount = datasetFeatures?.features?.length ?? 0;

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DatasetSelector
            datasets={datasets}
            effectiveDatasetId={effectiveDatasetId}
            onDatasetChange={onDatasetChange}
          />
          <GoldDatasetStats
            goldRows={goldRows}
            goldColumns={goldColumns}
            featureCount={featureCount}
          />
        </div>
        <GoldRowsTable
          goldTableColumns={goldTableColumns}
          goldRows={goldRows}
          effectiveDatasetId={effectiveDatasetId}
          datasetDataLoading={datasetDataLoading}
        />
        <GoldFeaturesList
          datasetFeatures={datasetFeatures}
          datasetFeaturesLoading={datasetFeaturesLoading}
        />
      </CardContent>
    </Card>
  );
}
