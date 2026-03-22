"use client";

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
import { Activity, Gauge, Radar, Timer } from "lucide-react";

interface ScenarioItem {
  id: string;
  name: string;
  type: string;
  status: string;
  createdAt: string;
}

interface MlMonitoringSummary {
  modelVersion: string;
  mape: number;
  mae: number;
  driftScore: number;
  status: "healthy" | "watch" | "degraded";
  lastTrainingAt: string;
}

interface MlDriftPoint {
  id: string;
  feature: string;
  driftScore: number;
  pValue: number;
  detectedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "text-success",
  running: "text-primary",
  pending: "text-ink-tertiary",
  failed: "text-danger",
};

const DRIFT_COLUMNS: DataTableColumn<MlDriftPoint>[] = [
  { key: "feature", label: "Feature" },
  {
    key: "driftScore",
    label: "Drift",
    align: "right",
    render: (row) => `${(row.driftScore * 100).toFixed(1)}%`,
  },
  {
    key: "pValue",
    label: "p-value",
    align: "right",
    render: (row) => row.pValue.toFixed(4),
  },
  {
    key: "detectedAt",
    label: "Detecte le",
    render: (row) => new Date(row.detectedAt).toLocaleDateString("fr-FR"),
  },
];

type PrevisionsRetryHandlers = {
  summaryRefetch: () => void;
  driftRefetch: () => void;
  scenariosRefetch: () => void;
};

function buildScenarioColumns(): DataTableColumn<ScenarioItem>[] {
  return [
    {
      key: "name",
      label: "Nom",
      render: (row) => <span className="font-medium text-ink">{row.name}</span>,
    },
    { key: "type", label: "Type" },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span className={STATUS_COLORS[row.status] ?? "text-ink-tertiary"}>
          {row.status}
        </span>
      ),
    },
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
}

function renderForecastingUnavailableState() {
  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Previsions</h2>
      <ErrorFallback
        message={featureUnavailableMessage(
          "Le workspace previsions et ML monitoring",
        )}
      />
    </div>
  );
}

function renderPrevisionsErrorState(retryHandlers: PrevisionsRetryHandlers) {
  const { summaryRefetch, driftRefetch, scenariosRefetch } = retryHandlers;
  function handleRetry() {
    summaryRefetch();
    driftRefetch();
    scenariosRefetch();
  }

  return (
    <ErrorFallback
      message="Impossible de charger la supervision previsionnelle"
      onRetry={handleRetry}
    />
  );
}

function renderSummaryCards(
  summary: MlMonitoringSummary | null | undefined,
  summaryLoading: boolean,
) {
  if (summaryLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const mapeValue =
    typeof summary?.mape === "number" ? `${summary.mape.toFixed(1)}%` : "--";
  const driftScoreValue =
    typeof summary?.driftScore === "number"
      ? `${(summary.driftScore * 100).toFixed(1)}%`
      : "--";
  const lastTrainingValue = summary?.lastTrainingAt
    ? new Date(summary.lastTrainingAt).toLocaleDateString("fr-FR")
    : "--";
  const driftVariant = summary?.status === "degraded" ? "warning" : undefined;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Version modele"
        value={summary?.modelVersion ?? "--"}
        icon={<Activity className="h-4 w-4" />}
      />
      <StatCard
        label="MAPE"
        value={mapeValue}
        icon={<Gauge className="h-4 w-4" />}
      />
      <StatCard
        label="Drift global"
        value={driftScoreValue}
        icon={<Radar className="h-4 w-4" />}
        variant={driftVariant}
      />
      <StatCard
        label="Dernier entrainement"
        value={lastTrainingValue}
        icon={<Timer className="h-4 w-4" />}
      />
    </div>
  );
}

function renderDriftSection(
  driftLoading: boolean,
  driftError: string | null,
  driftRefetch: () => void,
  drift: MlDriftPoint[] | null | undefined,
) {
  let content = (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="p-0">
        <DataTable
          columns={DRIFT_COLUMNS}
          data={drift ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Aucune derive significative"
        />
      </CardContent>
    </Card>
  );

  if (driftLoading) {
    content = <SkeletonCard />;
  } else if (driftError) {
    content = <ErrorFallback message={driftError} onRetry={driftRefetch} />;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">
        Derive recente (drift)
      </h3>
      {content}
    </div>
  );
}

function renderScenariosSection(
  scenariosLoading: boolean,
  scenariosError: string | null,
  scenariosRefetch: () => void,
  scenarios: ScenarioItem[] | null | undefined,
  scenarioColumns: DataTableColumn<ScenarioItem>[],
) {
  let content = (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="p-0">
        <DataTable
          columns={scenarioColumns}
          data={scenarios ?? []}
          getRowKey={(row) => row.id}
        />
      </CardContent>
    </Card>
  );

  if (scenariosLoading) {
    content = <SkeletonCard />;
  } else if (scenariosError) {
    content = (
      <ErrorFallback message={scenariosError} onRetry={scenariosRefetch} />
    );
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-ink-secondary">Scenarios</h3>
      {content}
    </div>
  );
}

export default function PrevisionsPage() {
  const { orgId } = useClientContext();
  const forecastingEnabled = ADMIN_WORKSPACE_FEATURE_GATES.forecastingWorkspace;

  const {
    data: scenarios,
    loading: scenariosLoading,
    error: scenariosError,
    refetch: scenariosRefetch,
  } = useApiGet<ScenarioItem[]>(
    forecastingEnabled ? ADMIN_ENDPOINTS.orgScenarios(orgId) : null,
  );

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: summaryRefetch,
  } = useApiGet<MlMonitoringSummary>(
    forecastingEnabled ? ADMIN_ENDPOINTS.orgMlMonitoringSummary(orgId) : null,
  );

  const {
    data: drift,
    loading: driftLoading,
    error: driftError,
    refetch: driftRefetch,
  } = useApiGet<MlDriftPoint[]>(
    forecastingEnabled ? ADMIN_ENDPOINTS.orgMlMonitoringDrift(orgId) : null,
  );

  if (!forecastingEnabled) {
    return renderForecastingUnavailableState();
  }

  const scenarioColumns = buildScenarioColumns();

  if (summaryError && driftError && scenariosError) {
    return renderPrevisionsErrorState({
      summaryRefetch,
      driftRefetch,
      scenariosRefetch,
    });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Previsions</h2>
      {renderSummaryCards(summary, summaryLoading)}
      {renderDriftSection(driftLoading, driftError, driftRefetch, drift)}
      {renderScenariosSection(
        scenariosLoading,
        scenariosError,
        scenariosRefetch,
        scenarios,
        scenarioColumns,
      )}
    </div>
  );
}
