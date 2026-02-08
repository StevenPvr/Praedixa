"use client";

import { useState } from "react";
import type { OperationalDecision } from "@praedixa/shared-types";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { formatHorizon } from "@/lib/formatters";

const PAGE_SIZE = 15;

export default function ArbitrageHistoriquePage() {
  const [page, setPage] = useState(1);

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<OperationalDecision>(
      "/api/v1/operational-decisions",
      page,
      PAGE_SIZE,
    );

  const columns: DataTableColumn<OperationalDecision>[] = [
    { key: "siteId", label: "Site" },
    { key: "decisionDate", label: "Date" },
    { key: "shift", label: "Poste" },
    {
      key: "horizon",
      label: "Echeance",
      render: (row) => formatHorizon(row.horizon),
    },
    {
      key: "isOverride",
      label: "Hors recommandation",
      render: (row) => (row.isOverride ? "Oui" : "Non"),
    },
    {
      key: "coutAttenduEur",
      label: "Cout prevu",
      align: "right",
      render: (row) =>
        row.coutAttenduEur != null
          ? `${row.coutAttenduEur.toLocaleString("fr-FR")} EUR`
          : "-",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Decisions passees
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Retrouvez toutes les solutions choisies pour vos alertes precedentes
        </p>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : (
        <DataTable<OperationalDecision>
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          emptyMessage="Aucune decision passee. Vos choix apparaitront ici apres le traitement de votre premiere alerte."
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
