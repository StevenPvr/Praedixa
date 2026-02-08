"use client";

import {
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import type {
  CoverageAlert,
  CanonicalQualityDashboard,
  DashboardSummary,
  OverrideStatistics,
  ProofPackSummary,
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
import { StatusBanner } from "@/components/status-banner";
import { formatSeverity } from "@/lib/formatters";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function buildHeatmapFromAlerts(alertsData: CoverageAlert[]): {
  cells: HeatmapCell[];
  rows: string[];
  columns: string[];
} {
  if (!alertsData || alertsData.length === 0) {
    return { cells: [], rows: [], columns: [] };
  }

  const grouped = new Map<string, Map<string, number[]>>();
  for (const alert of alertsData) {
    const site = alert.siteId;
    const date = new Date(alert.alertDate);
    const dayIdx = (date.getDay() + 6) % 7; // Mon=0
    const day = DAY_LABELS[dayIdx];

    if (!grouped.has(site)) grouped.set(site, new Map());
    const siteMap = grouped.get(site)!;
    if (!siteMap.has(day)) siteMap.set(day, []);
    const coverage =
      alert.pRupture != null ? Math.round((1 - alert.pRupture) * 100) : 50;
    siteMap.get(day)!.push(coverage);
  }

  const rows = Array.from(grouped.keys()).sort();
  const columnsSet = new Set<string>();
  const cells: HeatmapCell[] = [];

  for (const [site, dayMap] of grouped) {
    for (const [day, values] of dayMap) {
      columnsSet.add(day);
      const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
      cells.push({ row: site, column: day, value: avg });
    }
  }

  const columns = DAY_LABELS.filter((d) => columnsSet.has(d));

  return { cells, rows, columns };
}

function getBannerProps(alerts: CoverageAlert[] | null): {
  variant: "success" | "warning" | "danger";
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
} | null {
  if (!alerts) return null;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  if (criticalCount > 0) {
    return {
      variant: "danger",
      message: `${criticalCount} alerte(s) critique(s) necessitent votre attention immediate`,
      ctaLabel: "Voir les alertes",
      ctaHref: "/previsions/alertes",
    };
  }
  if (alerts.length > 0) {
    return {
      variant: "warning",
      message: `${alerts.length} site(s) presentent un risque cette semaine`,
      ctaLabel: "Voir le detail",
      ctaHref: "/previsions",
    };
  }
  return {
    variant: "success",
    message: "Tous vos sites sont couverts pour les 7 prochains jours",
  };
}

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

  const { data: summary, loading: summaryLoading } =
    useApiGet<DashboardSummary>("/api/v1/dashboard/summary");

  const { data: overrideStats, loading: overrideLoading } =
    useApiGet<OverrideStatistics>(
      "/api/v1/operational-decisions/override-stats",
    );

  const { data: proofSummary, loading: proofLoading } =
    useApiGet<ProofPackSummary>("/api/v1/proof/summary");

  const loading =
    alertsLoading || qualityLoading || summaryLoading || overrideLoading;

  const heatmap = buildHeatmapFromAlerts(alerts ?? []);
  const banner = getBannerProps(alerts);

  const alertColumns: DataTableColumn<CoverageAlert>[] = [
    { key: "siteId", label: "Site" },
    { key: "alertDate", label: "Date" },
    { key: "shift", label: "Poste" },
    {
      key: "severity",
      label: "Urgence",
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
          {formatSeverity(row.severity)}
        </span>
      ),
    },
    { key: "gapH", label: "Heures manquantes", align: "right" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vos sites sont-ils prets pour les prochains jours ?
        </p>
      </div>

      {/* Status Banner */}
      {banner && !loading && (
        <StatusBanner variant={banner.variant}>
          <span className="flex items-center gap-2">
            {banner.message}
            {banner.ctaLabel && banner.ctaHref && (
              <Link
                href={banner.ctaHref}
                className="ml-2 underline hover:no-underline"
              >
                {banner.ctaLabel}
              </Link>
            )}
          </span>
        </StatusBanner>
      )}

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
              label="Couverture equipes"
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
              label="Sites en alerte"
              value={String(summary?.activeAlertsCount ?? alerts?.length ?? 0)}
              icon={<AlertTriangle className="h-5 w-5" />}
              variant={alerts && alerts.length > 5 ? "danger" : "default"}
            />
            <StatCard
              label="Cout prevu a 7 jours"
              value={
                alerts && alerts.length > 0
                  ? `${Math.round(alerts.reduce((s, a) => s + (a.gapH ?? 0) * 40, 0)).toLocaleString("fr-FR")} EUR`
                  : "--"
              }
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <StatCard
              label="Suivi des recommandations"
              value={
                overrideStats
                  ? `${(100 - (overrideStats.overridePct ?? 0)).toFixed(0)}%`
                  : "--"
              }
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>
        )}
      </section>

      {/* Coverage Heatmap */}
      <section aria-label="Couverture par site et par jour">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Couverture par site et par jour
        </h2>
        <div className="rounded-card border border-gray-200 bg-card p-4">
          {heatmap.cells.length > 0 ? (
            <HeatmapGrid
              cells={heatmap.cells}
              rows={heatmap.rows}
              columns={heatmap.columns}
              colorScale="coverage"
            />
          ) : (
            <p className="py-8 text-center text-sm text-gray-400">
              Les donnees de couverture apparaitront ici des que vos fichiers
              seront importes.{" "}
              <Link
                href="/donnees/datasets"
                className="text-blue-600 underline hover:no-underline"
              >
                Importer des donnees
              </Link>
            </p>
          )}
        </div>
      </section>

      {/* Top Alerts Table */}
      <section aria-label="Alertes en cours">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Alertes en cours
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
            emptyMessage="Aucune alerte en cours — tous vos sites sont couverts."
          />
        )}
      </section>

      {/* Performance globale / Proof Summary */}
      <section aria-label="Performance globale">
        <h2 className="mb-4 text-lg font-semibold text-charcoal">
          Performance globale
        </h2>
        {proofLoading ? (
          <SkeletonCard />
        ) : proofSummary ? (
          <div className="rounded-card border border-gray-200 bg-card p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-500">Economies realisees</p>
                <p className="text-lg font-bold text-green-600">
                  {Number(proofSummary.totalGainNetEur).toLocaleString("fr-FR")}{" "}
                  EUR
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recommandations suivies</p>
                <p className="text-lg font-bold text-charcoal">
                  {proofSummary.avgAdoptionPct != null
                    ? `${(Number(proofSummary.avgAdoptionPct) * 100).toFixed(0)}%`
                    : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alertes detectees</p>
                <p className="text-lg font-bold text-charcoal">
                  {proofSummary.totalAlertesEmises}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Alertes resolues</p>
                <p className="text-lg font-bold text-charcoal">
                  {proofSummary.totalAlertesTraitees}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 bg-card p-12">
            <p className="text-sm text-gray-400">
              Vos bilans de performance apparaitront ici apres le premier mois
              d&apos;utilisation.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
