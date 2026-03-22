"use client";

import { useMemo, type ReactNode } from "react";
import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  ADMIN_WORKSPACE_FEATURE_GATES,
  featureUnavailableMessage,
} from "@/lib/runtime/admin-workspace-feature-gates";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  StatCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Zap } from "lucide-react";

interface AlertItem {
  id: string;
  date: string;
  type: string;
  severity: string;
  status: string;
  siteName?: string;
  departmentName?: string;
}

interface ScenarioItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
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
  { key: "siteName", label: "Site" },
  { key: "departmentName", label: "Departement" },
  { key: "status", label: "Statut" },
];

const SCENARIO_COLUMNS: DataTableColumn<ScenarioItem>[] = [
  { key: "name", label: "Scenario" },
  { key: "type", label: "Type" },
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

export default function ActionsPage() {
  const { orgId, selectedSiteId } = useClientContext();
  const forecastingEnabled = ADMIN_WORKSPACE_FEATURE_GATES.forecastingWorkspace;

  const alertsUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgAlerts(orgId)}?site_id=${encodeURIComponent(selectedSiteId)}`
    : ADMIN_ENDPOINTS.orgAlerts(orgId);

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: alertsRefetch,
  } = useApiGet<AlertItem[]>(alertsUrl, { pollInterval: 30_000 });

  const {
    data: scenarios,
    loading: scenariosLoading,
    error: scenariosError,
    refetch: scenariosRefetch,
  } = useApiGet<ScenarioItem[]>(
    forecastingEnabled ? ADMIN_ENDPOINTS.orgScenarios(orgId) : null,
    {
      pollInterval: 30_000,
    },
  );

  const alertList = alerts ?? [];
  const scenarioList = scenarios ?? [];

  const pendingAlerts = useMemo(
    () => alertList.filter((item) => item.status !== "resolved"),
    [alertList],
  );
  const criticalAlerts = useMemo(
    () => alertList.filter((item) => item.severity === "CRITICAL"),
    [alertList],
  );
  const actionableScenarios = useMemo(
    () => scenarioList.filter((item) => item.status !== "completed"),
    [scenarioList],
  );
  let alertsContent: ReactNode;

  if (alertsLoading) {
    alertsContent = <SkeletonCard />;
  } else if (alertsError) {
    alertsContent = (
      <ErrorFallback message={alertsError} onRetry={alertsRefetch} />
    );
  } else {
    alertsContent = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <DataTable
            columns={ALERT_COLUMNS}
            data={pendingAlerts}
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    );
  }

  let scenariosContent: ReactNode;

  if (scenariosLoading) {
    scenariosContent = <SkeletonCard />;
  } else if (!forecastingEnabled) {
    scenariosContent = (
      <ErrorFallback
        message={featureUnavailableMessage("Les scenarios admin")}
      />
    );
  } else if (scenariosError) {
    scenariosContent = (
      <ErrorFallback message={scenariosError} onRetry={scenariosRefetch} />
    );
  } else {
    scenariosContent = (
      <Card className="rounded-2xl shadow-soft">
        <CardContent className="p-0">
          <DataTable
            columns={SCENARIO_COLUMNS}
            data={actionableScenarios}
            getRowKey={(row) => row.id}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-lg font-semibold text-ink">Actions</h2>
        <p className="text-sm text-ink-tertiary">
          Centre de traitement admin: priorisation des alertes et scenarios en
          attente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Alertes ouvertes"
          value={String(pendingAlerts.length)}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={pendingAlerts.length > 0 ? "warning" : undefined}
        />
        <StatCard
          label="Alertes critiques"
          value={String(criticalAlerts.length)}
          icon={<Zap className="h-4 w-4" />}
          variant={criticalAlerts.length > 0 ? "danger" : undefined}
        />
        <StatCard
          label="Scenarios actionnables"
          value={String(actionableScenarios.length)}
          icon={<ArrowRightLeft className="h-4 w-4" />}
        />
        <StatCard
          label="Scenarios completes"
          value={String(scenarioList.length - actionableScenarios.length)}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-secondary">
            File d'alertes
          </h3>
          {alertsContent}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-ink-secondary">
            Scenarios proposes
          </h3>
          {scenariosContent}
        </div>
      </div>
    </div>
  );
}
