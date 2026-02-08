"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import { Badge, Button, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import {
  formatSeverity,
  formatHorizon,
  formatAlertStatus,
} from "@/lib/formatters";

export default function AlertDetailPage() {
  const params = useParams<{ alertId: string }>();
  const alertId = params.alertId;

  const {
    data: alert,
    loading,
    error,
    refetch,
  } = useApiGet<CoverageAlert>(
    `/api/v1/coverage-alerts?id=${encodeURIComponent(alertId)}`,
  );

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de l&apos;alerte
        </h1>
        <ErrorFallback message={error} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Detail de l&apos;alerte
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Comprenez les causes et decidez de la suite
        </p>
      </div>

      {loading ? (
        <SkeletonCard />
      ) : alert ? (
        <>
          {/* Alert Info */}
          <section
            aria-label="Informations alerte"
            className="rounded-card border border-gray-200 bg-card p-6"
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div>
                <p className="text-xs text-gray-500">Site</p>
                <p className="font-medium text-charcoal">{alert.siteId}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="font-medium text-charcoal">{alert.alertDate}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Poste</p>
                <p className="font-medium text-charcoal">{alert.shift}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Echeance</p>
                <p className="font-medium text-charcoal">
                  {formatHorizon(alert.horizon)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Urgence</p>
                <Badge
                  variant={
                    alert.severity === "critical"
                      ? "destructive"
                      : alert.severity === "high"
                        ? "destructive"
                        : alert.severity === "medium"
                          ? "default"
                          : "secondary"
                  }
                >
                  {formatSeverity(alert.severity)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Etat</p>
                <p className="font-medium text-charcoal">
                  {formatAlertStatus(alert.status)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Risque de sous-effectif</p>
                <p className="text-lg font-bold text-charcoal">
                  {(alert.pRupture * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Heures manquantes</p>
                <p className="text-lg font-bold text-charcoal">{alert.gapH}h</p>
              </div>
              {alert.impactEur !== undefined && (
                <div>
                  <p className="text-xs text-gray-500">Cout estime</p>
                  <p className="text-lg font-bold text-charcoal">
                    {alert.impactEur.toLocaleString("fr-FR")} EUR
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Drivers */}
          <section aria-label="Causes identifiees">
            <h2 className="mb-3 text-lg font-semibold text-charcoal">
              Causes identifiees
            </h2>
            {alert.driversJson.length > 0 ? (
              <ul className="space-y-2">
                {alert.driversJson.map((driver, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-gray-200 bg-card px-4 py-3 text-sm text-charcoal"
                  >
                    {driver}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">
                Aucune cause specifique identifiee pour cette alerte.
              </p>
            )}
          </section>

          {/* Action */}
          <div className="flex gap-3">
            <Link href={`/arbitrage/${alertId}`}>
              <Button>Trouver une solution</Button>
            </Link>
            <Link href="/previsions/alertes">
              <Button variant="outline">Retour a la liste</Button>
            </Link>
          </div>
        </>
      ) : (
        <ErrorFallback variant="empty" message="Alerte introuvable" />
      )}
    </div>
  );
}
