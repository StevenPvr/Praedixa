"use client";

import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  StatCard,
  DataTable,
  type DataTableColumn,
  Button,
} from "@praedixa/ui";
import { PlanBadge } from "@/components/plan-badge";
import { OrgStatusBadge } from "@/components/org-status-badge";
import { TestClientDeletionCard } from "./test-client-deletion-card";
import type {
  AlertItem,
  BillingData,
  MirrorData,
  OrgDetail,
  ScenarioItem,
} from "./use-client-dashboard-page-model";
import type { TestClientDeletionFormState } from "./test-client-deletion-card";
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

type DashboardHeaderProps = {
  org: OrgDetail;
};

type OrganizationOverviewCardProps = {
  org: OrgDetail;
};

type MirrorStatsProps = {
  mirror: MirrorData | undefined;
};

type DashboardTablesProps = {
  topAlerts: AlertItem[];
  topScenarios: ScenarioItem[];
};

type BillingCardProps = {
  billing: BillingData | undefined;
};

type AdminActionsCardProps = {
  orgId: string;
  orgStatus: OrgDetail["status"];
  canManageLifecycle: boolean;
  suspendLoading: boolean;
  reactivateLoading: boolean;
  handleSuspend: () => void;
  handleReactivate: () => void;
};

type DashboardBottomSectionProps = {
  orgId: string;
  org: OrgDetail;
  billing: BillingData | undefined;
  canManageLifecycle: boolean;
  suspendLoading: boolean;
  reactivateLoading: boolean;
  handleSuspend: () => void;
  handleReactivate: () => void;
};

type DashboardDeletionSectionProps = {
  org: OrgDetail;
  canDeleteTestClient: boolean;
  deleteForm: TestClientDeletionFormState;
  setDeleteForm: (next: TestClientDeletionFormState) => void;
  deleteLoading: boolean;
  handleDeleteOrganization: () => void;
};

export function DashboardHeader(props: Readonly<DashboardHeaderProps>) {
  const { org } = props;
  return (
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
  );
}

export function OrganizationOverviewCard(
  props: Readonly<OrganizationOverviewCardProps>,
) {
  const { org } = props;
  return (
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
          {org.isTest ? (
            <p className="text-xs font-medium text-amber-700">Client test</p>
          ) : null}
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
  );
}

export function MirrorStats(props: Readonly<MirrorStatsProps>) {
  const { mirror } = props;
  const alertsVariant =
    mirror?.activeAlerts != null && mirror.activeAlerts > 0
      ? "warning"
      : undefined;
  const forecastAccuracyValue = mirror?.forecastAccuracy;
  const hasForecastAccuracy = forecastAccuracyValue != null;
  const forecastAccuracy = hasForecastAccuracy
    ? `${Math.round(forecastAccuracyValue * 100)}%`
    : "-";

  return (
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
        variant={alertsVariant}
      />
      <StatCard
        label="Precision prevision"
        value={forecastAccuracy}
        icon={<ArrowUpRight className="h-4 w-4" />}
      />
    </div>
  );
}

export function DashboardTables(props: Readonly<DashboardTablesProps>) {
  const { topAlerts, topScenarios } = props;
  return (
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
  );
}

function BillingCard(props: Readonly<BillingCardProps>) {
  const { billing } = props;
  const monthlyAmountValue = billing?.monthlyAmount;
  const hasMonthlyAmount = monthlyAmountValue != null;
  const monthlyAmount = hasMonthlyAmount ? `${monthlyAmountValue} EUR` : "-";
  const nextBillingDate = billing?.nextBillingDate
    ? new Date(billing.nextBillingDate).toLocaleDateString("fr-FR")
    : "-";

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-2 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">Facturation</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-sm text-ink-tertiary">
            <span className="text-ink">Plan:</span>
            <span> {billing?.plan ?? "-"}</span>
          </p>
          <p className="text-sm text-ink-tertiary">
            <span className="text-ink">Cycle:</span>
            <span> {billing?.billingCycle ?? "-"}</span>
          </p>
          <p className="text-sm text-ink-tertiary">
            <span className="text-ink">Montant:</span>
            <span> {monthlyAmount}</span>
          </p>
          <p className="text-sm text-ink-tertiary">
            <span className="text-ink">Prochaine echeance:</span>
            <span> {nextBillingDate}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminActionsCard(props: Readonly<AdminActionsCardProps>) {
  const {
    orgId,
    orgStatus,
    canManageLifecycle,
    suspendLoading,
    reactivateLoading,
    handleSuspend,
    handleReactivate,
  } = props;
  const canSuspend = canManageLifecycle && suspendLoading === false;
  const canReactivate = canManageLifecycle && reactivateLoading === false;
  const lifecyclePermissionNotice =
    canManageLifecycle === false ? (
      <p className="text-xs text-ink-placeholder">
        Permission requise: admin:org:write
      </p>
    ) : null;

  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-3 p-5">
        <h3 className="text-sm font-medium text-ink-secondary">
          Actions admin
        </h3>
        <div className="flex flex-wrap gap-2">
          {orgStatus === "active" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuspend}
              disabled={canSuspend === false}
            >
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              Suspendre
            </Button>
          ) : null}
          {orgStatus === "suspended" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleReactivate}
              disabled={canReactivate === false}
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
        {lifecyclePermissionNotice}
      </CardContent>
    </Card>
  );
}

export function DashboardBottomSection(
  props: Readonly<DashboardBottomSectionProps>,
) {
  const {
    orgId,
    org,
    billing,
    canManageLifecycle,
    suspendLoading,
    reactivateLoading,
    handleSuspend,
    handleReactivate,
  } = props;
  const hasBillingPlan = Boolean(billing?.plan);
  const missingBillingNotice = hasBillingPlan ? null : (
    <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs text-ink-tertiary">
      <CreditCard className="h-3.5 w-3.5" />
      Donnees billing incompletes pour cette organisation.
    </p>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <BillingCard billing={billing} />
        <AdminActionsCard
          orgId={orgId}
          orgStatus={org.status}
          canManageLifecycle={canManageLifecycle}
          suspendLoading={suspendLoading}
          reactivateLoading={reactivateLoading}
          handleSuspend={handleSuspend}
          handleReactivate={handleReactivate}
        />
      </div>
      {missingBillingNotice}
    </div>
  );
}

export function DashboardDeletionSection(
  props: Readonly<DashboardDeletionSectionProps>,
) {
  const {
    org,
    canDeleteTestClient,
    deleteForm,
    setDeleteForm,
    deleteLoading,
    handleDeleteOrganization,
  } = props;
  if (!org.isTest) {
    return null;
  }

  const hasDeletionPermission = canDeleteTestClient;
  const confirmedTestDeletion = deleteForm.acknowledgeTestDeletion;
  const slugMatches =
    deleteForm.organizationSlug.trim().toLowerCase() === org.slug;
  const confirmationMatches =
    deleteForm.confirmationText.trim().toUpperCase() === "SUPPRIMER";
  const deletionDisabled =
    hasDeletionPermission === false ||
    confirmedTestDeletion === false ||
    slugMatches === false ||
    confirmationMatches === false;

  return (
    <TestClientDeletionCard
      organizationSlug={org.slug}
      form={deleteForm}
      loading={deleteLoading}
      disabled={deletionDisabled}
      onChange={setDeleteForm}
      onDelete={handleDeleteOrganization}
    />
  );
}
