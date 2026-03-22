"use client";

import {
  DonneesCanonicalSection,
  DonneesGoldExplorerSection,
  DonneesIngestionSection,
  DonneesMedallionSection,
  DonneesQualitySection,
} from "./donnees-sections";
import { useDonneesPageModel } from "./donnees-page-model";

export default function DonneesPage() {
  const model = useDonneesPageModel();

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Donnees</h2>

      <DonneesMedallionSection
        datasetsEnabled={model.datasetsEnabled}
        loading={model.medallionLoading}
        error={model.medallionError}
        report={model.medallionReport}
        qualityColumnsCount={model.qualityColumnsCount}
        unavailableMessage={model.medallionUnavailableMessage}
      />

      <DonneesQualitySection
        loading={model.qualityLoading}
        error={model.qualityError}
        quality={model.quality}
      />

      <DonneesGoldExplorerSection
        datasetsEnabled={model.datasetsEnabled}
        loading={model.datasetsLoading}
        error={model.datasetsError}
        datasets={model.datasets}
        effectiveDatasetId={model.effectiveDatasetId}
        onDatasetChange={model.setSelectedDatasetId}
        goldRows={model.goldRows}
        goldColumns={model.goldColumns}
        goldTableColumns={model.goldTableColumns}
        datasetDataLoading={model.datasetDataLoading}
        datasetDataError={model.datasetDataError}
        datasetFeatures={model.datasetFeatures}
        datasetFeaturesLoading={model.datasetFeaturesLoading}
        datasetFeaturesError={model.datasetFeaturesError}
        unavailableMessage={model.datasetsUnavailableMessage}
      />

      <DonneesCanonicalSection
        loading={model.canonicalLoading}
        error={model.canonicalError}
        canonical={model.canonical}
        onRetry={model.canonicalRefetch}
      />

      <DonneesIngestionSection
        enabled={model.ingestionLogEnabled}
        loading={model.ingestionLoading}
        error={model.ingestionError}
        ingestion={model.ingestion}
        onRetry={model.ingestionRefetch}
        unavailableMessage={model.ingestionUnavailableMessage}
      />
    </div>
  );
}
