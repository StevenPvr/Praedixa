"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  FileText,
  ShieldAlert,
  Siren,
  Target,
} from "lucide-react";
import type {
  CoverageAlert,
  DashboardSummary,
  DecisionQueueItem,
} from "@praedixa/shared-types";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { sortAlertsBySeverity } from "@/lib/scenario-utils";
import { staggerContainer, staggerItem } from "@/lib/animations/config";
import {
  formatSeverity,
  formatPercent,
  getSeverityBadgeVariant,
} from "@/lib/formatters";
import { useApiGet } from "@/hooks/use-api";
import { cn } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { StatusBanner } from "@/components/status-banner";
import { ErrorFallback } from "@/components/error-fallback";
import { SkeletonCard } from "@/components/ui/skeleton";
import { ForecastTimelineChart } from "@/components/dashboard/forecast-timeline-chart";
import { ScenarioComparisonChart } from "@/components/dashboard/scenario-comparison-chart";

export function WarRoomDashboard() {
  const summaryQuery = useApiGet<DashboardSummary>(
    "/api/v1/live/dashboard/summary",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );
  const alertsQuery = useApiGet<CoverageAlert[]>(
    "/api/v1/live/coverage-alerts?status=open&page_size=200",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );
  const queueQuery = useApiGet<DecisionQueueItem[]>(
    "/api/v1/live/coverage-alerts/queue?status=open&limit=50",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const summary = summaryQuery.data;
  const alerts = useMemo(
    () => sortAlertsBySeverity(alertsQuery.data ?? []),
    [alertsQuery.data],
  );
  const queue = queueQuery.data ?? [];

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const exposedSites = new Set(alerts.map((a) => a.siteId)).size;
  const topAlerts = alerts.slice(0, 5);

  const globalError =
    summaryQuery.error || (alerts.length === 0 ? alertsQuery.error : null);

  return (
    <div className="gradient-mesh space-y-8 pb-12">
      <PageHeader
        eyebrow="Centre decisionnel"
        title="War room operationnelle"
        subtitle="Identifiez les risques critiques, priorisez les arbitrages et declenchez les actions avant rupture."
        size="large"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/rapports">
                <FileText className="mr-2 h-4 w-4" />
                Rapport executif
              </Link>
            </Button>
            <Button asChild variant="premium">
              <Link href="/actions">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Centre de traitement
              </Link>
            </Button>
          </>
        }
      />

      {/* Status Banner */}
      {globalError ? (
        <ErrorFallback message={globalError} onRetry={summaryQuery.refetch} />
      ) : criticalCount > 0 ? (
        <StatusBanner variant="danger" title="Risque critique detecte">
          {criticalCount} alerte(s) critique(s) et {highCount} alerte(s)
          elevee(s) necessitent une decision immediate.
        </StatusBanner>
      ) : alerts.length > 0 ? (
        <StatusBanner variant="warning" title="Zone sous surveillance">
          {alerts.length} alerte(s) ouverte(s) sur {exposedSites} site(s). Aucun
          niveau critique, mais traitement recommande aujourd&apos;hui.
        </StatusBanner>
      ) : (
        <StatusBanner variant="success" title="Situation maitrisee">
          Aucun signal de rupture actif. Les sites sont couverts sur
          l&apos;horizon courant.
        </StatusBanner>
      )}

      {/* KPI Grid */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={staggerItem}>
          <MetricCard
            label="Alertes ouvertes"
            value={alertsQuery.loading ? "..." : alerts.length}
            status={
              criticalCount > 0
                ? "danger"
                : alerts.length > 0
                  ? "warning"
                  : "good"
            }
            trend={alerts.length > 0 ? -2.3 : undefined}
            trendInverted
            animate
            icon={<Siren className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricCard
            label="Sites exposes"
            value={alertsQuery.loading ? "..." : exposedSites}
            status={exposedSites > 0 ? "warning" : "good"}
            trendInverted
            animate
            icon={<ShieldAlert className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricCard
            label="Couverture humaine"
            value={
              summaryQuery.loading
                ? "..."
                : formatPercent(summary?.coverageHuman)
            }
            status={(summary?.coverageHuman ?? 0) >= 95 ? "good" : "warning"}
            animate
            icon={<Target className="h-5 w-5" />}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <MetricCard
            label="Precision prevision"
            value={
              summaryQuery.loading
                ? "..."
                : formatPercent(summary?.forecastAccuracy)
            }
            status={(summary?.forecastAccuracy ?? 0) >= 90 ? "good" : "neutral"}
            animate
          />
        </motion.div>
      </motion.div>

      {/* Main content grid */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Left column — 8 cols */}
        <div className="space-y-6 xl:col-span-8">
          {/* Projection chart */}
          <DetailCard
            title="Projection de charge"
            action={
              <Badge variant="outline" size="sm">
                Live
              </Badge>
            }
          >
            <ForecastTimelineChart alerts={alerts} />
          </DetailCard>

          {/* Priority list */}
          <DetailCard
            title="Priorites a traiter"
            action={
              <Button asChild size="sm" variant="ghost">
                <Link href="/actions">Voir la file complete</Link>
              </Button>
            }
          >
            {alertsQuery.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} className="h-16" />
                ))}
              </div>
            ) : topAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface-sunken/30 px-6 py-10 text-center">
                <p className="text-body-sm text-ink-secondary">
                  Aucun sujet critique en file active. Continuez la surveillance
                  depuis l&apos;onglet Anticipation.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {topAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href="/actions"
                    className={cn(
                      "shine-effect group block rounded-lg border border-border bg-card px-5 py-4",
                      "transition-all duration-fast",
                      "hover:-translate-y-0.5 hover:border-border-hover hover:shadow-[var(--shadow-card-hover)]",
                      alert.severity === "critical"
                        ? "severity-border-danger"
                        : "severity-border-warning",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <span
                          className={cn(
                            "inline-flex h-10 w-10 items-center justify-center rounded-lg",
                            alert.severity === "critical"
                              ? "bg-danger-light text-danger"
                              : "bg-warning-light text-warning",
                          )}
                        >
                          {alert.severity === "critical" ? (
                            <Siren className="h-5 w-5" />
                          ) : (
                            <ShieldAlert className="h-5 w-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-title-sm text-ink transition-colors group-hover:text-primary">
                              Site {alert.siteId}
                            </p>
                            <span className="h-1 w-1 rounded-full bg-ink-placeholder" />
                            <p className="text-overline text-ink-secondary">
                              {alert.shift}
                            </p>
                          </div>
                          <p className="mt-0.5 text-caption text-ink-tertiary">
                            {alert.alertDate} · Horizon{" "}
                            {alert.horizon.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={getSeverityBadgeVariant(alert.severity)}
                        >
                          {formatSeverity(alert.severity)}
                        </Badge>
                        <div className="flex flex-col items-end">
                          <span className="font-serif text-metric-xs tabular-nums text-ink">
                            {alert.gapH.toFixed(1)} h
                          </span>
                          <span className="text-caption-compact text-ink-placeholder">
                            Ecart
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-6 pl-14 text-caption text-ink-tertiary">
                      <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-ink-secondary">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Risque rupture :{" "}
                        <span className="font-medium">
                          {(alert.pRupture * 100).toFixed(0)} %
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 transition-colors group-hover:text-ink-secondary">
                        <Target className="h-3.5 w-3.5" />
                        Drivers :{" "}
                        <span className="font-medium">
                          {alert.driversJson.slice(0, 2).join(", ") || "n/a"}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DetailCard>
        </div>

        {/* Right column — 4 cols */}
        <div className="space-y-6 xl:col-span-4">
          {/* Scenario comparison */}
          <DetailCard title="Scenarios">
            <ScenarioComparisonChart queue={queue} />
          </DetailCard>

          {/* Health score */}
          {!summaryQuery.loading && summary && (
            <div className="surface-premium p-6">
              <div className="flex items-center gap-5">
                <ProgressRing
                  value={Math.round(summary.coverageHuman ?? 0)}
                  max={100}
                  size={72}
                  strokeWidth={6}
                  label="Score de couverture"
                  showValue
                  color={
                    (summary.coverageHuman ?? 0) >= 95
                      ? "success"
                      : (summary.coverageHuman ?? 0) >= 80
                        ? "warning"
                        : "danger"
                  }
                />
                <div className="flex flex-col gap-1">
                  <span className="text-title text-ink">
                    Score de couverture
                  </span>
                  <span className="text-body-sm text-ink-secondary">
                    Capacite vs. besoin sur l&apos;horizon courant.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
