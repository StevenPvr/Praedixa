"use client";

import { useState } from "react";
import type {
  WeeklySummary,
  ProofPack,
  CoverageAlert,
} from "@praedixa/shared-types";
import {
  TabBar,
  DataTable,
  WaterfallChart,
  Button,
  SkeletonTable,
  SkeletonCard,
} from "@praedixa/ui";
import type { Tab, DataTableColumn, WaterfallItem } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

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

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState("synthese");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Rapports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bilans hebdomadaires, analyse des couts et documents exportables
        </p>
      </div>

      <TabBar
        tabs={REPORT_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "synthese" && (
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
      )}

      {activeTab === "precision" && (
        <section aria-label="Fiabilite des previsions">
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
            <p className="text-sm text-gray-400">
              Ce module est en cours de developpement. Il comparera bientot les
              previsions avec les observations reelles.
            </p>
          </div>
        </section>
      )}

      {activeTab === "couts" && (
        <section aria-label="Analyse des couts">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Decomposition des couts
          </h2>
          {proofsLoading ? (
            <SkeletonCard />
          ) : (
            <div className="rounded-card border border-gray-200 bg-card p-4">
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
            </div>
          )}
        </section>
      )}

      {activeTab === "proof" && (
        <section aria-label="Bilans mensuels">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">
              Bilans mensuels
            </h2>
            <Button>Telecharger en PDF</Button>
          </div>
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
      )}
    </div>
  );
}
