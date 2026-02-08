"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface DashboardMirror {
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number | null;
  lastForecastDate: string | null;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function MirrorDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const { data, loading, error, refetch } = useApiGet<DashboardMirror>(
    ADMIN_ENDPOINTS.orgMirror(orgId),
  );

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() =>
            router.push(`/organisations/${encodeURIComponent(orgId)}`)
          }
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm text-gray-500 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;organisation
        </button>

        <div className="flex items-center gap-3">
          <Eye className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Dashboard client (miroir)
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Vue lecture seule du tableau de bord de l&apos;organisation
        </p>
      </div>

      {/* Readonly banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Mode lecture seule — ce dashboard reflete les donnees du client en temps
        reel.
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`mirror-skel-${i}`} />
            ))
          ) : (
            <>
              <StatCard
                label="Couverture humaine"
                value={formatPercent(data?.coverageHuman ?? 0)}
              />
              <StatCard
                label="Couverture marchandise"
                value={formatPercent(data?.coverageMerchandise ?? 0)}
              />
              <StatCard
                label="Alertes actives"
                value={String(data?.activeAlertsCount ?? 0)}
              />
              <StatCard
                label="Precision previsions"
                value={
                  data?.forecastAccuracy != null
                    ? formatPercent(data.forecastAccuracy)
                    : "N/A"
                }
              />
            </>
          )}
        </div>
      )}

      {data?.lastForecastDate && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <p className="text-sm text-gray-500">
            Derniere prevision :{" "}
            <span className="font-medium text-charcoal">
              {new Date(data.lastForecastDate).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
