"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp } from "lucide-react";
import { DataTable, type DataTableColumn, StatusBadge } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface ForecastListItem {
  id: string;
  departmentName: string;
  siteName: string;
  dimension: string;
  riskLevel: string;
  demandTotal: number;
  capacityTotal: number;
  coverageRatio: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const RISK_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger"; label: string }
> = {
  low: { variant: "success", label: "Faible" },
  medium: { variant: "warning", label: "Moyen" },
  high: { variant: "danger", label: "Eleve" },
};

export default function OrgForecastsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } = useApiGetPaginated<ForecastListItem>(
    `/api/v1/admin/organizations/${encodeURIComponent(orgId)}/forecasts`,
    page,
    20,
  );

  const columns: DataTableColumn<ForecastListItem>[] = [
    {
      key: "siteName",
      label: "Site",
      render: (row) => (
        <span className="font-medium text-charcoal">{row.siteName}</span>
      ),
    },
    {
      key: "departmentName",
      label: "Departement",
    },
    {
      key: "dimension",
      label: "Dimension",
      render: (row) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {row.dimension}
        </span>
      ),
    },
    {
      key: "riskLevel",
      label: "Risque",
      render: (row) => {
        const mapping = RISK_VARIANTS[row.riskLevel] ?? {
          variant: "neutral" as const,
          label: row.riskLevel,
        };
        return <StatusBadge variant={mapping.variant} label={mapping.label} />;
      },
    },
    {
      key: "coverageRatio",
      label: "Couverture",
      align: "right",
      render: (row) => (
        <span className="text-sm font-medium text-charcoal">
          {(row.coverageRatio * 100).toFixed(0)}%
        </span>
      ),
    },
    {
      key: "startDate",
      label: "Periode",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.startDate).toLocaleDateString("fr-FR")} -{" "}
          {new Date(row.endDate).toLocaleDateString("fr-FR")}
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
          <TrendingUp className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Previsions</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} prevision{total !== 1 ? "s" : ""}
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
