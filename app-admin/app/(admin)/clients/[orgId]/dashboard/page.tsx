"use client";

import { useMemo } from "react";
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
  DataTable,
  type DataTableColumn,
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
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  sector?: string;
  userCount?: number;
  siteCount?: number;
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
  monthlyAmount?: number;
  nextBillingDate?: string;
}

interface AlertItem {
  id: string;
  date: string;
  type: string;
  severity: string;
  status: string;
  siteId?: string;
  siteName?: string;
}

interface ScenarioItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface OrgOverview {
  organization: OrgDetail;
  mirror: MirrorData;
  billing: BillingData;
  alerts: AlertItem[];
  scenarios: ScenarioItem[];
}

const ALERT_COLUMNS: DataTableColumn<AlertItem>[] = [
  {
    key: "date",
    label: "Date",
    render: (row) => (
      <span className="text-xs text-ink-tertiary">
        {new Date(row.date).toLocaleDateString("fr-FR")}
      </span>
    ),
  },
  { key: "type", label: "Type" },
  { key: "severity", label: "Severite" },
  { key: "status", label: "Statut" },
  { key: "siteName", label: "Site" },
];

const SCENARIO_COLUMNS: DataTableColumn<ScenarioItem>[] = [
  { key: "name", label: "Scenario" },
  { key: "status", label: "Statut" },
  {
    key: "createdAt",
    label: "Cree le",
    render: (row) => (
      <span className="text-xs text-ink-tertiary">
        {new Date(row.createdAt).toLocaleDateString("fr-FR")}
      </span>
    ),
  },
];

export default function ClientDashboardPage() {
  const { orgId, selectedSiteId } = useClientContext();
  const currentUser = useCurrentUser();
  const toast = useToast();

  const {
    data: overview,
    loading: overviewLoading,
    error: overviewError,
    refetch: overviewRefetch,
  } = useApiGet<OrgOverview>(ADMIN_ENDPOINTS.orgOverview(orgId));

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
      toast.error("Permissions insuffisantes pour suspendre ce client");
      return;
    }
    const result = await suspend({});
    if (result) {
      toast.success("Client suspendu");
      overviewRefetch();
    } else {
      toast.error("Impossible de suspendre le client");
    }
  }

  async function handleReactivate() {
    if (!canManageLifecycle) {
      toast.error("Permissions insuffisantes pour reactiver ce client");
      return;
    }
    const result = await reactivate({});
    if (result) {
      toast.success("Client reactive");
      overviewRefetch();
    } else {
      toast.error("Impossible de reactiver le client");
    }
  }

  const org = overview?.organization;
  const mirror = overview?.mirror;
  const billing = overview?.billing;
  const canManageLifecycle = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);

  const topAlerts = useMemo(() => {
    const alerts = overview?.alerts ?? [];
    const scopedAlerts =
      selectedSiteId == null
        ? alerts
        : alerts.filter((alert) => alert.siteId === selectedSiteId);
    return scopedAlerts.slice(0, 5);
  }, [overview?.alerts, selectedSiteId]);
  const topScenarios = useMemo(
    () => (overview?.scenarios ?? []).slice(0, 5),
    [overview?.scenarios],
  );

  if (overviewLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (overviewError || !org) {
    return (
      <ErrorFallback
        message={overviewError ?? "Client introuvable"}
        onRetry={overviewRefetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-ink">
            Tableau de bord client
          </h2>
          <p className="text-sm text-ink-tertiary">
            Vue synthetique du compte, des risques et des leviers admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrgStatusBadge status={org.status} />
          <PlanBadge plan={org.plan} />
        </div>
      </div>

      <Card className="rounded-2xl shadow-soft">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-ink-placeholder">
              Organisation
            </p>
            <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
              <Building2 className="h-4 w-4 text-ink-tertiary" />
              {org.name}
            </p>
            <p className="text-xs text-ink-tertiary">{org.slug}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-ink-placeholder">
              Contact
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <Mail className="h-4 w-4 text-ink-tertiary" />
              {org.contactEmail}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-ink-placeholder">
              Utilisateurs
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <Users className="h-4 w-4 text-ink-tertiary" />
              {org.userCount ?? "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wider text-ink-placeholder">
              Sites
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-ink-secondary">
              <MapPin className="h-4 w-4 text-ink-tertiary" />
              {org.siteCount ?? "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Employes"
          value={String(mirror?.totalEmployees ?? "-")}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Sites actifs"
          value={String(mirror?.totalSites ?? "-")}
          icon={<MapPin className="h-4 w-4" />}
        />
        <StatCard
          label="Alertes actives"
          value={String(mirror?.activeAlerts ?? "-")}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={
            mirror?.activeAlerts && mirror.activeAlerts > 0
              ? "warning"
              : undefined
          }
        />
        <StatCard
          label="Precision prevision"
          value={
            mirror?.forecastAccuracy != null
              ? `${Math.round(mirror.forecastAccuracy * 100)}%`
              : "-"
          }
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-secondary">
            Alertes prioritaires
          </h3>
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={ALERT_COLUMNS}
                data={topAlerts}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-secondary">
            Scenarios recents
          </h3>
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={SCENARIO_COLUMNS}
                data={topScenarios}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-2 p-5">
            <h3 className="text-sm font-medium text-ink-secondary">
              Facturation
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-sm text-ink-tertiary">
                <span className="text-ink">Plan:</span> {billing?.plan ?? "-"}
              </p>
              <p className="text-sm text-ink-tertiary">
                <span className="text-ink">Cycle:</span>{" "}
                {billing?.billingCycle ?? "-"}
              </p>
              <p className="text-sm text-ink-tertiary">
                <span className="text-ink">Montant:</span>{" "}
                {billing?.monthlyAmount != null
                  ? `${billing.monthlyAmount} EUR`
                  : "-"}
              </p>
              <p className="text-sm text-ink-tertiary">
                <span className="text-ink">Prochaine echeance:</span>{" "}
                {billing?.nextBillingDate
                  ? new Date(billing.nextBillingDate).toLocaleDateString(
                      "fr-FR",
                    )
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-soft">
          <CardContent className="space-y-3 p-5">
            <h3 className="text-sm font-medium text-ink-secondary">
              Actions admin
            </h3>
            <div className="flex flex-wrap gap-2">
              {org.status === "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSuspend}
                  disabled={suspendLoading || !canManageLifecycle}
                >
                  <Pause className="mr-1.5 h-3.5 w-3.5" />
                  Suspendre
                </Button>
              ) : null}
              {org.status === "suspended" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReactivate}
                  disabled={reactivateLoading || !canManageLifecycle}
                >
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                  Reactiver
                </Button>
              ) : null}
              <a
                href={ADMIN_ENDPOINTS.organization(orgId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[36px] items-center rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink"
              >
                <Activity className="mr-1.5 h-3.5 w-3.5" />
                Endpoint org
              </a>
            </div>
            {!canManageLifecycle ? (
              <p className="text-xs text-ink-placeholder">
                Permission requise: admin:org:write
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {billing?.plan ? null : (
        <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-ink-tertiary">
          <CreditCard className="h-3.5 w-3.5" />
          Donnees billing incompletes pour cette organisation.
        </p>
      )}
    </div>
  );
}
