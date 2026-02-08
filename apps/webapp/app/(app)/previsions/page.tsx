"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import {
  TabBar,
  HeatmapGrid,
  DataTable,
  SelectDropdown,
  SkeletonTable,
  SkeletonChart,
  Badge,
} from "@praedixa/ui";
import type {
  Tab,
  DataTableColumn,
  HeatmapCell,
  SelectOption,
} from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const HORIZON_TABS: Tab[] = [
  { id: "j3", label: "J+3" },
  { id: "j7", label: "J+7" },
  { id: "j14", label: "J+14" },
];

export default function PrevisionsPage() {
  const [horizon, setHorizon] = useState("j7");
  const [siteFilter, setSiteFilter] = useState("all");

  const siteParam =
    siteFilter !== "all" ? `&site_id=${encodeURIComponent(siteFilter)}` : "";
  const alertsUrl = `/api/v1/coverage-alerts?status=open&horizon=${encodeURIComponent(horizon)}${siteParam}`;

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl);

  // Extract unique sites for filter
  const uniqueSites = Array.from(new Set((alerts ?? []).map((a) => a.siteId)));
  const siteOptions: SelectOption[] = [
    { value: "all", label: "Tous les sites" },
    ...uniqueSites.map((s) => ({ value: s, label: s })),
  ];

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
    { key: "shift", label: "Shift" },
    {
      key: "severity",
      label: "Severite",
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
          {row.severity}
        </Badge>
      ),
    },
    {
      key: "pRupture",
      label: "P(rupture)",
      align: "right",
      render: (row) => `${(row.pRupture * 100).toFixed(0)}%`,
    },
    { key: "gapH", label: "Gap (h)", align: "right" },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/previsions/alertes/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Previsions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Heatmap de couverture et alertes par horizon
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <TabBar
          tabs={HORIZON_TABS}
          activeTab={horizon}
          onTabChange={setHorizon}
        />
        <SelectDropdown
          options={siteOptions}
          value={siteFilter}
          onChange={setSiteFilter}
          placeholder="Filtrer par site"
        />
      </div>

      {/* Coverage Heatmap */}
      <section aria-label="Heatmap de couverture">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Couverture par site
        </h2>
        {alertsLoading ? (
          <SkeletonChart />
        ) : heatmapCells.length === 0 ? (
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
            <p className="text-sm text-gray-400">Aucune donnee de couverture</p>
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
      <section aria-label="Alertes de couverture">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Alertes actives
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
            emptyMessage="Aucune alerte pour cet horizon"
          />
        )}
      </section>
    </div>
  );
}
