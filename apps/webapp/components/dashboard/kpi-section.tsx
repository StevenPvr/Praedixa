"use client";

import { Users, Package, AlertTriangle, TrendingUp } from "lucide-react";
import { StatCard } from "@praedixa/ui";
import { SkeletonCard } from "@praedixa/ui";

interface DashboardSummary {
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number | null;
}

interface KpiSectionProps {
  data: DashboardSummary | null;
  loading: boolean;
}

export function KpiSection({ data, loading }: KpiSectionProps) {
  if (loading) {
    return (
      <section
        aria-label="Indicateurs cles"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    );
  }

  if (!data) return null;

  const accuracy = data.forecastAccuracy;
  const accuracyDirection =
    accuracy !== null
      ? accuracy >= 90
        ? "up"
        : accuracy >= 70
          ? "flat"
          : "down"
      : "flat";

  return (
    <section
      aria-label="Indicateurs cles"
      className="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      <StatCard
        variant="accent"
        label="Couverture humaine"
        value={`${data.coverageHuman.toFixed(0)}%`}
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
      />
      <StatCard
        label="Couverture marchandise"
        value={`${data.coverageMerchandise.toFixed(0)}%`}
        icon={<Package className="h-5 w-5" aria-hidden="true" />}
      />
      <StatCard
        variant={data.activeAlertsCount > 0 ? "danger" : "default"}
        label="Alertes actives"
        value={String(data.activeAlertsCount)}
        icon={<AlertTriangle className="h-5 w-5" aria-hidden="true" />}
      />
      <StatCard
        variant={accuracy !== null && accuracy >= 90 ? "success" : "default"}
        label="Precision forecast"
        value={accuracy !== null ? `${accuracy.toFixed(0)}%` : "--"}
        trendDirection={accuracyDirection}
        icon={<TrendingUp className="h-5 w-5" aria-hidden="true" />}
      />
    </section>
  );
}
