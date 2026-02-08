"use client";

import { Settings, AlertCircle, CheckCircle, Building2 } from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface OrgMissingConfig {
  organizationId: string;
  missingTypes: string[];
  totalMissing: number;
}

interface MissingCostParams {
  totalOrgsWithMissing: number;
  totalMissingParams: number;
  orgs: OrgMissingConfig[];
}

const TYPE_LABELS: Record<string, string> = {
  overtime_hourly: "Cout horaire HS",
  interim_daily: "Cout journalier interim",
  realloc_cost: "Cout reallocation",
  outsource_unit: "Cout sous-traitance",
  penalty_understaffing: "Penalite sous-effectif",
  penalty_overstaffing: "Penalite sur-effectif",
};

export default function ParametresPage() {
  const { data, loading, error, refetch } = useApiGet<MissingCostParams>(
    ADMIN_ENDPOINTS.monitoringCostParamsMissing,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Parametres</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configuration des parametres de cout
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`param-skel-${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  const allConfigured = (data?.totalOrgsWithMissing ?? 0) === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Parametres</h1>
        <p className="mt-1 text-sm text-gray-500">
          Statut de configuration des parametres de cout par organisation
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Organisations avec manques"
          value={String(data?.totalOrgsWithMissing ?? 0)}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Parametres manquants"
          value={String(data?.totalMissingParams ?? 0)}
          icon={<Settings className="h-5 w-5" />}
        />
        <StatCard
          label="Statut global"
          value={allConfigured ? "Complet" : "Incomplet"}
          icon={
            allConfigured ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )
          }
        />
      </div>

      {/* Status banner */}
      {allConfigured ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Toutes les organisations ont leurs parametres de cout configures.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {data?.totalOrgsWithMissing} organisation
          {(data?.totalOrgsWithMissing ?? 0) > 1 ? "s" : ""} avec des
          parametres manquants.
        </div>
      )}

      {/* Per-org missing config table */}
      {data?.orgs && data.orgs.length > 0 && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Configurations manquantes par organisation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="pb-2 font-medium">Organisation</th>
                  <th className="pb-2 text-right font-medium">Manquants</th>
                  <th className="pb-2 font-medium">Types manquants</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.orgs.map((org) => (
                  <tr key={org.organizationId}>
                    <td className="py-2 font-mono text-xs text-gray-600">
                      {org.organizationId.slice(0, 8)}...
                    </td>
                    <td className="py-2 text-right text-charcoal">
                      {org.totalMissing}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap gap-1">
                        {org.missingTypes.map((type) => (
                          <span
                            key={type}
                            className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700"
                          >
                            {TYPE_LABELS[type] ?? type}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
