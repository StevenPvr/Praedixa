"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, DollarSign } from "lucide-react";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface CostParameter {
  id: string;
  paramType: string;
  siteId: string | null;
  departmentId: string | null;
  value: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  overtime_hourly: "Cout horaire HS",
  interim_daily: "Cout journalier interim",
  realloc_cost: "Cout reallocation",
  outsource_unit: "Cout sous-traitance",
  penalty_understaffing: "Penalite sous-effectif",
  penalty_overstaffing: "Penalite sur-effectif",
};

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function OrgCostParamsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } =
    useApiGetPaginated<CostParameter>(
      ADMIN_ENDPOINTS.orgCostParams(orgId),
      page,
      20,
    );

  const columns: DataTableColumn<CostParameter>[] = [
    {
      key: "paramType",
      label: "Type",
      render: (row) => (
        <span className="text-sm text-charcoal">
          {TYPE_LABELS[row.paramType] ?? row.paramType}
        </span>
      ),
    },
    {
      key: "value",
      label: "Valeur",
      align: "right",
      render: (row) => (
        <span className="font-medium text-charcoal">
          {formatEur(row.value)}
        </span>
      ),
    },
    {
      key: "effectiveFrom",
      label: "Debut",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.effectiveFrom).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "effectiveTo",
      label: "Fin",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.effectiveTo
            ? new Date(row.effectiveTo).toLocaleDateString("fr-FR")
            : "En cours"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Cree le",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() =>
            router.push(`/organisations/${encodeURIComponent(orgId)}`)
          }
          className="mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm text-gray-500 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;organisation
        </button>

        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Parametres de cout
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} parametre{total !== 1 ? "s" : ""}
        </p>
      </div>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          pagination={{
            page,
            pageSize: 20,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
