"use client";

import Link from "next/link";
import { usePrevisionsPageModel } from "./use-previsions-page-model";

function formatPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

export default function PrevisionsPage() {
  const {
    selectedHorizonId,
    setSelectedHorizonId,
    selectedHorizon,
    availableHorizons,
    orderedForecast,
    topAlerts,
    criticalCount,
    alerts,
    alertsLoading,
    alertsError,
    forecastLoading,
    forecastError,
    configLoading,
    configError,
    retryAll,
  } = usePrevisionsPageModel();

  return (
    <div className="min-h-full space-y-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Anticiper
        </p>
        <h1 className="text-2xl font-semibold text-ink">
          Previsions{" "}
          {selectedHorizon ? `${selectedHorizon.days} jours` : "horizon actif"}
        </h1>
        <p className="text-sm text-ink-secondary">
          Projection de risque et capacite previsionnelle pour orienter les
          actions.
        </p>
      </section>

      {(forecastError || alertsError || configError) && (
        <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
          {forecastError ?? alertsError ?? configError}
          <button type="button" onClick={retryAll} className="ml-3 underline">
            Reessayer
          </button>
        </div>
      )}

      <section className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">
          Horizon de prevision
        </p>
        {configLoading ? (
          <p className="mt-2 text-sm text-ink-secondary">Chargement...</p>
        ) : availableHorizons.length === 0 ? (
          <p className="mt-2 text-sm text-ink-secondary">
            Aucun horizon actif configure.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {availableHorizons.map((horizon) => (
              <button
                key={horizon.id}
                type="button"
                onClick={() => setSelectedHorizonId(horizon.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  selectedHorizonId === horizon.id
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-ink-secondary"
                }`}
              >
                {horizon.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">
            Alertes ouvertes
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {alertsLoading ? "..." : (alerts?.length ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">
            Alertes critiques
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {alertsLoading ? "..." : criticalCount}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">
            Horizon couvert
          </p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {selectedHorizon ? `${selectedHorizon.days} jours` : "--"}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">
            Capacite previsionnelle
          </h2>
          <Link
            href="/actions"
            className="text-sm font-medium text-primary hover:text-primary-700"
          >
            Aller dans Actions
          </Link>
        </div>

        {forecastLoading ? (
          <p className="text-sm text-ink-secondary">Chargement...</p>
        ) : orderedForecast.length === 0 ? (
          <p className="text-sm text-ink-secondary">
            Aucune prevision disponible.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-secondary">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Demande</th>
                  <th className="py-2 pr-4">Capacite prevue</th>
                  <th className="py-2 pr-4">Capacite optimale</th>
                  <th className="py-2 pr-0">Risque</th>
                </tr>
              </thead>
              <tbody>
                {orderedForecast.map((row) => (
                  <tr
                    key={row.forecastDate}
                    className="border-b border-border/70"
                  >
                    <td className="py-2 pr-4 text-ink">{row.forecastDate}</td>
                    <td className="py-2 pr-4 text-ink">
                      {row.predictedDemand.toFixed(1)}
                    </td>
                    <td className="py-2 pr-4 text-ink">
                      {row.capacityPlannedPredicted.toFixed(1)}
                    </td>
                    <td className="py-2 pr-4 text-ink">
                      {row.capacityOptimalPredicted.toFixed(1)}
                    </td>
                    <td className="py-2 pr-0 text-ink">
                      {formatPercent(row.riskScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card px-4 py-4">
        <h2 className="text-base font-semibold text-ink">
          Alertes prioritaires
        </h2>
        {alertsLoading ? (
          <p className="mt-3 text-sm text-ink-secondary">Chargement...</p>
        ) : topAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">
            Aucune alerte active.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {topAlerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-sm"
              >
                <p className="font-medium text-ink">
                  {alert.siteId} · {alert.alertDate} ·{" "}
                  {String(alert.shift).toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  Severite: {alert.severity} · Risque:{" "}
                  {formatPercent(alert.pRupture)} · Ecart:{" "}
                  {alert.gapH.toFixed(1)}h
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
