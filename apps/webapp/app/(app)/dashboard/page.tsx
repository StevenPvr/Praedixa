"use client";

import {
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type {
  CoverageAlert,
  CanonicalQualityDashboard,
} from "@praedixa/shared-types";
import {
  StatCard,
  HeatmapGrid,
  DataTable,
  SkeletonCard,
  SkeletonTable,
} from "@praedixa/ui";
import type { DataTableColumn, HeatmapCell } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

/* ── Mock heatmap data for MVP ───────────────────── */

const MOCK_SITES = ["Lyon", "Paris", "Marseille", "Lille", "Nantes"];
const MOCK_DATES = ["Lun", "Mar", "Mer", "Jeu", "Ven"];

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const MOCK_HEATMAP_CELLS: HeatmapCell[] = MOCK_SITES.flatMap((site, i) =>
  MOCK_DATES.map((date, j) => ({
    row: site,
    column: date,
    value: Math.round(60 + seededRandom(i * MOCK_DATES.length + j) * 40),
  })),
);

export default function DashboardPage() {
  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(
    "/api/v1/coverage-alerts?status=open&page_size=5",
  );

  const { data: quality, loading: qualityLoading } =
    useApiGet<CanonicalQualityDashboard>("/api/v1/canonical/quality");

  const loading = alertsLoading || qualityLoading;

  const alertColumns: DataTableColumn<CoverageAlert>[] = [
    { key: "siteId", label: "Site" },
    { key: "alertDate", label: "Date" },
    { key: "shift", label: "Shift" },
    {
      key: "severity",
      label: "Severite",
      render: (row) => (
        <span
          className={
            row.severity === "critical"
              ? "font-bold text-red-600"
              : row.severity === "high"
                ? "font-semibold text-red-500"
                : row.severity === "medium"
                  ? "text-amber-600"
                  : "text-gray-500"
          }
        >
          {row.severity}
        </span>
      ),
    },
    { key: "gapH", label: "Gap (h)", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble de la couverture operationnelle
        </p>
      </div>

      {/* KPI Cards */}
      <section aria-label="Indicateurs cles">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Taux couverture moyen"
              value={
                quality ? `${Number(quality.coveragePct).toFixed(1)}%` : "--"
              }
              icon={<ShieldCheck className="h-5 w-5" />}
              variant={
                quality && Number(quality.coveragePct) >= 85
                  ? "success"
                  : "danger"
              }
            />
            <StatCard
              label="Alertes actives"
              value={String(alerts?.length ?? 0)}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={alerts && alerts.length > 5 ? "danger" : "default"}
            />
            <StatCard
              label="Cout estime J+7"
              value="--"
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              label="Taux adoption"
              value="--"
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        )}
      </section>

      {/* Coverage Heatmap */}
      <section aria-label="Heatmap de couverture">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Heatmap de couverture
        </h2>
        <div className="rounded-card border border-gray-200 bg-card p-4">
          <HeatmapGrid
            cells={MOCK_HEATMAP_CELLS}
            rows={MOCK_SITES}
            columns={MOCK_DATES}
            colorScale="coverage"
          />
        </div>
      </section>

      {/* Top Alerts Table */}
      <section aria-label="Top alertes">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Alertes actives
        </h2>
        {alertsError ? (
          <ErrorFallback message={alertsError} onRetry={refetchAlerts} />
        ) : alertsLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : (
          <DataTable<CoverageAlert>
            columns={alertColumns}
            data={alerts ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Aucune alerte active"
          />
        )}
      </section>

      {/* Cost Trend Placeholder */}
      <section aria-label="Tendance des couts">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Tendance des couts
        </h2>
        <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
          <p className="text-sm text-gray-400">
            Graphique de tendance des couts (a venir)
          </p>
        </div>
      </section>
    </div>
  );
}
