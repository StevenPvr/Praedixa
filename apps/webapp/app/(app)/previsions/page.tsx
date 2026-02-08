"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import {
  TabBar,
  HeatmapGrid,
  DataTable,
  SkeletonTable,
  SkeletonChart,
  Badge,
} from "@praedixa/ui";
import type { Tab, DataTableColumn, HeatmapCell } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { formatSeverity } from "@/lib/formatters";

const HORIZON_TABS: Tab[] = [
  { id: "j3", label: "A 3 jours" },
  { id: "j7", label: "A 7 jours" },
  { id: "j14", label: "A 14 jours" },
];

export default function PrevisionsPage() {
  const [horizon, setHorizon] = useState("j7");

  const alertsUrl = `/api/v1/coverage-alerts?status=open&horizon=${encodeURIComponent(horizon)}`;

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl);

  // Build heatmap cells from alerts
  const heatmapCells: HeatmapCell[] = (alerts ?? []).map((a) => ({
    row: a.siteId,
    column: a.alertDate,
    value: Math.round((1 - a.pRupture) * 100),
    label: `${a.siteId} ${a.alertDate}: ${Math.round((1 - a.pRupture) * 100)}%`,
  }));

  const heatmapRows = Array.from(new Set(heatmapCells.map((c) => c.row)));
  const heatmapColumns = Array.from(
    new Set(heatmapCells.map((c) => c.column)),
  ).sort();

  const alertColumns: DataTableColumn<CoverageAlert>[] = [
    { key: "siteId", label: "Site" },
    { key: "alertDate", label: "Date" },
    { key: "shift", label: "Poste" },
    {
      key: "severity",
      label: "Urgence",
      render: (row) => (
        <Badge
          variant={
            row.severity === "critical"
              ? "destructive"
              : row.severity === "high"
                ? "destructive"
                : row.severity === "medium"
                  ? "default"
                  : "secondary"
          }
        >
          {formatSeverity(row.severity)}
        </Badge>
      ),
    },
    {
      key: "pRupture",
      label: "Risque",
      align: "right",
      render: (row) => `${(row.pRupture * 100).toFixed(0)}%`,
    },
    { key: "gapH", label: "Heures manquantes", align: "right" },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/previsions/alertes/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Voir le detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Anticipation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Identifiez les sites en tension pour les prochains jours
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <TabBar
          tabs={HORIZON_TABS}
          activeTab={horizon}
          onTabChange={setHorizon}
        />
      </div>

      {/* Coverage Heatmap */}
      <section aria-label="Couverture par site et par jour">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Couverture par site et par jour
        </h2>
        {alertsLoading ? (
          <SkeletonChart />
        ) : heatmapCells.length === 0 ? (
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
            <p className="text-sm text-gray-400">
              Aucune donnee de couverture pour cet horizon. Changez la periode
              ou importez de nouvelles donnees.
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-gray-200 bg-card p-4">
            <HeatmapGrid
              cells={heatmapCells}
              rows={heatmapRows}
              columns={heatmapColumns}
              colorScale="coverage"
            />
          </div>
        )}
      </section>

      {/* Alerts Table */}
      <section aria-label="Alertes de sous-effectif">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Alertes de sous-effectif
        </h2>
        {alertsError ? (
          <ErrorFallback message={alertsError} onRetry={refetchAlerts} />
        ) : alertsLoading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : (
          <DataTable<CoverageAlert>
            columns={alertColumns}
            data={alerts ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Aucune alerte pour cette periode — vos sites sont couverts."
          />
        )}
      </section>
    </div>
  );
}
