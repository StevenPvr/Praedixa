"use client";

import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  StatCard,
  SkeletonCard,
  Button,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Mail,
  Users,
  MapPin,
  Activity,
  CreditCard,
  Pause,
  Play,
} from "lucide-react";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  sector?: string;
  size?: string;
  userCount?: number;
  siteCount?: number;
  createdAt?: string;
}

interface MirrorData {
  totalEmployees?: number;
  totalSites?: number;
  activeAlerts?: number;
  forecastAccuracy?: number;
  avgAbsenteeism?: number;
  coverageRate?: number;
}

interface BillingData {
  plan: PlanTier;
  billingCycle?: string;
  currentUsage?: number;
  usageLimit?: number;
  nextBillingDate?: string;
  monthlyAmount?: number;
}

export default function VueClientPage() {
  const { orgId } = useClientContext();
  const toast = useToast();

  const {
    data: org,
    loading: orgLoading,
    error: orgError,
    refetch: orgRefetch,
  } = useApiGet<OrgDetail>(ADMIN_ENDPOINTS.organization(orgId));

  const {
    data: mirror,
    loading: mirrorLoading,
    error: mirrorError,
  } = useApiGet<MirrorData>(ADMIN_ENDPOINTS.orgMirror(orgId));

  const {
    data: billing,
    loading: billingLoading,
    error: billingError,
  } = useApiGet<BillingData>(ADMIN_ENDPOINTS.orgBilling(orgId));

  const { mutate: suspend, loading: suspendLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgSuspend(orgId));

  const { mutate: reactivate, loading: reactivateLoading } = useApiPost<
    Record<string, never>,
    unknown
  >(ADMIN_ENDPOINTS.orgReactivate(orgId));

  async function handleSuspend() {
    const result = await suspend({});
    if (result) {
      toast.success("Client suspendu");
      orgRefetch();
    } else {
      toast.error("Impossible de suspendre le client");
    }
  }

  async function handleReactivate() {
    const result = await reactivate({});
    if (result) {
      toast.success("Client reactive");
      orgRefetch();
    } else {
      toast.error("Impossible de reactiver le client");
    }
  }

  if (orgLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (orgError || !org) {
    return (
      <ErrorFallback
        message={orgError ?? "Client introuvable"}
        onRetry={orgRefetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-neutral-900">
        Vue client
      </h2>

      {/* Organization Info */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Organisation
              </p>
              <p className="text-sm font-medium text-neutral-900">{org.name}</p>
              <p className="text-xs text-neutral-500">{org.slug}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Contact
              </p>
              <p className="text-sm text-neutral-700">{org.contactEmail}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-4 w-4 text-neutral-400" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                Statut / Plan
              </p>
              <div className="mt-1 flex items-center gap-2">
                <OrgStatusBadge status={org.status} />
                <PlanBadge plan={org.plan} />
              </div>
            </div>
          </div>
          {org.sector && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Secteur
                </p>
                <p className="text-sm text-neutral-700">{org.sector}</p>
              </div>
            </div>
          )}
          {org.siteCount != null && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Sites
                </p>
                <p className="text-sm text-neutral-700">{org.siteCount}</p>
              </div>
            </div>
          )}
          {org.userCount != null && (
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 text-neutral-400" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Utilisateurs
                </p>
                <p className="text-sm text-neutral-700">{org.userCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mirror KPIs */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
          Indicateurs cles
        </h3>
        {mirrorLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : mirrorError ? (
          <p className="text-sm text-neutral-500">{mirrorError}</p>
        ) : mirror ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Employes"
              value={String(mirror.totalEmployees ?? "-")}
              icon={<Users className="h-4 w-4" />}
            />
            <StatCard
              label="Sites"
              value={String(mirror.totalSites ?? "-")}
              icon={<MapPin className="h-4 w-4" />}
            />
            <StatCard
              label="Alertes actives"
              value={String(mirror.activeAlerts ?? "-")}
              icon={<Activity className="h-4 w-4" />}
              variant={
                mirror.activeAlerts && mirror.activeAlerts > 0
                  ? "warning"
                  : undefined
              }
            />
          </div>
        ) : null}
      </div>

      {/* Billing Summary */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
          Facturation
        </h3>
        {billingLoading ? (
          <SkeletonCard />
        ) : billingError ? (
          <p className="text-sm text-neutral-500">{billingError}</p>
        ) : billing ? (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Plan
                </p>
                <div className="mt-1">
                  <PlanBadge plan={billing.plan} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Cycle
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {billing.billingCycle ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  <CreditCard className="mr-1 inline h-3 w-3" />
                  Montant mensuel
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {billing.monthlyAmount != null
                    ? `${billing.monthlyAmount} EUR`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
                  Prochaine echeance
                </p>
                <p className="mt-1 text-sm text-neutral-700">
                  {billing.nextBillingDate ?? "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
          Actions rapides
        </h3>
        <div className="flex flex-wrap gap-3">
          {org.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuspend}
              disabled={suspendLoading}
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Suspendre
            </Button>
          )}
          {org.status === "suspended" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReactivate}
              disabled={reactivateLoading}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Reactiver
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
