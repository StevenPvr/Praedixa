"use client";

import {
  Building2,
  Users,
  Database,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Target,
} from "lucide-react";
import { StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { SkeletonAdminDashboard } from "@/components/skeletons/skeleton-admin-dashboard";

interface PlatformKPIs {
  totalOrganizations: number;
  totalUsers: number;
  totalDatasets: number;
  totalForecasts: number;
  activeOrganizations: number;
  totalDecisions: number;
}

interface ErrorMetrics {
  ingestionSuccessRate: number;
  ingestionErrorCount: number;
  apiErrorRate: number;
}

interface OrgCoverageStat {
  organizationId: string;
  totalRecords: number;
  completenessScore: number;
}

interface CanonicalCoverage {
  totalOrgs: number;
  avgCompleteness: number;
  orgs: OrgCoverageStat[];
}

interface AlertSummary {
  total: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byStatus: {
    open: number;
    acknowledged: number;
    resolved: number;
    expired: number;
  };
}

interface ProofPacksSummary {
  totalProofRecords: number;
  totalGainNetEur: number;
  avgAdoptionPct: number | null;
  orgsWithProof: number;
  orgs: unknown[];
}

interface AdoptionMetrics {
  overallAdoptionPct: number;
  totalDecisions: number;
  adoptedCount: number;
  overriddenCount: number;
  orgs: unknown[];
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboardPage() {
  const {
    data: kpis,
    loading: kpisLoading,
    error: kpisError,
    refetch: refetchKpis,
  } = useApiGet<PlatformKPIs>(ADMIN_ENDPOINTS.platformKPIs);

  const {
    data: errors,
    loading: errorsLoading,
    error: errorsError,
    refetch: refetchErrors,
  } = useApiGet<ErrorMetrics>(ADMIN_ENDPOINTS.errors);

  const { data: coverage, loading: coverageLoading } =
    useApiGet<CanonicalCoverage>(ADMIN_ENDPOINTS.monitoringCanonicalCoverage);

  const { data: alerts, loading: alertsLoading } = useApiGet<AlertSummary>(
    ADMIN_ENDPOINTS.monitoringAlertsSummary,
  );

  const { data: proofPacks, loading: proofLoading } =
    useApiGet<ProofPacksSummary>(ADMIN_ENDPOINTS.monitoringProofPacksSummary);

  const { data: adoption, loading: adoptionLoading } =
    useApiGet<AdoptionMetrics>(ADMIN_ENDPOINTS.monitoringDecisionsAdoption);

  if (kpisLoading && errorsLoading) {
    return <SkeletonAdminDashboard />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vue d&apos;ensemble de la plateforme
        </p>
      </div>

      {/* KPIs */}
      {kpisError ? (
        <ErrorFallback message={kpisError} onRetry={refetchKpis} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpisLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={`kpi-skel-${i}`} />
            ))
          ) : (
            <>
              <StatCard
                label="Organisations"
                value={String(kpis?.totalOrganizations ?? 0)}
                icon={<Building2 className="h-5 w-5" />}
              />
              <StatCard
                label="Utilisateurs"
                value={String(kpis?.totalUsers ?? 0)}
                icon={<Users className="h-5 w-5" />}
              />
              <StatCard
                label="Datasets"
                value={String(kpis?.totalDatasets ?? 0)}
                icon={<Database className="h-5 w-5" />}
              />
              <StatCard
                label="Previsions"
                value={String(kpis?.totalForecasts ?? 0)}
                icon={<TrendingUp className="h-5 w-5" />}
              />
            </>
          )}
        </div>
      )}

      {/* Error metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        {errorsError ? (
          <ErrorFallback message={errorsError} onRetry={refetchErrors} />
        ) : errorsLoading ? (
          <SkeletonCard />
        ) : (
          <>
            <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
              <h2 className="mb-4 text-sm font-medium text-gray-500">
                Taux de succes ingestion
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-charcoal">
                  {((errors?.ingestionSuccessRate ?? 0) * 100).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">
                  ({errors?.ingestionErrorCount ?? 0} erreurs)
                </span>
              </div>
            </div>
            <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
              <h2 className="mb-4 text-sm font-medium text-gray-500">
                Taux d&apos;erreur API
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-charcoal">
                  {((errors?.apiErrorRate ?? 0) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Operational overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Canonical coverage */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Couverture canonique
          </h2>
          {coverageLoading ? (
            <SkeletonCard />
          ) : coverage ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <Database className="h-5 w-5 text-gray-400" />
                <span className="text-3xl font-semibold text-charcoal">
                  {(coverage.avgCompleteness * 100).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">
                  completude moyenne
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {coverage.totalOrgs} organisation
                {coverage.totalOrgs !== 1 ? "s" : ""} avec donnees canoniques
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnee disponible</p>
          )}
        </div>

        {/* Active alerts */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Alertes actives
          </h2>
          {alertsLoading ? (
            <SkeletonCard />
          ) : alerts ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <AlertTriangle className="h-5 w-5 text-gray-400" />
                <span className="text-3xl font-semibold text-charcoal">
                  {alerts.byStatus.open + alerts.byStatus.acknowledged}
                </span>
                <span className="text-sm text-gray-400">alertes actives</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-gray-500">
                    Critiques: {alerts.bySeverity.critical}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-gray-500">
                    Hautes: {alerts.bySeverity.high}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnee disponible</p>
          )}
        </div>

        {/* Proof pack completion */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Proof Packs
          </h2>
          {proofLoading ? (
            <SkeletonCard />
          ) : proofPacks ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <FileCheck className="h-5 w-5 text-gray-400" />
                <span className="text-3xl font-semibold text-charcoal">
                  {formatEur(proofPacks.totalGainNetEur)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{proofPacks.totalProofRecords} proof records</span>
                <span>
                  {proofPacks.orgsWithProof} org
                  {proofPacks.orgsWithProof !== 1 ? "s" : ""}
                </span>
              </div>
              {proofPacks.avgAdoptionPct != null && (
                <p className="text-sm text-gray-500">
                  Adoption:{" "}
                  <span className="font-medium text-charcoal">
                    {proofPacks.avgAdoptionPct.toFixed(1)}%
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnee disponible</p>
          )}
        </div>

        {/* Adoption metrics */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Adoption des decisions
          </h2>
          {adoptionLoading ? (
            <SkeletonCard />
          ) : adoption ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <Target className="h-5 w-5 text-gray-400" />
                <span className="text-3xl font-semibold text-charcoal">
                  {(adoption.overallAdoptionPct ?? 0).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-400">
                  taux d&apos;adoption
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{adoption.adoptedCount ?? 0} adoptees</span>
                <span>{adoption.overriddenCount ?? 0} modifiees</span>
              </div>
              <p className="text-sm text-gray-500">
                Sur {adoption.totalDecisions ?? 0} decision
                {(adoption.totalDecisions ?? 0) !== 1 ? "s" : ""} totales
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnee disponible</p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      {kpis && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Resume plateforme
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold text-charcoal">
                {kpis.activeOrganizations}
              </p>
              <p className="text-xs text-gray-400">Organisations actives</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-charcoal">
                {kpis.totalDecisions}
              </p>
              <p className="text-xs text-gray-400">Decisions prises</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-charcoal">
                {kpis.totalForecasts}
              </p>
              <p className="text-xs text-gray-400">Previsions generees</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
