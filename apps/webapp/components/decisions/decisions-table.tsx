"use client";

import { DataTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import type { DecisionSummary } from "@praedixa/shared-types";
import { DecisionStatusBadge } from "./decision-status-badge";
import { typeLabel } from "./decision-type-label";

/* ────────────────────────────────────────────── */
/*  EUR formatter (static — avoid re-creation)     */
/* ────────────────────────────────────────────── */

const eurFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/* ────────────────────────────────────────────── */
/*  Column definitions                             */
/* ────────────────────────────────────────────── */

const columns: DataTableColumn<DecisionSummary>[] = [
  {
    key: "title",
    label: "Titre",
    sortable: true,
    render: (row) => (
      <span className="text-sm font-medium text-charcoal">{row.title}</span>
    ),
  },
  {
    key: "departmentName",
    label: "Departement",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-600">
        {/* v8 ignore next */}
        {row.departmentName ?? "-"}
      </span>
    ),
  },
  {
    key: "type",
    label: "Type",
    sortable: true,
    render: (row) => (
      <span className="text-sm text-gray-600">{typeLabel[row.type]}</span>
    ),
  },
  {
    key: "estimatedCost",
    label: "Cout",
    sortable: true,
    render: (row) => (
      <span className="block text-right text-sm tabular-nums text-gray-600">
        {row.estimatedCost != null ? eurFormat.format(row.estimatedCost) : "-"}
      </span>
    ),
  },
  {
    key: "status",
    label: "Statut",
    sortable: true,
    render: (row) => <DecisionStatusBadge status={row.status} />,
  },
  {
    key: "confidenceScore",
    label: "Confiance",
    sortable: true,
    render: (row) => (
      <span className="text-sm tabular-nums text-gray-600">
        {row.confidenceScore}%
      </span>
    ),
  },
];

/* ────────────────────────────────────────────── */
/*  Component                                      */
/* ────────────────────────────────────────────── */

interface DecisionsTableProps {
  data: DecisionSummary[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DecisionsTable({
  data,
  total,
  page,
  pageSize,
  onPageChange,
}: DecisionsTableProps) {
  return (
    <DataTable<DecisionSummary>
      columns={columns}
      data={data}
      pagination={{
        page,
        pageSize,
        total,
        onPageChange,
      }}
    />
  );
}
