"use client";

import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { KpiSection } from "@/components/dashboard/kpi-section";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { ForecastChart } from "@/components/dashboard/forecast-chart";

interface DashboardSummary {
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number | null;
  lastForecastDate: string | null;
}

interface Alert {
  id: string;
  type: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  message: string;
  createdAt: string;
  dismissedAt: string | null;
}

export default function DashboardPage() {
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApiGet<DashboardSummary>("/api/v1/dashboard/summary");

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<Alert[]>("/api/v1/alerts");

  const handleAlertDismissed = () => {
    refetchAlerts();
    refetchSummary();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble de la capacite operationnelle
        </p>
      </div>

      {summaryError ? (
        <ErrorFallback message={summaryError} onRetry={refetchSummary} />
      ) : (
        <KpiSection data={summary} loading={summaryLoading} />
      )}

      {alertsError ? (
        <ErrorFallback message={alertsError} onRetry={refetchAlerts} />
      ) : (
        <AlertsList
          alerts={alerts}
          loading={alertsLoading}
          onDismissed={handleAlertDismissed}
        />
      )}

      <ForecastChart />
    </div>
  );
}
