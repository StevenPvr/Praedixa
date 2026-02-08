"use client";

import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Users,
  MapPin,
  Mail,
  Calendar,
  Pause,
  Play,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";
import { SkeletonOrgDetail } from "@/components/skeletons/skeleton-org-detail";

interface OrgDepartment {
  id: string;
  name: string;
  employeeCount: number;
}

interface OrgSite {
  id: string;
  name: string;
  city: string | null;
  departments: OrgDepartment[];
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  siret: string | null;
  sector: string | null;
  size: string | null;
  headcount: number | null;
  status: OrgStatus;
  plan: PlanTier;
  timezone: string;
  locale: string;
  currency: string;
  contactEmail: string;
  logoUrl: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  siteCount: number;
  departmentCount: number;
  datasetCount: number;
  hierarchy: OrgSite[];
}

export default function OrgDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const {
    data: org,
    loading,
    error,
    refetch,
  } = useApiGet<OrgDetail>(ADMIN_ENDPOINTS.organization(orgId));

  const suspendMutation = useApiPost<Record<string, never>, OrgDetail>(
    ADMIN_ENDPOINTS.orgSuspend(orgId),
  );
  const reactivateMutation = useApiPost<Record<string, never>, OrgDetail>(
    ADMIN_ENDPOINTS.orgReactivate(orgId),
  );
  const churnMutation = useApiPost<Record<string, never>, OrgDetail>(
    ADMIN_ENDPOINTS.orgChurn(orgId),
  );

  async function handleSuspend() {
    const result = await suspendMutation.mutate({});
    if (result) refetch();
  }

  async function handleReactivate() {
    const result = await reactivateMutation.mutate({});
    if (result) refetch();
  }

  async function handleChurn() {
    const result = await churnMutation.mutate({});
    if (result) refetch();
  }

  if (loading) return <SkeletonOrgDetail />;
  if (error) return <ErrorFallback message={error} onRetry={refetch} />;
  if (!org) return null;

  const createdDate = new Date(org.createdAt).toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div>
        <button
          onClick={() => router.push("/organisations")}
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm text-gray-500 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux organisations
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-charcoal">
                {org.name}
              </h1>
              <OrgStatusBadge status={org.status} />
              <PlanBadge plan={org.plan} />
            </div>
            <p className="mt-1 text-sm text-gray-400">{org.slug}</p>
          </div>

          {/* Status actions */}
          <div className="flex items-center gap-2">
            {org.status === "active" && (
              <button
                onClick={handleSuspend}
                disabled={suspendMutation.loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-warning-500 px-4 py-2 text-sm font-medium text-warning-700 transition-colors hover:bg-warning-50 disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                {suspendMutation.loading ? "..." : "Suspendre"}
              </button>
            )}
            {org.status === "suspended" && (
              <button
                onClick={handleReactivate}
                disabled={reactivateMutation.loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-success-500 px-4 py-2 text-sm font-medium text-success-700 transition-colors hover:bg-success-50 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                {reactivateMutation.loading ? "..." : "Reactiver"}
              </button>
            )}
            {org.status !== "churned" && (
              <button
                onClick={handleChurn}
                disabled={churnMutation.loading}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-danger-500 px-4 py-2 text-sm font-medium text-danger-700 transition-colors hover:bg-danger-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {churnMutation.loading ? "..." : "Churner"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization info */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Informations
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-gray-400" />
              <dt className="text-gray-500">Contact</dt>
              <dd className="ml-auto font-medium text-charcoal">
                {org.contactEmail}
              </dd>
            </div>
            {org.legalName && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <dt className="text-gray-500">Raison sociale</dt>
                <dd className="ml-auto font-medium text-charcoal">
                  {org.legalName}
                </dd>
              </div>
            )}
            {org.siret && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <dt className="text-gray-500">SIRET</dt>
                <dd className="ml-auto font-mono text-xs text-charcoal">
                  {org.siret}
                </dd>
              </div>
            )}
            {org.sector && (
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-gray-400" />
                <dt className="text-gray-500">Secteur</dt>
                <dd className="ml-auto font-medium text-charcoal">
                  {org.sector}
                </dd>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <dt className="text-gray-500">Inscrit le</dt>
              <dd className="ml-auto font-medium text-charcoal">
                {createdDate}
              </dd>
            </div>
          </dl>
        </div>

        {/* Counts */}
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Statistiques
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Users className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-charcoal">
                  {org.userCount}
                </p>
                <p className="text-xs text-gray-400">Utilisateurs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <MapPin className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-charcoal">
                  {org.siteCount}
                </p>
                <p className="text-xs text-gray-400">Sites</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-charcoal">
                  {org.departmentCount}
                </p>
                <p className="text-xs text-gray-400">Departements</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <Building2 className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-lg font-semibold text-charcoal">
                  {org.datasetCount}
                </p>
                <p className="text-xs text-gray-400">Datasets</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hierarchy */}
      {org.hierarchy.length > 0 && (
        <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
          <h2 className="mb-4 text-sm font-medium text-gray-500">
            Hierarchie sites / departements
          </h2>
          <div className="space-y-4">
            {org.hierarchy.map((site) => (
              <div key={site.id}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-charcoal">{site.name}</span>
                  {site.city && (
                    <span className="text-xs text-gray-400">({site.city})</span>
                  )}
                </div>
                {site.departments.length > 0 && (
                  <div className="ml-6 mt-2 space-y-1">
                    {site.departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                        <span className="text-gray-600">{dept.name}</span>
                        <span className="text-xs text-gray-400">
                          ({dept.employeeCount} employes)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
