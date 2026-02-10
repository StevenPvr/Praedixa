"use client";

import { useMemo, useState } from "react";
import type {
  WeeklySummary,
  ProofPack,
  CoverageAlert,
} from "@praedixa/shared-types";
import { DataTable, Button, SkeletonTable, SkeletonCard } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { TabBar, type Tab } from "@/components/ui/tab-bar";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import {
  WaterfallChart,
  type WaterfallItem,
} from "@/components/ui/waterfall-chart";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { getValidAccessToken } from "@/lib/auth/client";

const REPORT_TABS: Tab[] = [
  { id: "synthese", label: "Bilan de la semaine" },
  { id: "precision", label: "Fiabilite des previsions" },
  { id: "couts", label: "Analyse des couts" },
  { id: "proof", label: "Bilans mensuels" },
];

/* -- Helper functions -------------------------------- */

function getISOWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 4);
  return d.toISOString().slice(0, 10);
}

function buildWeeklySummaries(alertsData: CoverageAlert[]): WeeklySummary[] {
  if (!alertsData || alertsData.length === 0) return [];

  const grouped = new Map<string, CoverageAlert[]>();
  for (const alert of alertsData) {
    const weekStart = getISOWeekStart(alert.alertDate);
    if (!grouped.has(weekStart)) grouped.set(weekStart, []);
    grouped.get(weekStart)!.push(alert);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, weekAlerts]) => ({
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      totalAlerts: weekAlerts.length,
      alertsResolved: weekAlerts.filter((a) => a.status === "resolved").length,
      alertsPending: weekAlerts.filter((a) => a.status !== "resolved").length,
      totalCostEur: Math.round(
        weekAlerts.reduce((s, a) => s + (a.gapH ?? 0) * 40, 0),
      ),
      avgServicePct:
        weekAlerts.length > 0
          ? Math.round(
              (weekAlerts.reduce(
                (s, a) => s + (1 - (a.pRupture ?? 0)) * 100,
                0,
              ) /
                weekAlerts.length) *
                10,
            ) / 10
          : 0,
      topSites: [],
    }));
}

function buildWaterfallFromProofs(proofsData: ProofPack[]): WaterfallItem[] {
  if (!proofsData || proofsData.length === 0) return [];

  const totalBau = proofsData.reduce((s, p) => s + p.coutBauEur, 0);
  const totalReel = proofsData.reduce((s, p) => s + p.coutReelEur, 0);
  const totalGain = proofsData.reduce((s, p) => s + p.gainNetEur, 0);
  const total100 = proofsData.reduce((s, p) => s + p.cout100Eur, 0);

  const items: WaterfallItem[] = [
    { label: "Sans intervention", value: totalBau, type: "total" },
  ];

  const interimSaving = total100 - totalBau;
  if (interimSaving !== 0) {
    items.push({
      label: "Gain par reajustement",
      value: interimSaving,
      type: interimSaving < 0 ? "negative" : "positive",
    });
  }

  if (totalGain !== 0) {
    items.push({
      label: "Economies nettes",
      value: -totalGain,
      type: totalGain > 0 ? "negative" : "positive",
    });
  }

  items.push({ label: "Cout final", value: totalReel, type: "total" });

  return items;
}

