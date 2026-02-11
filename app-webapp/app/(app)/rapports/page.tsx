"use client";

import { useState } from "react";
import type { ProofPack, CoverageAlert } from "@praedixa/shared-types";
import { TabBar, type Tab } from "@/components/ui/tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import { useApiGet } from "@/hooks/use-api";
import { SyntheseTab } from "@/components/rapports/synthese-tab";
import { PrecisionTab } from "@/components/rapports/precision-tab";
import { CoutsTab } from "@/components/rapports/couts-tab";
import { ProofTab } from "@/components/rapports/proof-tab";
import type { ForecastRunSummary } from "@/lib/rapports-helpers";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

const REPORT_TABS: Tab[] = [
  { id: "synthese", label: "Bilan de la semaine" },
  { id: "precision", label: "Fiabilite des previsions" },
  { id: "couts", label: "Analyse des couts" },
  { id: "proof", label: "Bilans mensuels" },
];

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState("synthese");

  const proofsQuery = useApiGet<ProofPack[]>(
    "/api/v1/live/proof?page=1&page_size=200",
    {
      pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
    },
  );
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
  } = useApiGet<CoverageAlert[]>("/api/v1/live/coverage-alerts?page_size=200", {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: forecastRuns,
    loading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecastRuns,
  } = useApiGet<ForecastRunSummary[]>(
    "/api/v1/live/forecasts?status=completed",
    {
      pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
    },
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rapports"
        subtitle="Bilans hebdomadaires, analyse des couts et documents exportables"
      />

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
  );
}
