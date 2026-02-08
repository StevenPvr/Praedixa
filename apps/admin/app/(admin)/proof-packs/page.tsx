"use client";

import { FileCheck, TrendingUp, Users } from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface OrgProofStat {
  organizationId: string;
  totalRecords: number;
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
}

interface ProofPacksSummary {
  totalProofRecords: number;
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
  orgsWithProof: number;
  orgs: OrgProofStat[];
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ProofPacksPage() {
  const { data, loading, error, refetch } = useApiGet<ProofPacksSummary>(
    ADMIN_ENDPOINTS.monitoringProofPacksSummary,
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Proof Packs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preuves de valeur mensuelles
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={`proof-skel-${i}`} />
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Proof Packs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Preuves de valeur mensuelles par organisation
          </p>
        </div>
        <button
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-gray-50"
          disabled
        >
          Exporter
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Total proof packs"
          value={String(data?.totalProofRecords ?? 0)}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Gain net total"
          value={formatEur(data?.totalGainNetEur ?? 0)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Organisations"
          value={String(data?.orgsWithProof ?? 0)}
          icon={<Users className="h-5 w-5" />}
        />
      </div>

      {/* Adoption rate */}
      {data?.avgAdoptionPct != null && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-2 text-sm font-medium text-gray-500">
            Taux d&apos;adoption moyen
          </h2>
          <p className="text-3xl font-semibold text-charcoal">
            {data.avgAdoptionPct.toFixed(1)}%
          </p>
        </div>
      )}

      {/* Per-org table */}
      {data?.orgs && data.orgs.length > 0 && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Par organisation
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400">
                  <th className="pb-2 font-medium">Organisation</th>
                  <th className="pb-2 text-right font-medium">Records</th>
                  <th className="pb-2 text-right font-medium">Gain net</th>
                  <th className="pb-2 text-right font-medium">Adoption</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.orgs.map((org) => (
                  <tr key={org.organizationId}>
                    <td className="py-2 font-mono text-xs text-gray-600">
                      {org.organizationId.slice(0, 8)}...
                    </td>
                    <td className="py-2 text-right text-charcoal">
                      {org.totalRecords}
                    </td>
                    <td className="py-2 text-right text-charcoal">
                      {formatEur(org.totalGainNetEur)}
                    </td>
                    <td className="py-2 text-right text-charcoal">
                      {org.avgAdoptionPct != null
                        ? `${org.avgAdoptionPct.toFixed(1)}%`
                        : "N/A"}
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
