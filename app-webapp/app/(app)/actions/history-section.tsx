"use client";

import type { DecisionSummary } from "@praedixa/shared-types";
import { DataTable, type DataTableColumn } from "@praedixa/ui";

interface ActionsHistorySectionProps {
  historyRows: DecisionSummary[];
  historyTotal: number;
  historyLoading: boolean;
  historyError: string | null;
  historyPage: number;
  setHistoryPage: (page: number) => void;
}

function statusLabel(value: string): string {
  switch (value) {
    case "pending_review":
      return "En revue";
    case "approved":
      return "Approuvee";
    case "implemented":
      return "Implantee";
    case "rejected":
      return "Rejetee";
    case "expired":
      return "Expiree";
    default:
      return value;
  }
}

function formatPeriod(row: DecisionSummary): string {
  const start = row.targetPeriod?.startDate;
  const end = row.targetPeriod?.endDate;
  if (!start || !end) {
    return "--";
  }
  return `${start} → ${end}`;
}

const HISTORY_COLUMNS: DataTableColumn<DecisionSummary>[] = [
  { key: "title", label: "Decision" },
  {
    key: "status",
    label: "Statut",
    render: (row) => statusLabel(row.status),
  },
  {
    key: "priority",
    label: "Priorite",
    render: (row) => row.priority,
  },
  {
    key: "confidenceScore",
    label: "Confiance",
    align: "right",
    render: (row) => `${Math.round(row.confidenceScore)}%`,
  },
  {
    key: "targetPeriod",
    label: "Periode",
    render: (row) => formatPeriod(row),
  },
];

export function ActionsHistorySection({
  historyRows,
  historyTotal,
  historyLoading,
  historyError,
  historyPage,
  setHistoryPage,
}: ActionsHistorySectionProps) {
  return (
    <section className="space-y-4">
      {historyError ? (
        <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
          {historyError}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3">
        <DataTable<DecisionSummary>
          columns={HISTORY_COLUMNS}
          data={historyRows}
          getRowKey={(row) => row.id}
          emptyMessage={historyLoading ? "Chargement..." : "Aucune decision"}
          pagination={{
            page: historyPage,
            pageSize: 20,
            total: historyTotal,
            onPageChange: setHistoryPage,
          }}
        />
      </div>
    </section>
  );
}