interface ForecastRunSummary {
  id: string;
  modelType: string;
  horizonDays: number;
  status: string;
  accuracyScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

function toPercent(value: number): number {
  return value <= 1 ? value * 100 : value;
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState("synthese");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const {
    data: proofs,
    loading: proofsLoading,
    error: proofsError,
    refetch: refetchProofs,
  } = useApiGet<ProofPack[]>("/api/v1/proof");

  const {
    data: coverageAlerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>("/api/v1/coverage-alerts?page_size=200");

  const {
    data: forecastRuns,
    loading: forecastsLoading,
    error: forecastsError,
    refetch: refetchForecastRuns,
  } = useApiGet<ForecastRunSummary[]>(
    "/api/v1/forecasts?status=completed&page=1&page_size=50",
  );

  const weeklyColumns: DataTableColumn<WeeklySummary>[] = [
    { key: "weekStart", label: "Semaine du" },
    { key: "weekEnd", label: "au" },
    { key: "totalAlerts", label: "Alertes detectees", align: "right" },
    { key: "alertsResolved", label: "Alertes resolues", align: "right" },
    { key: "alertsPending", label: "En attente", align: "right" },
    {
      key: "totalCostEur",
      label: "Cout total",
      align: "right",
      render: (row) => `${row.totalCostEur.toLocaleString("fr-FR")} EUR`,
    },
    {
      key: "avgServicePct",
      label: "Couverture moyenne",
      align: "right",
      render: (row) => `${row.avgServicePct.toFixed(1)}%`,
    },
  ];

  const proofColumns: DataTableColumn<ProofPack>[] = [
    { key: "siteId", label: "Site" },
    { key: "month", label: "Mois" },
    {
      key: "gainNetEur",
      label: "Economies",
      align: "right",
      render: (row) => `${row.gainNetEur.toLocaleString("fr-FR")} EUR`,
    },
    {
      key: "adoptionPct",
      label: "Recommandations suivies",
      align: "right",
      render: (row) =>
        row.adoptionPct != null ? `${row.adoptionPct.toFixed(1)}%` : "-",
    },
    { key: "alertesEmises", label: "Alertes detectees", align: "right" },
    { key: "alertesTraitees", label: "Alertes resolues", align: "right" },
  ];

  const forecastColumns: DataTableColumn<ForecastRunSummary>[] = [
    {
      key: "completedAt",
      label: "Date d'execution",
      render: (row) => formatDate(row.completedAt),
    },
    { key: "modelType", label: "Modele" },
    { key: "horizonDays", label: "Horizon (jours)", align: "right" },
    {
      key: "accuracyScore",
      label: "Precision",
      align: "right",
      render: (row) =>
        row.accuracyScore == null
          ? "-"
          : `${toPercent(row.accuracyScore).toFixed(1)}%`,
    },
  ];

  const forecastStats = useMemo(() => {
    const runs = forecastRuns ?? [];
    const accuracyValues = runs
      .map((r) => r.accuracyScore)
      .filter((v): v is number => v != null)
      .map(toPercent);

    if (accuracyValues.length === 0) {
      return {
        totalRuns: runs.length,
        averageAccuracy: null as number | null,
        bestAccuracy: null as number | null,
      };
    }

    const averageAccuracy =
      accuracyValues.reduce((sum, value) => sum + value, 0) /
      accuracyValues.length;
    const bestAccuracy = Math.max(...accuracyValues);

    return {
      totalRuns: runs.length,
      averageAccuracy,
      bestAccuracy,
    };
  }, [forecastRuns]);

  const latestProof = useMemo(() => {
    const records = proofs ?? [];
    if (records.length === 0) return null;
    return [...records].sort((a, b) => b.month.localeCompare(a.month))[0];
  }, [proofs]);

  async function handleDownloadProofPdf(): Promise<void> {
    if (!latestProof) return;

    setDownloadingPdf(true);
    setDownloadError(null);

    try {
      const token = await getValidAccessToken();
      const headers: Record<string, string> = {
        "X-Request-ID": crypto.randomUUID(),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!baseUrl) {
        throw new Error("NEXT_PUBLIC_API_URL non configuree");
      }
      const query = new URLSearchParams({
        site_id: latestProof.siteId,
        month: latestProof.month.slice(0, 10),
      });

      const response = await fetch(
        `${baseUrl}/api/v1/proof/pdf?${query.toString()}`,
        {
          method: "GET",
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(`Echec du telechargement (${response.status})`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `proof-pack-${latestProof.siteId}-${latestProof.month.slice(0, 7)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Impossible de telecharger le PDF";
      setDownloadError(message);
    } finally {
      setDownloadingPdf(false);
    }
  }

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
        <AnimatedSection>
          <section aria-label="Bilan de la semaine">
            {alertsLoading ? (
              <SkeletonTable rows={5} columns={7} />
            ) : alertsError ? (
              <ErrorFallback message={alertsError} onRetry={refetchAlerts} />
            ) : (
              <DataTable<WeeklySummary>
                columns={weeklyColumns}
                data={buildWeeklySummaries(coverageAlerts ?? [])}
                getRowKey={(row) => row.weekStart}
                emptyMessage="Aucune donnee pour le moment. Les bilans hebdomadaires apparaitront apres votre premiere semaine d'utilisation."
              />
            )}
          </section>
        </AnimatedSection>
      )}

      {activeTab === "precision" && (
        <AnimatedSection>
          <section aria-label="Fiabilite des previsions">
            {forecastsError ? (
              <ErrorFallback
                message={forecastsError}
                onRetry={refetchForecastRuns}
              />
            ) : (
              <div className="space-y-4">
                <DetailCard>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500">Runs completes</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {forecastsLoading
                          ? "..."
                          : String(forecastStats.totalRuns)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Precision moyenne</p>
                      <p className="text-xl font-semibold text-charcoal">
                        {forecastsLoading
                          ? "..."
                          : forecastStats.averageAccuracy == null
                            ? "-"
                            : `${forecastStats.averageAccuracy.toFixed(1)}%`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">
                        Meilleure precision
                      </p>
                      <p className="text-xl font-semibold text-charcoal">
                        {forecastsLoading
                          ? "..."
                          : forecastStats.bestAccuracy == null
                            ? "-"
                            : `${forecastStats.bestAccuracy.toFixed(1)}%`}
                      </p>
                    </div>
                  </div>
                </DetailCard>

                {forecastsLoading ? (
                  <SkeletonTable rows={5} columns={4} />
                ) : (
                  <DataTable<ForecastRunSummary>
                    columns={forecastColumns}
                    data={forecastRuns ?? []}
                    getRowKey={(row) => row.id}
                    emptyMessage="Aucune execution de prevision disponible."
                  />
                )}
              </div>
            )}
          </section>
        </AnimatedSection>
      )}

      {activeTab === "couts" && (
        <AnimatedSection>
          <section aria-label="Analyse des couts">
            <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
              Decomposition des couts
            </h2>
            {proofsLoading ? (
              <SkeletonCard />
            ) : (
              <DetailCard padding="compact">
                {(proofs ?? []).length > 0 ? (
                  <WaterfallChart
                    items={buildWaterfallFromProofs(proofs ?? [])}
                    formatValue={(v) =>
                      `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k EUR`
                    }
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-gray-400">
                    Pas encore de donnees de couts. L&apos;analyse apparaitra
                    apres la cloture de votre premier mois.
                  </p>
                )}
              </DetailCard>
            )}
          </section>
        </AnimatedSection>
      )}

      {activeTab === "proof" && (
        <AnimatedSection>
          <section aria-label="Bilans mensuels">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-charcoal">
                Bilans mensuels
              </h2>
              <Button
                onClick={() => {
                  void handleDownloadProofPdf();
                }}
                disabled={!latestProof || downloadingPdf}
              >
                {downloadingPdf ? "Telechargement..." : "Telecharger en PDF"}
              </Button>
            </div>
            {downloadError && (
              <p className="mb-3 text-sm text-red-600">{downloadError}</p>
            )}
            {proofsError ? (
              <ErrorFallback message={proofsError} onRetry={refetchProofs} />
            ) : proofsLoading ? (
              <SkeletonTable rows={5} columns={6} />
            ) : (
              <DataTable<ProofPack>
                columns={proofColumns}
                data={proofs ?? []}
                getRowKey={(row) => row.id}
                emptyMessage="Aucun bilan mensuel disponible. Le premier bilan sera genere a la fin du mois en cours."
              />
            )}
          </section>
        </AnimatedSection>
      )}
    </div>
  );
}
