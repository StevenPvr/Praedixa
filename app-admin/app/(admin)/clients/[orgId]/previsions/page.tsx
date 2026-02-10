"use client";

import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";

interface ScenarioItem {
  id: string;
  name: string;
  type: string;
  status: string;
  parameters?: Record<string, unknown>;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "text-green-600",
  running: "text-amber-500",
  pending: "text-neutral-500",
  failed: "text-red-500",
};

export default function PrevisionsPage() {
  const { orgId } = useClientContext();

  const {
    data: scenarios,
    loading: scenariosLoading,
    error: scenariosError,
    refetch: scenariosRefetch,
  } = useApiGet<ScenarioItem[]>(ADMIN_ENDPOINTS.orgScenarios(orgId));

  const scenarioColumns: DataTableColumn<ScenarioItem>[] = [
    {
      key: "name",
      label: "Nom",
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.name}</span>
      ),
    },
    { key: "type", label: "Type" },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span className={STATUS_COLORS[row.status] ?? "text-neutral-500"}>
          {row.status}
        </span>
      ),
    },
    {
      key: "parameters",
      label: "Parametres",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {row.parameters ? Object.keys(row.parameters).length : 0} param.
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Cree le",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-neutral-900">
        Previsions
      </h2>

      {/* Scenarios */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">Scenarios</h3>
        {scenariosLoading ? (
          <SkeletonCard />
        ) : scenariosError ? (
          <ErrorFallback message={scenariosError} onRetry={scenariosRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={scenarioColumns}
                data={scenarios ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
