"use client";

import { AlertTriangle, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface SeverityCount {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface StatusCount {
  open: number;
  acknowledged: number;
  resolved: number;
  expired: number;
}

interface AlertSummary {
  total: number;
  bySeverity: SeverityCount;
  byStatus: StatusCount;
}

export default function AlertesPage() {
  const { data, loading, error, refetch } = useApiGet<AlertSummary>(
    ADMIN_ENDPOINTS.monitoringAlertsSummary,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Alertes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Vue d&apos;ensemble des alertes de couverture
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`alert-skel-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Alertes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {data?.total ?? 0} alerte{(data?.total ?? 0) !== 1 ? "s" : ""} au
          total
        </p>
      </div>

      {/* Severity cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Critique"
          value={String(data?.bySeverity.critical ?? 0)}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <StatCard
          label="Haute"
          value={String(data?.bySeverity.high ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Moyenne"
          value={String(data?.bySeverity.medium ?? 0)}
          icon={<Clock className="h-5 w-5" />}
        />
        <StatCard
          label="Basse"
          value={String(data?.bySeverity.low ?? 0)}
          icon={<CheckCircle className="h-5 w-5" />}
        />
      </div>

      {/* Status breakdown */}
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <h2 className="mb-4 text-sm font-medium text-gray-500">
          Repartition par statut
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-semibold text-charcoal">
              {data?.byStatus.open ?? 0}
            </p>
            <p className="text-xs text-gray-400">Ouvertes</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-charcoal">
              {data?.byStatus.acknowledged ?? 0}
            </p>
            <p className="text-xs text-gray-400">Prises en charge</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-charcoal">
              {data?.byStatus.resolved ?? 0}
            </p>
            <p className="text-xs text-gray-400">Resolues</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-charcoal">
              {data?.byStatus.expired ?? 0}
            </p>
            <p className="text-xs text-gray-400">Expirees</p>
          </div>
        </div>
      </div>
    </div>
  );
}
