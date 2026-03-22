"use client";

import {
  Activity,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Pause,
  Play,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  SkeletonCard,
  StatCard,
} from "@praedixa/ui";

import { PlanBadge } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";

import type {
  BillingData,
  MirrorData,
  OrgDetail,
} from "./vue-client-page-model";

type VueClientOrganizationSectionProps = Readonly<{
  org: OrgDetail;
}>;

export function VueClientOrganizationSection({
  org,
}: VueClientOrganizationSectionProps) {
  const hasSiteCount = typeof org.siteCount === "number";
  const hasUserCount = typeof org.userCount === "number";

  return (
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
        {org.sector ? (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                Secteur
              </p>
              <p className="text-sm text-ink-secondary">{org.sector}</p>
            </div>
          </div>
        ) : null}
        {hasSiteCount ? (
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                Sites
              </p>
              <p className="text-sm text-ink-secondary">{org.siteCount}</p>
            </div>
          </div>
        ) : null}
        {hasUserCount ? (
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 text-ink-placeholder" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-placeholder">
                Utilisateurs
              </p>
              <p className="text-sm text-ink-secondary">{org.userCount}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

type VueClientMirrorSectionProps = Readonly<{
  loading: boolean;
  error: string | null;
  mirror: MirrorData | null;
}>;

export function VueClientMirrorSection({
  loading,
  error,
  mirror,
}: VueClientMirrorSectionProps) {
  let content: React.ReactNode = null;

  if (loading) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  } else if (error) {
    content = <p className="text-sm text-ink-tertiary">{error}</p>;
  } else if (mirror) {
    content = (
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
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">
        Indicateurs cles
      </h3>
      {content}
    </div>
  );
}

type VueClientBillingSectionProps = Readonly<{
  canReadBilling: boolean;
  loading: boolean;
  error: string | null;
  billing: BillingData | null;
}>;

export function VueClientBillingSection({
  canReadBilling,
  loading,
  error,
  billing,
}: VueClientBillingSectionProps) {
  const hasBilling = billing !== null;
  const hasMonthlyAmount =
    hasBilling && typeof billing.monthlyAmount === "number";
  let content: React.ReactNode;

  if (canReadBilling) {
    if (loading) {
      content = <SkeletonCard />;
    } else if (error) {
      content = <p className="text-sm text-ink-tertiary">{error}</p>;
    } else if (hasBilling) {
      content = (
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
                {hasMonthlyAmount ? `${billing.monthlyAmount} EUR` : "-"}
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
      );
    } else {
      content = null;
    }
  } else {
    content = (
      <p className="text-sm text-ink-tertiary">
        Permission requise: admin:billing:read
      </p>
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">
        Facturation
      </h3>
      {content}
    </div>
  );
}

type VueClientQuickActionsSectionProps = Readonly<{
  status: OrgStatus;
  canManageLifecycle: boolean;
  suspendLoading: boolean;
  reactivateLoading: boolean;
  onSuspend: () => void;
  onReactivate: () => void;
}>;

export function VueClientQuickActionsSection({
  status,
  canManageLifecycle,
  suspendLoading,
  reactivateLoading,
  onSuspend,
  onReactivate,
}: VueClientQuickActionsSectionProps) {
  const lifecycleBlocked = canManageLifecycle === false;
  const suspendDisabled = lifecycleBlocked || suspendLoading;
  const reactivateDisabled = lifecycleBlocked || reactivateLoading;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">
        Actions rapides
      </h3>
      <div className="flex flex-wrap gap-3">
        {status === "active" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onSuspend}
            disabled={suspendDisabled}
          >
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            Suspendre
          </Button>
        ) : null}
        {status === "suspended" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onReactivate}
            disabled={reactivateDisabled}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Reactiver
          </Button>
        ) : null}
      </div>
      {lifecycleBlocked ? (
        <p className="text-xs text-ink-placeholder">
          Permission requise pour suspendre ou reactiver un client:{" "}
          <span className="font-medium text-ink">admin:org:write</span>
        </p>
      ) : null}
    </div>
  );
}
