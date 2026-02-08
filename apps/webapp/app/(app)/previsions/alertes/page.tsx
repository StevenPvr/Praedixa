"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import { DataTable, SelectDropdown, Badge, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn, SelectOption } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import {
  formatSeverity,
  formatHorizon,
  formatAlertStatus,
} from "@/lib/formatters";

const PAGE_SIZE = 15;

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "open", label: "En cours" },
  { value: "acknowledged", label: "Prises en compte" },
  { value: "resolved", label: "Resolues" },
];

export default function AlertesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const statusParam =
    statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
  const url = `/api/v1/coverage-alerts${statusParam}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<CoverageAlert>(url, page, PAGE_SIZE);

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
      key: "status",
      label: "Etat",
      render: (row) => formatAlertStatus(row.status),
    },
    {
      key: "pRupture",
      label: "Risque",
      align: "right",
      render: (row) => `${(row.pRupture * 100).toFixed(0)}%`,
    },
    { key: "gapH", label: "Heures manquantes", align: "right" },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/previsions/alertes/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Voir
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Toutes les alertes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Historique et suivi de toutes les alertes de sous-effectif detectees
        </p>
      </div>

      <SelectDropdown
        label="Statut"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
      />

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={9} />
      ) : (
        <DataTable<CoverageAlert>
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          emptyMessage="Aucune alerte ne correspond a ces criteres."
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
