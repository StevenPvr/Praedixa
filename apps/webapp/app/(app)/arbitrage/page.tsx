"use client";

import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import { DataTable, Badge, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { StatusBanner } from "@/components/status-banner";
import { formatSeverity, formatHorizon } from "@/lib/formatters";

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
    { key: "shift", label: "Poste" },
    {
      key: "horizon",
      label: "Echeance",
      render: (row) => formatHorizon(row.horizon),
    },
    {
      key: "severity",
      label: "Urgence",
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
          {formatSeverity(row.severity)}
        </Badge>
      ),
    },
    {
      key: "gapH",
      label: "Heures manquantes",
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
          Trouver une solution
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Alertes a traiter
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Choisissez une alerte et comparez les solutions disponibles
        </p>
      </div>

      {!loading && !error && (
        <StatusBanner
          variant={(alerts ?? []).length > 0 ? "warning" : "success"}
        >
          {(alerts ?? []).length > 0
            ? `${(alerts ?? []).length} alerte(s) en attente de votre decision`
            : "Toutes les alertes ont ete traitees"}
        </StatusBanner>
      )}

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={6} columns={7} />
      ) : (
        <DataTable<CoverageAlert>
          columns={columns}
          data={alerts ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Toutes les alertes ont ete traitees. Revenez quand de nouvelles alertes apparaitront."
        />
      )}
    </div>
  );
}
