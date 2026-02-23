"use client";

import { useMemo, useState } from "react";
import { FileText, AlertTriangle, CheckCircle2, Target } from "lucide-react";
import type { ProofPack, CoverageAlert } from "@praedixa/shared-types";
import { TabBar, type Tab } from "@/components/ui/tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { PageTransition } from "@/components/page-transition";
import { useApiGet } from "@/hooks/use-api";
import { SyntheseTab } from "@/components/rapports/synthese-tab";
import { PrecisionTab } from "@/components/rapports/precision-tab";
import { CoutsTab } from "@/components/rapports/couts-tab";
import { ProofTab } from "@/components/rapports/proof-tab";
import { toPercent, type ForecastRunSummary } from "@/lib/rapports-helpers";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { useSiteScope } from "@/lib/site-scope";

const REPORT_TABS: Tab[] = [
  { id: "synthese", label: "Bilan de la semaine" },
  { id: "precision", label: "Fiabilite des previsions" },
  { id: "couts", label: "Analyse des couts" },
  { id: "proof", label: "Bilans mensuels" },
];

export default function RapportsPage() {
  const { appendSiteParam } = useSiteScope();
  const [activeTab, setActiveTab] = useState("synthese");

  const proofsUrl = useMemo(
    () => appendSiteParam("/api/v1/live/proof?page=1&page_size=200"),
    [appendSiteParam],
  );
  const alertsUrl = useMemo(
    () => appendSiteParam("/api/v1/live/coverage-alerts?page_size=200"),
    [appendSiteParam],
  );
  const forecastsUrl = useMemo(
    () => appendSiteParam("/api/v1/live/forecasts?status=completed"),
    [appendSiteParam],
  );

  const proofsQuery = useApiGet<ProofPack[]>(proofsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });
  const {
    data: proofs,
    loading: proofsLoading,
    error: proofsError,
    refetch: refetchProofs,
  } = proofsQuery;

  const {
    data: coverageAlerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: forecastRuns,
    loading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecastRuns,
  } = useApiGet<ForecastRunSummary[]>(forecastsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const openAlerts = (coverageAlerts ?? []).filter(
    (alert) => alert.status === "open",
  ).length;
  const totalProofs = proofs?.length ?? 0;
  const completedForecasts = (forecastRuns ?? []).filter(
    (run) => run.status === "completed",
  ).length;
  const accuracySamples = (forecastRuns ?? [])
    .map((run) => run.accuracyScore)
    .filter((value): value is number => typeof value === "number")
    .map((value) => toPercent(value));
  const avgAccuracy =
    accuracySamples.length > 0
      ? accuracySamples.reduce((sum, value) => sum + value, 0) /
        accuracySamples.length
      : 0;

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Gouvernance"
          title="Rapports board-ready"
          subtitle="Bilans executifs, suivi des couts et livrables partageables."
        />

        {alertsLoading || proofsLoading || forecastsLoading ? (
          <StatusBanner
            variant="info"
            title="Consolidation des rapports en cours"
          >
            Preparation des indicateurs de performance et des livrables
            executifs.
          </StatusBanner>
        ) : openAlerts > 0 ? (
          <StatusBanner
            variant="warning"
            title="Rapports avec alertes ouvertes"
          >
            {openAlerts} alerte(s) restent actives. Priorisez le traitement
            avant diffusion finale.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Pack executif pret a partager">
            Les indicateurs critiques sont consolides et exploitables pour votre
            comite de direction.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Bilans disponibles"
              value={proofsLoading ? "..." : totalProofs}
              status={totalProofs > 0 ? "good" : "neutral"}
              icon={<FileText className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Alertes ouvertes"
              value={alertsLoading ? "..." : openAlerts}
              status={openAlerts > 0 ? "warning" : "good"}
              icon={<AlertTriangle className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Runs finalises"
              value={forecastsLoading ? "..." : completedForecasts}
              status={completedForecasts > 0 ? "good" : "neutral"}
              icon={<CheckCircle2 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Precision moyenne"
              value={forecastsLoading ? "..." : `${avgAccuracy.toFixed(1)}%`}
              status={avgAccuracy >= 90 ? "good" : "warning"}
              icon={<Target className="h-5 w-5" />}
              animate
            />
          </div>
        </DetailCard>

        <TabBar
          tabs={REPORT_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "synthese" && (
          <SyntheseTab
            coverageAlerts={coverageAlerts}
            loading={alertsLoading}
            error={alertsError}
            onRetry={refetchAlerts}
          />
        )}

        {activeTab === "precision" && (
          <PrecisionTab
            forecastRuns={forecastRuns}
            loading={forecastsLoading}
            error={forecastsError}
            onRetry={refetchForecastRuns}
          />
        )}

        {activeTab === "couts" && (
          <CoutsTab proofs={proofs} loading={proofsLoading} />
        )}

        {activeTab === "proof" && (
          <ProofTab
            proofs={proofs}
            loading={proofsLoading}
            error={proofsError}
            onRetry={refetchProofs}
          />
        )}
      </div>
    </PageTransition>
  );
}
