"use client";

import Link from "next/link";
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
import { useApiGet } from "@/hooks/use-api";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/ui/metric-card";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { StatusBanner } from "@/components/status-banner";
import { ErrorFallback } from "@/components/error-fallback";
import { ForecastTimelineChart } from "@/components/dashboard/forecast-timeline-chart";
import { ScenarioComparisonChart } from "@/components/dashboard/scenario-comparison-chart";

const SEVERITY_ORDER: Record<CoverageAlert["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function formatSeverityLabel(severity: CoverageAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "Critique";
    case "high":
      return "Elevee";
    case "medium":
      return "Moderee";
    default:
      return "Faible";
  }
}

function severityVariant(
  severity: CoverageAlert["severity"],
): "error" | "warning" | "info" | "success" {
  if (severity === "critical") return "error";
  if (severity === "high") return "warning";
  if (severity === "medium") return "info";
  return "success";
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)}%`;
}

function sortAlerts(alerts: CoverageAlert[]): CoverageAlert[] {
  return [...alerts].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.gapH - a.gapH;
  });
}

export function WarRoomDashboard() {
  const summaryQuery = useApiGet<DashboardSummary>(
    "/api/v1/dashboard/summary",
    {
      pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
    },
  );
  const alertsQuery = useApiGet<CoverageAlert[]>(
    "/api/v1/live/coverage-alerts?status=open&page_size=200",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );
  const queueQuery = useApiGet<DecisionQueueItem[]>(
    "/api/v1/coverage-alerts/queue?status=open&limit=50",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const summary = summaryQuery.data;
  const alerts = sortAlerts(alertsQuery.data ?? []);
  const queue = queueQuery.data ?? [];

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const exposedSites = new Set(alerts.map((alert) => alert.siteId)).size;

  const topAlerts = alerts.slice(0, 5);

  const globalError =
    summaryQuery.error || (alerts.length === 0 ? alertsQuery.error : null);

  return (
    <div className="space-y-8">
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
            <Button asChild>
              <Link href="/actions">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Ouvrir le centre de traitement
              </Link>
            </Button>
          </>
        }
      />

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
          niveau critique, mais traitement recommande aujourd'hui.
        </StatusBanner>
      ) : (
        <StatusBanner variant="success" title="Situation maitrisée">
          Aucun signal de rupture actif. Les sites sont couverts sur l'horizon
          courant.
        </StatusBanner>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        />
        <MetricCard
          label="Sites exposes"
          value={alertsQuery.loading ? "..." : exposedSites}
          status={exposedSites > 0 ? "warning" : "good"}
        />
        <MetricCard
          label="Couverture humaine"
          value={
            summaryQuery.loading ? "..." : formatPercent(summary?.coverageHuman)
          }
          status={(summary?.coverageHuman ?? 0) >= 95 ? "good" : "warning"}
        />
        <MetricCard
          label="Precision prevision"
          value={
            summaryQuery.loading
              ? "..."
              : formatPercent(summary?.forecastAccuracy)
          }
          status={(summary?.forecastAccuracy ?? 0) >= 90 ? "good" : "neutral"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <ForecastTimelineChart alerts={alerts} />
        </div>
        <div className="xl:col-span-4">
          <ScenarioComparisonChart queue={queue} />
        </div>
      </div>

      <DetailCard
        title="Priorites a traiter maintenant"
        action={
          <Button asChild size="sm" variant="ghost">
            <Link href="/actions">Voir la file complete</Link>
          </Button>
        }
      >
        {alertsQuery.loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-16 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : topAlerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/10 bg-white/40 px-5 py-8 text-center">
            <p className="text-sm text-ink-secondary">
              Aucun sujet critique en file active. Continuez la surveillance
              depuis l'onglet Anticipation.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {topAlerts.map((alert) => (
              <Link
                key={alert.id}
                href="/actions"
                className="block rounded-2xl border border-black/[0.08] bg-white/[0.65] px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-black/[0.16] hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.03] text-ink-secondary">
                      {alert.severity === "critical" ? (
                        <Siren className="h-4 w-4" />
                      ) : (
                        <ShieldAlert className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Site {alert.siteId}
                      </p>
                      <p className="text-xs text-ink-secondary">
                        {alert.alertDate} • Poste {alert.shift.toUpperCase()} •
                        Horizon {alert.horizon.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityVariant(alert.severity)}>
                      {formatSeverityLabel(alert.severity)}
                    </Badge>
                    <span className="rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-semibold text-ink">
                      {alert.gapH.toFixed(1)} h
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Risque rupture: {(alert.pRupture * 100).toFixed(0)}%
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    Drivers: {alert.driversJson.slice(0, 2).join(", ") || "n/a"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DetailCard>
    </div>
  );
}
