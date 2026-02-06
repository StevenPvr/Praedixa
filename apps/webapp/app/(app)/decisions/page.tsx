"use client";

import { useState } from "react";
import { SkeletonTable } from "@praedixa/ui";
import type { DecisionSummary, DecisionStatus } from "@praedixa/shared-types";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { DecisionStatusFilter } from "@/components/decisions/decision-status-filter";
import { DecisionsTable } from "@/components/decisions/decisions-table";

const PAGE_SIZE = 10;

export default function DecisionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "all">(
    "all",
  );

  const statusParam =
    statusFilter !== "all"
      ? `&statuses=${encodeURIComponent(statusFilter)}`
      : "";
  const url = `/api/v1/decisions?${statusParam}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<DecisionSummary>(url, page, PAGE_SIZE);

  const handleStatusChange = (status: DecisionStatus | "all") => {
    setStatusFilter(status);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Decisions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Suivi et audit trail des decisions operationnelles
        </p>
      </div>

      <DecisionStatusFilter
        value={statusFilter}
        onChange={handleStatusChange}
      />

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : data.length === 0 ? (
        <ErrorFallback
          variant="empty"
          message="Aucune decision pour les filtres selectionnes."
        />
      ) : (
        <DecisionsTable
          data={data}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
