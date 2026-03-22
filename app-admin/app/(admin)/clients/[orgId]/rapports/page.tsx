"use client";

import { ErrorFallback } from "@/components/error-fallback";
import { useRapportsPageModel } from "./rapports-page-model";
import { RapportsPageContent } from "./rapports-sections";

function renderRapportsErrorState(onRetry: () => void) {
  return (
    <ErrorFallback
      message="Impossible de charger les rapports de cette organisation"
      onRetry={onRetry}
    />
  );
}

export default function RapportsPage() {
  const model = useRapportsPageModel();
  function handleRetry() {
    model.proofRefetch();
    model.qualityRefetch();
    model.alertsRefetch();
  }

  async function handleCreateShareLink() {
    await model.createShareLink({});
  }

  if (model.proofError && model.qualityError && model.alertsError) {
    return renderRapportsErrorState(handleRetry);
  }

  return (
    <RapportsPageContent
      orgId={model.orgId}
      proofList={model.proofList}
      proofLoading={model.proofLoading}
      proofError={model.proofError}
      proofRefetch={model.proofRefetch}
      quality={model.quality ?? null}
      qualityLoading={model.qualityLoading}
      qualityError={model.qualityError}
      generatedProofCount={model.generatedProofCount}
      activeAlerts={model.activeAlerts}
      criticalAlerts={model.criticalAlerts}
      selectedProofId={model.selectedProofId}
      setSelectedProofId={model.setSelectedProofId}
      effectiveProofId={model.effectiveProofId}
      shareLoading={model.shareLoading}
      shareError={model.shareError}
      shareData={model.shareData ?? null}
      onCreateShareLink={handleCreateShareLink}
    />
  );
}
