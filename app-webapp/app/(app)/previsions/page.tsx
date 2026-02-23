"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { CoverageAlert } from "@praedixa/shared-types";
import { Bell, AlertOctagon, Gauge, Calendar } from "lucide-react";
import { SkeletonChart, SkeletonCard } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { PageTransition } from "@/components/page-transition";
import { StatusBanner } from "@/components/status-banner";
import { FeatureImportanceBar } from "@/components/previsions/feature-importance-bar";
import { formatSeverity, getSeverityBadgeVariant } from "@/lib/formatters";
import {
  decomposeForecast,
  extractFeatureImportance,
} from "@/lib/forecast-decomposition";
import { buildCapacitySeries } from "@/lib/capacity-chart";
import { formatDateShort } from "@/lib/formatters";
import { useLatestForecasts } from "@/hooks/use-latest-forecasts";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { useSiteScope } from "@/lib/site-scope";

type Dimension = "human" | "merchandise";
const MAX_FORECAST_DAYS = 7;

function parseDimension(value: string | null): Dimension {
  return value === "merchandise" ? "merchandise" : "human";
}

const LazyLineChart = dynamic(
  () => import("@/components/charts").then((mod) => mod.D3LineChart),
  {
    ssr: false,
    loading: () => <SkeletonChart />,
  },
);

const LazyDecompositionPanel = dynamic(
  () =>
    import("@/components/previsions/decomposition-panel").then(
      (mod) => mod.DecompositionPanel,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="skeleton-chart-wrapper">
            <SkeletonChart />
          </div>
        ))}
      </div>
    ),
  },
);

const chartValueFormatter = (v: number) => v.toFixed(0);

function PrevisionsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const dimension = parseDimension(searchParams.get("dimension"));
  const { selectedSiteId, appendSiteParam } = useSiteScope();
  const [selectedForecastDate, setSelectedForecastDate] = useState<
    string | null
  >(null);

  const setDimension = useCallback(
    (d: Dimension) => {
      const params = new URLSearchParams(searchParams.toString());
      if (d === "human") {
        params.delete("dimension");
      } else {
        params.set("dimension", d);
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const {
    dailyData,
    loading: forecastLoading,
    error: forecastError,
    refetchRuns,
    refetchDaily,
  } = useLatestForecasts(dimension, selectedSiteId);

  const alertsUrl = useMemo(
    () =>
      appendSiteParam("/api/v1/live/coverage-alerts?status=open&page_size=200"),
    [appendSiteParam],
  );

  const alertsQuery = useApiGet<CoverageAlert[]>(alertsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });
  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
  } = alertsQuery;

  const decomposition = useMemo(
    () => (dailyData ? decomposeForecast(dailyData) : null),
    [dailyData],
  );

  const features = useMemo(
    () => (alerts ? extractFeatureImportance(alerts) : []),
    [alerts],
  );

  const chartData = useMemo(
    () =>
      buildCapacitySeries(dailyData ?? [], formatDateShort, {
        maxDays: MAX_FORECAST_DAYS,
      }),
    [dailyData],
  );
  const detailRows = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    return [...dailyData]
      .toSorted((a, b) => a.forecastDate.localeCompare(b.forecastDate))
      .slice(-MAX_FORECAST_DAYS);
  }, [dailyData]);
  const selectedDetail = useMemo(() => {
    if (detailRows.length === 0) return null;
    return (
      detailRows.find((row) => row.forecastDate === selectedForecastDate) ??
      detailRows[detailRows.length - 1]
    );
  }, [detailRows, selectedForecastDate]);

  useEffect(() => {
    if (detailRows.length === 0) {
      setSelectedForecastDate(null);
      return;
    }
    if (
      selectedForecastDate &&
      detailRows.some((row) => row.forecastDate === selectedForecastDate)
    ) {
      return;
    }
    setSelectedForecastDate(detailRows[detailRows.length - 1].forecastDate);
  }, [detailRows, selectedForecastDate]);

  const dimensionLabel = dimension === "human" ? "humaine" : "marchandise";

  const topAlerts = (alerts ?? []).slice(0, 3);
  const criticalCount = (alerts ?? []).filter(
    (alert) => alert.severity === "critical",
  ).length;
  const highCount = (alerts ?? []).filter(
    (alert) => alert.severity === "high",
  ).length;
  const avgRisk =
    detailRows.length > 0
      ? detailRows.reduce(
          (sum, row) =>
            sum + (row.riskScore <= 1 ? row.riskScore * 100 : row.riskScore),
          0,
        ) / detailRows.length
      : 0;

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Anticiper"
          title="Anticipation des tensions"
          subtitle="Projetez les besoins, identifiez les causes et priorisez les alertes avant rupture."
        />

        {alertsError ? (
          <StatusBanner variant="warning" title="Surveillance partielle">
            Les alertes live sont temporairement indisponibles. La projection
            reste consultable.
          </StatusBanner>
        ) : criticalCount > 0 ? (
          <StatusBanner variant="danger" title="Tension critique detectee">
            {criticalCount} alerte(s) critique(s) et {highCount} alerte(s)
            elevee(s) exigent une action rapide.
          </StatusBanner>
        ) : (alerts?.length ?? 0) > 0 ? (
          <StatusBanner
            variant="warning"
            title="Risque modere sous surveillance"
          >
            {alerts?.length ?? 0} alerte(s) ouverte(s) sur l'horizon de
            prevision.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Horizon stabilise">
            Aucun signal de rupture ouvert sur les prochains jours.
          </StatusBanner>
        )}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Alertes ouvertes"
            value={alertsLoading ? "..." : (alerts?.length ?? 0)}
            status={
              criticalCount > 0
                ? "danger"
                : (alerts?.length ?? 0) > 0
                  ? "warning"
                  : "good"
            }
            icon={<Bell className="h-5 w-5" />}
            animate
          />
          <MetricCard
            label="Niveau critique"
            value={alertsLoading ? "..." : criticalCount}
            status={criticalCount > 0 ? "danger" : "good"}
            icon={<AlertOctagon className="h-5 w-5" />}
            animate
          />
          <MetricCard
            label="Risque moyen"
            value={forecastLoading ? "..." : `${avgRisk.toFixed(0)}%`}
            status={avgRisk > 65 ? "warning" : "neutral"}
            icon={<Gauge className="h-5 w-5" />}
            animate
          />
          <MetricCard
            label="Horizon suivi"
            value="7 jours"
            status="neutral"
            icon={<Calendar className="h-5 w-5" />}
          />
        </div>

        <AnimatedSection>
          <DetailCard>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-heading text-ink font-sans font-bold">
                  Prevision de couverture sur 7 jours
                </h2>
                <p className="mt-1 text-body-sm text-ink-secondary">
                  Capacite {dimensionLabel} — tous sites
                </p>
                <p className="mt-1 text-caption text-ink-secondary">
                  Vue volontairement compacte pour éviter le bruit visuel.
                  Cliquez sur un jour ci-dessous pour voir les valeurs
                  détaillées.
                </p>
              </div>
              <div className="flex rounded-lg border border-border bg-surface-alt p-0.5">
                <button
                  type="button"
                  onClick={() => setDimension("human")}
                  aria-pressed={dimension === "human"}
                  className={`min-h-[40px] rounded-md px-4 py-2 text-title-sm transition-colors duration-fast sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-caption ${
                    dimension === "human"
                      ? "bg-card text-ink shadow-sm"
                      : "text-ink-secondary hover:text-ink"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                >
                  Humaine
                </button>
                <button
                  type="button"
                  onClick={() => setDimension("merchandise")}
                  aria-pressed={dimension === "merchandise"}
                  className={`min-h-[40px] rounded-md px-4 py-2 text-title-sm transition-colors duration-fast sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-caption ${
                    dimension === "merchandise"
                      ? "bg-card text-ink shadow-sm"
                      : "text-ink-secondary hover:text-ink"
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                >
                  Marchandise
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border border-border bg-card/70">
              {forecastLoading ? (
                <SkeletonChart />
              ) : forecastError ? (
                <ErrorFallback
                  message={forecastError}
                  onRetry={() => {
                    refetchRuns();
                    refetchDaily();
                  }}
                />
              ) : chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border bg-surface-sunken p-12 sm:h-[340px] md:h-[360px]">
                  <p className="text-body-sm text-ink-secondary">
                    Aucune prevision disponible
                  </p>
                </div>
              ) : (
                <div className="h-[300px] sm:h-[340px] md:h-[360px]">
                  <LazyLineChart
                    data={chartData}
                    index="date"
                    categories={[
                      "Capacité prévue actuelle",
                      "Capacité prévue predite",
                      "Capacité optimale predite",
                    ]}
                    colors={[
                      "var(--ink-tertiary)",
                      "var(--brand)",
                      "oklch(0.65 0.18 155)",
                    ]}
                    valueFormatter={chartValueFormatter}
                    showLegend
                    showGridLines
                    curveType="natural"
                    className="h-full w-full"
                  />
                </div>
              )}
            </div>
            {!forecastLoading && !forecastError && detailRows.length > 0 && (
              <div className="mt-4 rounded-lg border border-border bg-surface-sunken p-3">
                <p className="text-title-sm text-ink-secondary">
                  Detail journalier (7 jours)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detailRows.map((row) => {
                    const active =
                      selectedDetail?.forecastDate === row.forecastDate;
                    return (
                      <button
                        key={row.forecastDate}
                        type="button"
                        onClick={() =>
                          setSelectedForecastDate(row.forecastDate)
                        }
                        aria-label={`Voir le detail du ${formatDateShort(row.forecastDate)}`}
                        aria-pressed={active}
                        title={`Voir le detail du ${formatDateShort(row.forecastDate)}`}
                        className={`min-h-[36px] rounded-full px-3 py-1 text-caption font-semibold transition-all duration-fast ${
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "bg-card text-ink-secondary hover:bg-surface-alt"
                        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                      >
                        {formatDateShort(row.forecastDate)}
                      </button>
                    );
                  })}
                </div>
                {selectedDetail && (
                  <div className="mt-3 grid grid-cols-2 gap-3 text-caption text-ink sm:grid-cols-4">
                    <div>
                      <p className="text-ink-secondary">Demande prévue</p>
                      <p className="font-semibold">
                        {selectedDetail.predictedDemand.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-secondary">Capacité prévue</p>
                      <p className="font-semibold">
                        {selectedDetail.capacityPlannedPredicted.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-secondary">Capacité optimale</p>
                      <p className="font-semibold">
                        {selectedDetail.capacityOptimalPredicted.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-secondary">Risque</p>
                      <p className="font-semibold">
                        {`${(selectedDetail.riskScore <= 1
                          ? selectedDetail.riskScore * 100
                          : selectedDetail.riskScore
                        ).toFixed(0)}%`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DetailCard>
        </AnimatedSection>

        <AnimatedSection>
          <section aria-label="Decomposition SARIMAX">
            <h2 className="mb-4 text-heading text-ink font-sans font-bold">
              Decomposition du signal
            </h2>
            <p className="mb-3 text-body-sm text-ink-secondary">
              Cette section explique les composantes qui poussent la prediction:
              tendance, rythme hebdomadaire, residus et niveau
              d&apos;incertitude.
            </p>
            <LazyDecompositionPanel
              data={decomposition}
              loading={forecastLoading}
            />
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section aria-label="Facteurs explicatifs">
            <h2 className="mb-4 text-heading text-ink font-sans font-bold">
              Pourquoi cette prevision ?
            </h2>
            <p className="mb-3 text-body-sm text-ink-secondary">
              Les facteurs sont classes par impact estime sur la couverture.
              Commencez par les deux premiers pour agir vite.
            </p>
            <DetailCard>
              <FeatureImportanceBar
                features={features}
                loading={alertsLoading}
              />
            </DetailCard>
          </section>
        </AnimatedSection>

        <AnimatedSection>
          <section aria-label="Alertes prioritaires">
            <h2 className="mb-4 text-heading text-ink font-sans font-bold">
              Alertes prioritaires
            </h2>
            <p className="mb-3 text-body-sm text-ink-secondary">
              Les alertes affichées sont ordonnées par criticité, pour guider la
              prise de decision dans le bon ordre.
            </p>
            {alertsError ? (
              <ErrorFallback message={alertsError} />
            ) : alertsLoading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : topAlerts.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card p-12">
                <p className="text-body-sm text-ink-secondary">
                  Aucune alerte active — vos sites sont couverts
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {topAlerts.map((alert) => (
                  <DetailCard key={alert.id}>
                    <div className="flex items-start justify-between">
                      <span className="text-title-sm text-ink-secondary">
                        {alert.siteId}
                      </span>
                      <Badge variant={getSeverityBadgeVariant(alert.severity)}>
                        {formatSeverity(alert.severity)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-body-sm text-ink">
                      {alert.alertDate} — {alert.shift}
                    </p>
                    <div className="mt-2 flex gap-4 text-caption text-ink-secondary">
                      <span>Risque : {(alert.pRupture * 100).toFixed(0)}%</span>
                      <span>Ecart : {alert.gapH}h</span>
                    </div>
                    {alert.driversJson.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alert.driversJson.map((d) => (
                          <span
                            key={d}
                            className="rounded-full bg-surface-sunken px-2 py-0.5 text-caption text-ink-secondary"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link
                      href="/actions"
                      className="mt-3 inline-block text-title-sm text-primary transition-colors duration-fast hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      Voir les solutions
                    </Link>
                  </DetailCard>
                ))}
              </div>
            )}
          </section>
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}

export default function PrevisionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-12">
          <SkeletonChart />
        </div>
      }
    >
      <PrevisionsContent />
    </Suspense>
  );
}
