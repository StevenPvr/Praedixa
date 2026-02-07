"use client";

import Link from "next/link";
import { StatusBadge, SkeletonCard } from "@praedixa/ui";
import type { DashboardAlert } from "@praedixa/shared-types";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const severityVariant: Record<
  DashboardAlert["severity"],
  "neutral" | "warning" | "danger"
> = {
  info: "neutral",
  warning: "warning",
  error: "danger",
  critical: "danger",
};

const severityLabel: Record<DashboardAlert["severity"], string> = {
  info: "Info",
  warning: "Attention",
  error: "Erreur",
  critical: "Critique",
};

export function AlertsArbitrageList() {
  const {
    data: alerts,
    loading,
    error,
    refetch,
  } = useApiGet<DashboardAlert[]>("/api/v1/alerts");

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  /* v8 ignore next 3 */
  const riskAlerts =
    alerts?.filter((a) => a.type === "risk" && !a.dismissedAt) ?? [];

  if (riskAlerts.length === 0) {
    return (
      <ErrorFallback
        variant="empty"
        message="Aucune alerte de risque a arbitrer pour le moment."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {riskAlerts.map((alert) => (
        <div
          key={alert.id}
          className="flex flex-col gap-3 rounded-card border border-gray-200 bg-card p-5 shadow-card"
        >
          <div className="flex items-center gap-2">
            <StatusBadge
              variant={severityVariant[alert.severity]}
              label={severityLabel[alert.severity]}
              size="sm"
            />
          </div>
          <h3 className="text-sm font-semibold text-charcoal">{alert.title}</h3>
          <p className="flex-1 text-xs text-gray-500">{alert.message}</p>
          <Link
            href={`/arbitrage/${encodeURIComponent(alert.id)}`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-charcoal transition-colors hover:bg-amber-400"
          >
            Arbitrer
          </Link>
        </div>
      ))}
    </div>
  );
}
