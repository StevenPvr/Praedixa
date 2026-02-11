"use client";

import { AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { CoverageAlert, DashboardSummary } from "@praedixa/shared-types";
import { StatCard, SkeletonCard, SkeletonChart } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import { PageHeader } from "@/components/ui/page-header";
import { useApiGet } from "@/hooks/use-api";
import { StatusBanner } from "@/components/status-banner";
import { AnimatedSection } from "@/components/animated-section";
import { StaggeredGrid, StaggeredItem } from "@/components/staggered-grid";
import { ForecastTimelineChart } from "@/components/dashboard/forecast-timeline-chart";
import { ScenarioComparisonChart } from "@/components/dashboard/scenario-comparison-chart";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { formatDateFull } from "@/lib/date-formatters";
import { useI18n } from "@/lib/i18n/provider";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

function getBannerProps(alerts: CoverageAlert[] | null) {
  if (!alerts) return null;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  if (criticalCount > 0) {
    return {
      variant: "danger" as const,
      message: `${criticalCount} alerte(s) critique(s) necessitent une action immediate`,
      ctaLabel: "Ouvrir la file",
      ctaHref: "/actions",
    };
  }
  if (alerts.length > 0) {
    return {
      variant: "warning" as const,
      message: `${alerts.length} site(s) presentent un risque cette semaine`,
      ctaLabel: "Voir les alertes",
      ctaHref: "/actions",
    };
  }
  return {
    variant: "success" as const,
    message: "Tous vos sites sont couverts pour les 7 prochains jours",
  };
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { data: alerts, loading: alertsLoading } = useApiGet<CoverageAlert[]>(
    "/api/v1/live/coverage-alerts?status=open&page_size=50",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const { data: summary, loading: summaryLoading } =
    useApiGet<DashboardSummary>("/api/v1/live/dashboard/summary", {
      pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
    });

  const loading = alertsLoading || summaryLoading;
  const banner = getBannerProps(alerts);
  const topAlerts = (alerts ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
      />

      {banner && !loading && (
        <StatusBanner variant={banner.variant}>
          <span className="flex items-center gap-2">
            {banner.message}
            {banner.ctaLabel && banner.ctaHref ? (
              <Link
                href={banner.ctaHref}
                className="ml-2 underline hover:no-underline"
              >
                {banner.ctaLabel}
              </Link>
            ) : null}
          </span>
        </StatusBanner>
      )}

      <OnboardingChecklist />

      <AnimatedSection>
        <section
          aria-label="Indicateurs cles"
          className="rounded-3xl bg-gradient-ambient p-6"
        >
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            {t("dashboard.nowTitle")}
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : (
            <StaggeredGrid columns={3}>
              <StaggeredItem>
                <StatCard
                  label="Couverture equipes"
                  value={
                    summary
                      ? `${Number(summary.coverageHuman).toFixed(1)}%`
                      : "--"
                  }
                  icon={<ShieldCheck className="h-5 w-5" />}
                  variant={
                    summary && Number(summary.coverageHuman) >= 85
                      ? "success"
                      : "danger"
                  }
                />
              </StaggeredItem>
              <StaggeredItem>
                <StatCard
                  label="Alertes actives"
                  value={String(summary?.activeAlertsCount ?? 0)}
                  icon={<AlertTriangle className="h-5 w-5" />}
                  variant={
                    (summary?.activeAlertsCount ?? 0) > 5 ? "danger" : "default"
                  }
                />
              </StaggeredItem>
              <StaggeredItem>
                <StatCard
                  label="Derniere prevision"
                  value={
                    summary?.lastForecastDate
                      ? formatDateFull(summary.lastForecastDate)
                      : "--"
                  }
                  icon={<TrendingUp className="h-5 w-5" />}
                />
              </StaggeredItem>
            </StaggeredGrid>
          )}
          {!loading && (
            <div className="mt-4 grid gap-2 text-xs text-gray-600 sm:grid-cols-3">
              <p>
                Couverture equipes: compare la capacite planifiee vs le besoin
                predit.
              </p>
              <p>
                Alertes actives: nombre de situations a traiter en priorite dans
                la file de decision.
              </p>
              <p>
                Derniere prevision: date de la derniere mise a jour des calculs
                previsionnels.
              </p>
            </div>
          )}
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section aria-label="Actions prioritaires" className="space-y-3">
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            {t("dashboard.todoTitle")}
          </h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : topAlerts.length === 0 ? (
            <DetailCard>
              <p className="text-sm text-gray-500">{t("dashboard.noAction")}</p>
            </DetailCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topAlerts.map((alert) => (
                <DetailCard key={alert.id}>
                  <p className="text-sm font-semibold text-charcoal">
                    {alert.siteId}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {alert.alertDate} — {alert.shift}
                  </p>
                  <p className="mt-2 text-xs text-gray-600">
                    Risque {Math.round(alert.pRupture * 100)}% · Ecart{" "}
                    {alert.gapH}h
                  </p>
                  <Link
                    href="/actions"
                    className="mt-3 inline-flex text-sm font-medium text-amber-700 hover:text-amber-600"
                  >
                    {t("dashboard.queueCta")}
                  </Link>
                </DetailCard>
              ))}
            </div>
          )}
        </section>
      </AnimatedSection>

      <AnimatedSection>
        <section aria-label="Performance recente" className="space-y-3">
          <h2 className="font-serif text-lg font-semibold text-charcoal">
            {t("dashboard.trendTitle")}
          </h2>
          <p className="text-xs text-gray-500">
            Les graphiques sont limites a 7 jours pour une lecture rapide. Le
            detail journalier est accessible directement sous le graphique.
          </p>
          <DetailCard>
            {loading ? <SkeletonChart /> : <ForecastTimelineChart />}
          </DetailCard>
          <DetailCard>
            {loading ? <SkeletonChart /> : <ScenarioComparisonChart />}
          </DetailCard>
        </section>
      </AnimatedSection>
    </div>
  );
}
