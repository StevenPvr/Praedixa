"use client";

import { Layers, Target, Star } from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface ScenarioTypeStat {
  optionType: string;
  count: number;
}

interface ScenarioSummary {
  totalScenarios: number;
  paretoOptimalCount: number;
  recommendedCount: number;
  byType: ScenarioTypeStat[];
}

const TYPE_LABELS: Record<string, string> = {
  hs: "Heures supplementaires",
  interim: "Interim",
  realloc_intra: "Reallocation intra-site",
  realloc_inter: "Reallocation inter-site",
  service_adjust: "Ajustement de service",
  outsource: "Sous-traitance",
};

export default function ScenariosPage() {
  const { data, loading, error, refetch } = useApiGet<ScenarioSummary>(
    ADMIN_ENDPOINTS.monitoringScenariosSummary,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Scenarios</h1>
          <p className="mt-1 text-sm text-gray-500">
            Scenarios de remediation generes
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`scen-skel-${i}`} />
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
        <h1 className="text-2xl font-semibold text-charcoal">Scenarios</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scenarios de remediation generes sur la plateforme
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total scenarios"
          value={String(data?.totalScenarios ?? 0)}
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label="Pareto-optimaux"
          value={String(data?.paretoOptimalCount ?? 0)}
          icon={<Target className="h-5 w-5" />}
        />
        <StatCard
          label="Recommandes"
          value={String(data?.recommendedCount ?? 0)}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      {/* By type */}
      {data?.byType && data.byType.length > 0 && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Repartition par type
          </h2>
          <div className="space-y-3">
            {data.byType.map((item) => (
              <div
                key={item.optionType}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-charcoal">
                  {TYPE_LABELS[item.optionType] ?? item.optionType}
                </span>
                <span className="text-sm font-semibold text-charcoal">
                  {item.count.toLocaleString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
