"use client";

import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import { DataTable, Badge, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

export default function ArbitragePage() {
  const {
    data: alerts,
    loading,
    error,
    refetch,
  } = useApiGet<CoverageAlert[]>("/api/v1/coverage-alerts?status=open");

  const columns: DataTableColumn<CoverageAlert>[] = [
    { key: "siteId", label: "Site" },
    { key: "alertDate", label: "Date" },
    { key: "shift", label: "Shift" },
    { key: "horizon", label: "Horizon" },
    {
      key: "severity",
      label: "Severite",
      render: (row) => (
        <Badge
          variant={
            row.severity === "critical"
              ? "destructive"
              : row.severity === "high"
                ? "destructive"
                : row.severity === "medium"
                  ? "default"
                  : "secondary"
          }
        >
          {row.severity}
        </Badge>
      ),
    },
    {
      key: "gapH",
      label: "Gap (h)",
      align: "right",
    },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/arbitrage/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Arbitrer
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Arbitrage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Scenarios d&apos;arbitrage pour les alertes de couverture ouvertes
        </p>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : (
        <DataTable<CoverageAlert>
          columns={columns}
          data={alerts ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Aucune alerte ouverte a arbitrer"
        />
      )}
    </div>
  );
}
