"use client";

import { Card, CardContent, SkeletonCard, StatCard } from "@praedixa/ui";
import { Archive, FileCheck2, ShieldCheck, TrendingUp } from "lucide-react";

import { ErrorFallback } from "@/components/error-fallback";

import type {
  ProofPack,
  QualityData,
  ShareLinkResponse,
} from "./rapports-page-model";
import { RapportsProofPackPanel } from "./rapports-proof-pack-panel";

type RapportsSummaryProps = {
  proofCount: number;
  generatedProofCount: number;
  qualityScore: number | null | undefined;
  activeAlerts: number;
  criticalAlerts: number;
};

type QualityCardProps = {
  quality: QualityData | null;
  qualityError: string | null;
  criticalAlerts: number;
};

type RapportsPageContentProps = {
  orgId: string;
  proofList: ProofPack[];
  proofLoading: boolean;
  proofError: string | null;
  proofRefetch: () => void;
  quality: QualityData | null;
  qualityLoading: boolean;
  qualityError: string | null;
  generatedProofCount: number;
  activeAlerts: number;
  criticalAlerts: number;
  selectedProofId: string;
  setSelectedProofId: (value: string) => void;
  effectiveProofId: string;
  shareLoading: boolean;
  shareError: string | null;
  shareData: ShareLinkResponse | null;
  onCreateShareLink: () => void;
};

function RapportsSummary(props: Readonly<RapportsSummaryProps>) {
  const {
    proofCount,
    generatedProofCount,
    qualityScore,
    activeAlerts,
    criticalAlerts,
  } = props;
  const hasQualityScore = qualityScore != null;
  const qualityScoreLabel = hasQualityScore
    ? `${Math.round(qualityScore * 100)}%`
    : "-";
  const alertTrend =
    criticalAlerts > 0 ? `${criticalAlerts} critiques` : undefined;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Proof packs"
        value={String(proofCount)}
        icon={<Archive className="h-4 w-4" />}
      />
      <StatCard
        label="Proof packs generes"
        value={String(generatedProofCount)}
        icon={<FileCheck2 className="h-4 w-4" />}
      />
      <StatCard
        label="Score qualite"
        value={qualityScoreLabel}
        icon={<ShieldCheck className="h-4 w-4" />}
      />
      <StatCard
        label="Alertes ouvertes"
        value={String(activeAlerts)}
        icon={<TrendingUp className="h-4 w-4" />}
        {...(alertTrend ? { trend: alertTrend } : {})}
      />
    </div>
  );
}

function RapportsLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

function QualityCard(props: Readonly<QualityCardProps>) {
  const { quality, qualityError, criticalAlerts } = props;
  const completenessRateValue = quality?.completenessRate;
  const hasCompletenessRate = completenessRateValue != null;
  const completenessRateLabel = hasCompletenessRate
    ? `${Math.round(completenessRateValue * 100)}%`
    : "-";
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Qualite des donnees
        </h3>
        {qualityError ? (
          <p className="text-sm text-ink-tertiary">{qualityError}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <p className="text-sm text-ink-tertiary">
              <span>Total: </span>
              <span className="text-ink">{quality?.totalRecords ?? "-"}</span>
            </p>
            <p className="text-sm text-ink-tertiary">
              <span>Valides: </span>
              <span className="text-ink">{quality?.validRecords ?? "-"}</span>
            </p>
            <p className="text-sm text-ink-tertiary">
              <span>Completion: </span>
              <span className="text-ink">{completenessRateLabel}</span>
            </p>
            <p className="text-sm text-ink-tertiary">
              <span>Alertes critiques: </span>
              <span className="text-ink">{criticalAlerts}</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RapportsPageContent({
  orgId: _orgId,
  proofList,
  proofLoading,
  proofError,
  proofRefetch,
  quality,
  qualityLoading,
  qualityError,
  generatedProofCount,
  activeAlerts,
  criticalAlerts,
  selectedProofId,
  setSelectedProofId,
  effectiveProofId,
  shareLoading,
  shareError,
  shareData,
  onCreateShareLink,
}: Readonly<RapportsPageContentProps>) {
  const loadingSkeleton =
    qualityLoading || proofLoading ? <RapportsLoadingSkeleton /> : null;
  const proofPackContent = proofError ? (
    <ErrorFallback message={proofError} onRetry={proofRefetch} />
  ) : (
    <RapportsProofPackPanel
      proofList={proofList}
      selectedProofId={selectedProofId}
      setSelectedProofId={setSelectedProofId}
      effectiveProofId={effectiveProofId}
      shareLoading={shareLoading}
      shareError={shareError}
      shareData={shareData}
      onCreateShareLink={onCreateShareLink}
    />
  );
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">Rapports</h2>
        <p className="text-sm text-ink-tertiary">
          Synthese executive: preuve, qualite et exposition au risque pour ce
          client.
        </p>
      </div>

      <RapportsSummary
        proofCount={proofList.length}
        generatedProofCount={generatedProofCount}
        qualityScore={quality?.qualityScore}
        activeAlerts={activeAlerts}
        criticalAlerts={criticalAlerts}
      />

      {loadingSkeleton}

      <QualityCard
        quality={quality}
        qualityError={qualityError}
        criticalAlerts={criticalAlerts}
      />

      {proofPackContent}
    </div>
  );
}
