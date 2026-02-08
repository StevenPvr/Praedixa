"use client";

import { useState } from "react";
import type { WeeklySummary, ProofPack } from "@praedixa/shared-types";
import {
  TabBar,
  DataTable,
  WaterfallChart,
  Button,
  SkeletonTable,
} from "@praedixa/ui";
import type { Tab, DataTableColumn, WaterfallItem } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const REPORT_TABS: Tab[] = [
  { id: "synthese", label: "Synthese hebdomadaire" },
  { id: "precision", label: "Precision" },
  { id: "couts", label: "Analyse couts" },
  { id: "proof", label: "Proof Pack" },
];

/* ── Mock data for MVP placeholders ────────────── */

const MOCK_WEEKLY: WeeklySummary[] = [
  {
    weekStart: "2026-01-27",
    weekEnd: "2026-01-31",
    totalAlerts: 12,
    alertsResolved: 10,
    alertsPending: 2,
    totalCostEur: 45000,
    avgServicePct: 91.2,
    topSites: [],
  },
  {
    weekStart: "2026-02-03",
    weekEnd: "2026-02-07",
    totalAlerts: 8,
    alertsResolved: 6,
    alertsPending: 2,
    totalCostEur: 32000,
    avgServicePct: 93.5,
    topSites: [],
  },
];

const MOCK_WATERFALL: WaterfallItem[] = [
  { label: "Cout BAU", value: 120000, type: "total" },
  { label: "HS evitees", value: -18000, type: "negative" },
  { label: "Interim optimise", value: -12000, type: "negative" },
  { label: "Surcoat urgence", value: 5000, type: "positive" },
  { label: "Cout final", value: 95000, type: "total" },
];

export default function RapportsPage() {
  const [activeTab, setActiveTab] = useState("synthese");

  const {
    data: proofs,
    loading: proofsLoading,
    error: proofsError,
    refetch: refetchProofs,
  } = useApiGet<ProofPack[]>("/api/v1/proof");

  const weeklyColumns: DataTableColumn<WeeklySummary>[] = [
    { key: "weekStart", label: "Debut semaine" },
    { key: "weekEnd", label: "Fin semaine" },
    { key: "totalAlerts", label: "Alertes", align: "right" },
    { key: "alertsResolved", label: "Resolues", align: "right" },
    { key: "alertsPending", label: "En attente", align: "right" },
    {
      key: "totalCostEur",
      label: "Cout total",
      align: "right",
      render: (row) => `${row.totalCostEur.toLocaleString("fr-FR")} EUR`,
    },
    {
      key: "avgServicePct",
      label: "Service moyen",
      align: "right",
      render: (row) => `${row.avgServicePct.toFixed(1)}%`,
    },
  ];

  const proofColumns: DataTableColumn<ProofPack>[] = [
    { key: "siteId", label: "Site" },
    { key: "month", label: "Mois" },
    {
      key: "gainNetEur",
      label: "Gain net",
      align: "right",
      render: (row) => `${row.gainNetEur.toLocaleString("fr-FR")} EUR`,
    },
    {
      key: "adoptionPct",
      label: "Adoption",
      align: "right",
      render: (row) =>
        row.adoptionPct != null ? `${row.adoptionPct.toFixed(1)}%` : "-",
    },
    { key: "alertesEmises", label: "Alertes emises", align: "right" },
    { key: "alertesTraitees", label: "Alertes traitees", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Rapports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Syntheses, precision, couts et proof packs
        </p>
      </div>

      <TabBar
        tabs={REPORT_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "synthese" && (
        <section aria-label="Synthese hebdomadaire">
          <DataTable<WeeklySummary>
            columns={weeklyColumns}
            data={MOCK_WEEKLY}
            getRowKey={(row) => row.weekStart}
          />
        </section>
      )}

      {activeTab === "precision" && (
        <section aria-label="Precision des previsions">
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-16">
            <p className="text-sm text-gray-400">
              Graphique de precision des previsions (a venir)
            </p>
          </div>
        </section>
      )}

      {activeTab === "couts" && (
        <section aria-label="Analyse des couts">
          <h2 className="mb-4 text-lg font-semibold text-charcoal">
            Waterfall des couts
          </h2>
          <div className="rounded-card border border-gray-200 bg-card p-4">
            <WaterfallChart
              items={MOCK_WATERFALL}
              formatValue={(v) =>
                `${v >= 0 ? "+" : ""}${(v / 1000).toFixed(0)}k EUR`
              }
            />
          </div>
        </section>
      )}

      {activeTab === "proof" && (
        <section aria-label="Proof Packs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Proof Packs</h2>
            <Button>Exporter PDF</Button>
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
              emptyMessage="Aucun proof pack disponible"
            />
          )}
        </section>
      )}
    </div>
  );
}
