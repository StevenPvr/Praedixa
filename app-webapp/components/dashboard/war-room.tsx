"use client";

import Link from "next/link";
import { useMemo } from "react";
import type {
  CanonicalQualityDashboard,
  CoverageAlert,
  DashboardSummary,
} from "@praedixa/shared-types";
import { useApiGet } from "@/hooks/use-api";
import { useSiteScope } from "@/lib/site-scope";

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

export function WarRoomDashboard() {
  const { appendSiteParam } = useSiteScope();

  const summaryUrl = useMemo(
    () => appendSiteParam("/api/v1/live/dashboard/summary"),
    [appendSiteParam],
  );
  const alertsUrl = useMemo(
    () => appendSiteParam("/api/v1/live/coverage-alerts?status=open&page_size=50"),
    [appendSiteParam],
  );
  const qualityUrl = useMemo(
    () => appendSiteParam("/api/v1/live/canonical/quality"),
    [appendSiteParam],
  );

  const summaryQuery = useApiGet<DashboardSummary>(summaryUrl);
  const alertsQuery = useApiGet<CoverageAlert[]>(alertsUrl);
  const qualityQuery = useApiGet<CanonicalQualityDashboard>(qualityUrl);

  const alerts = alertsQuery.data ?? [];
  const criticalCount = alerts.filter((item) => item.severity === "critical").length;
  const highCount = alerts.filter((item) => item.severity === "high").length;
  const topAlerts = alerts.slice(0, 5);

  const hasError = summaryQuery.error || alertsQuery.error || qualityQuery.error;

  return (
    <div className="space-y-8 pb-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Pilotage quotidien
        </p>
        <h1 className="text-2xl font-semibold text-ink">Priorites du jour</h1>
        <p className="text-sm text-ink-secondary">
          Vue synthese des risques, de la qualite data et des prochaines actions.
        </p>
      </section>

      {hasError ? (
        <div className="rounded-xl border border-danger-light bg-danger-light/20 px-4 py-3 text-sm text-danger-text">
          {(summaryQuery.error ?? alertsQuery.error ?? qualityQuery.error) as string}
        </div>
      ) : criticalCount > 0 ? (
        <div className="rounded-xl border border-danger-light bg-danger-light/20 px-4 py-3 text-sm text-danger-text">
          {criticalCount} alerte(s) critique(s) et {highCount} alerte(s) elevee(s)
          necessitent une decision immediate.
        </div>
      ) : alerts.length > 0 ? (
        <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
          {alerts.length} alerte(s) ouvertes. Passez par le centre Actions pour
          prioriser les decisions.
        </div>
      ) : (
        <div className="rounded-xl border border-success-light bg-success-light/20 px-4 py-3 text-sm text-success-text">
          Aucun risque critique actif sur la fenetre courante.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">Alertes ouvertes</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {alertsQuery.loading ? "..." : alerts.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">Couverture humaine</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {summaryQuery.loading
              ? "..."
              : formatPercent(summaryQuery.data?.coverageHuman ?? null)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">Qualite data</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {qualityQuery.loading
              ? "..."
              : formatPercent(qualityQuery.data?.coveragePct ?? null)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-[0.08em] text-ink-secondary">Precision prevision</p>
          <p className="mt-2 text-2xl font-semibold text-ink">
            {summaryQuery.loading
              ? "..."
              : formatPercent(summaryQuery.data?.forecastAccuracy ?? null)}
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Alertes prioritaires</h2>
            <Link
              href="/actions"
              className="text-sm font-medium text-primary hover:text-primary-700"
            >
              Ouvrir Actions
            </Link>
          </div>
          {alertsQuery.loading ? (
            <p className="mt-4 text-sm text-ink-secondary">Chargement...</p>
          ) : topAlerts.length === 0 ? (
            <p className="mt-4 text-sm text-ink-secondary">Aucune alerte active.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="rounded-lg border border-border bg-surface-sunken px-3 py-2"
                >
                  <p className="text-sm font-medium text-ink">
                    {alert.siteId} · {alert.alertDate} · {String(alert.shift).toUpperCase()}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Severite: {alert.severity} · Risque: {formatPercent(alert.pRupture)} ·
                    Impact: {formatCurrency(alert.impactEur ?? null)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card px-4 py-4">
          <h2 className="text-base font-semibold text-ink">Qualite des donnees</h2>
          {qualityQuery.loading ? (
            <p className="mt-4 text-sm text-ink-secondary">Chargement...</p>
          ) : (
            <dl className="mt-4 space-y-2 text-sm text-ink-secondary">
              <div className="flex items-center justify-between">
                <dt>Enregistrements</dt>
                <dd className="font-medium text-ink">{qualityQuery.data?.totalRecords ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Sites couverts</dt>
                <dd className="font-medium text-ink">{qualityQuery.data?.sites ?? "--"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Taux de couverture</dt>
                <dd className="font-medium text-ink">{formatPercent(qualityQuery.data?.coveragePct ?? null)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Shifts manquants</dt>
                <dd className="font-medium text-ink">
                  {formatPercent(qualityQuery.data?.missingShiftsPct ?? null)}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>
    </div>
  );
}
