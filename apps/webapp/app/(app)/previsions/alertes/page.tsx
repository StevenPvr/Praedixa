"use client";

import { useState } from "react";
import Link from "next/link";
import type { CoverageAlert } from "@praedixa/shared-types";
import { DataTable, SelectDropdown, Badge, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn, SelectOption } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const PAGE_SIZE = 15;

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "open", label: "Ouvertes" },
  { value: "acknowledged", label: "Acquittees" },
  { value: "resolved", label: "Resolues" },
];

export default function AlertesPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const statusParam = statusFilter !== "all" ? `?status=${encodeURIComponent(statusFilter)}` : "";
  const url = `/api/v1/coverage-alerts${statusParam}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<CoverageAlert>(url, page, PAGE_SIZE);

  const columns: DataTableColumn<CoverageAlert>[] = [
    { key: "siteId", label: "Site" },
    { key: "alertDate", label: "Date" },
    { key: "shift", label: "Shift" },
    { key: "horizon", label: "Horizon" },
    {
      key: "severity",
      label: "Severite",
      render: (row) => (
        <Badge variant={
          row.severity === "critical" ? "destructive" :
          row.severity === "high" ? "destructive" :
          row.severity === "medium" ? "default" : "secondary"
        }>
          {row.severity}
        </Badge>
      ),
    },
    { key: "status", label: "Statut" },
    {
      key: "pRupture",
      label: "P(rupture)",
      align: "right",
      render: (row) => `${(row.pRupture * 100).toFixed(0)}%`,
    },
    { key: "gapH", label: "Gap (h)", align: "right" },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/previsions/alertes/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Alertes de couverture
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Toutes les alertes de couverture
        </p>
      </div>

      <SelectDropdown
        label="Statut"
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={(v) => { setStatusFilter(v); setPage(1); }}
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
          emptyMessage="Aucune alerte trouvee"
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
