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
import { NextActionCard } from "@/components/dashboard/next-action-card";
import { ScenarioComparisonChart } from "@/components/dashboard/scenario-comparison-chart";

function formatDateFr(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
      ctaLabel: "Voir les actions",
      ctaHref: "/actions",
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
  const { data: alerts, loading: alertsLoading } = useApiGet<CoverageAlert[]>(
    "/api/v1/coverage-alerts?status=open&page_size=50",
  );

  const { data: summary, loading: summaryLoading } =
    useApiGet<DashboardSummary>("/api/v1/dashboard/summary");

  const loading = alertsLoading || summaryLoading;
  const banner = getBannerProps(alerts);

  return (
    <div className="space-y-6">
      <PageHeader title="Accueil" subtitle="Vue d'ensemble de vos previsions" />

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
      <section
        aria-label="Indicateurs cles"
        className="bg-gradient-ambient rounded-3xl p-6"
      >
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
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
                    ? formatDateFr(summary.lastForecastDate)
                    : "--"
                }
                icon={<TrendingUp className="h-5 w-5" />}
              />
            </StaggeredItem>
          </StaggeredGrid>
        )}
      </section>

      {/* Forecast Timeline Chart */}
      <AnimatedSection>
        <section aria-label="Prevision de capacite">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Prevision de capacite
          </h2>
          <DetailCard className="overflow-hidden">
            {loading ? <SkeletonChart /> : <ForecastTimelineChart />}
          </DetailCard>
          <DetailCard className="mt-3 border-l-4 border-l-amber-400 bg-amber-50/30">
            <p className="text-sm text-gray-600">
              Comparez la capacite prevue actuelle, la capacite prevue ajustee
              et la capacite optimale necessaire sur 14 jours pour visualiser
              instantanement l&apos;ecart a combler.
            </p>
          </DetailCard>
        </section>
      </AnimatedSection>

      {/* Next Action Card */}
      <AnimatedSection>
        <section aria-label="Prochaine action recommandee">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Prochaine action recommandee
          </h2>
          <NextActionCard alerts={alerts} loading={alertsLoading} />
        </section>
      </AnimatedSection>

      {/* Scenario Comparison Chart */}
      <AnimatedSection>
        <section aria-label="Comparaison des scenarios">
          <h2 className="mb-4 font-serif text-lg font-semibold text-charcoal">
            Comparaison des scenarios
          </h2>
          <DetailCard>
            <ScenarioComparisonChart />
          </DetailCard>
          <DetailCard className="mt-3 border-l-4 border-l-amber-400 bg-amber-50/30">
            <p className="text-sm text-gray-600">
              Rouge = cout sans Praedixa. Vert = cout si toutes les
              recommandations etaient suivies. Ambre = la realite observee.
            </p>
          </DetailCard>
        </section>
      </AnimatedSection>
    </div>
  );
}
