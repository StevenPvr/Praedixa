"use client";

import { useClientContext } from "../client-context";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
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
  const currentUser = useCurrentUser();
  const toast = useToast();
  const canManageLifecycle = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);

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
    if (!canManageLifecycle) {
      toast.error("Permission requise: admin:org:write");
      return;
    }
    const result = await suspend({});
    if (result) {
      toast.success("Client suspendu");
      orgRefetch();
    } else {
      toast.error("Impossible de suspendre le client");
    }
  }

  async function handleReactivate() {
    if (!canManageLifecycle) {
      toast.error("Permission requise: admin:org:write");
      return;
    }
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
      <h2 className="font-serif text-lg font-semibold text-ink">Vue client</h2>

      {/* Organization Info */}
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                Organisation
              </p>
              <p className="text-sm font-medium text-ink">{org.name}</p>
              <p className="text-xs text-ink-tertiary">{org.slug}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                Contact
              </p>
              <p className="text-sm text-ink-secondary">{org.contactEmail}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Activity className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
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
              <MapPin className="mt-0.5 h-4 w-4 text-ink-placeholder" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Secteur
                </p>
                <p className="text-sm text-ink-secondary">{org.sector}</p>
              </div>
            </div>
          )}
          {org.siteCount != null && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-ink-placeholder" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Sites
                </p>
                <p className="text-sm text-ink-secondary">{org.siteCount}</p>
              </div>
            </div>
          )}
          {org.userCount != null && (
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-4 w-4 text-ink-placeholder" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Utilisateurs
                </p>
                <p className="text-sm text-ink-secondary">{org.userCount}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mirror KPIs */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Indicateurs cles
        </h3>
        {mirrorLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : mirrorError ? (
          <p className="text-sm text-ink-tertiary">{mirrorError}</p>
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
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Facturation
        </h3>
        {billingLoading ? (
          <SkeletonCard />
        ) : billingError ? (
          <p className="text-sm text-ink-tertiary">{billingError}</p>
        ) : billing ? (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Plan
                </p>
                <div className="mt-1">
                  <PlanBadge plan={billing.plan} />
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Cycle
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {billing.billingCycle ?? "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  <CreditCard className="mr-1 inline h-3 w-3" />
                  Montant mensuel
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {billing.monthlyAmount != null
                    ? `${billing.monthlyAmount} EUR`
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                  Prochaine echeance
                </p>
                <p className="mt-1 text-sm text-ink-secondary">
                  {billing.nextBillingDate ?? "-"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-ink-secondary">
          Actions rapides
        </h3>
        <div className="flex flex-wrap gap-3">
          {org.status === "active" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuspend}
              disabled={!canManageLifecycle || suspendLoading}
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
              disabled={!canManageLifecycle || reactivateLoading}
            >
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Reactiver
            </Button>
          )}
        </div>
        {!canManageLifecycle ? (
          <p className="text-xs text-ink-placeholder">
            Permission requise pour suspendre ou reactiver un client:
            {" "}
            <span className="font-medium text-ink">admin:org:write</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
