"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { DataTable, type DataTableColumn, StatusBadge } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface ScenarioOption {
  id: string;
  optionType: string;
  siteId: string | null;
  departmentId: string | null;
  periodStart: string;
  periodEnd: string;
  costEur: number;
  benefitEur: number;
  isParetoOptimal: boolean;
  isRecommended: boolean;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  hs: "Heures supplementaires",
  interim: "Interim",
  realloc_intra: "Reallocation intra-site",
  realloc_inter: "Reallocation inter-site",
  service_adjust: "Ajustement de service",
  outsource: "Sous-traitance",
};

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrgScenariosPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } = useApiGetPaginated<ScenarioOption>(
    ADMIN_ENDPOINTS.orgScenarios(orgId),
    page,
    20,
  );

  const columns: DataTableColumn<ScenarioOption>[] = [
    {
      key: "optionType",
      label: "Type",
      render: (row) => (
        <span className="text-sm text-charcoal">
          {TYPE_LABELS[row.optionType] ?? row.optionType}
        </span>
      ),
    },
    {
      key: "costEur",
      label: "Cout",
      align: "right",
      render: (row) => (
        <span className="text-sm text-charcoal">{formatEur(row.costEur)}</span>
      ),
    },
    {
      key: "benefitEur",
      label: "Benefice",
      align: "right",
      render: (row) => (
        <span className="text-sm text-charcoal">
          {formatEur(row.benefitEur)}
        </span>
      ),
    },
    {
      key: "isParetoOptimal",
      label: "Pareto",
      render: (row) => (
        <StatusBadge
          variant={row.isParetoOptimal ? "success" : "neutral"}
          label={row.isParetoOptimal ? "Oui" : "Non"}
        />
      ),
    },
    {
      key: "isRecommended",
      label: "Recommande",
      render: (row) => (
        <StatusBadge
          variant={row.isRecommended ? "success" : "neutral"}
          label={row.isRecommended ? "Oui" : "Non"}
        />
      ),
    },
    {
      key: "periodStart",
      label: "Periode",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.periodStart).toLocaleDateString("fr-FR")} -{" "}
          {new Date(row.periodEnd).toLocaleDateString("fr-FR")}
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
          <Layers className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Scenarios</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} scenario{total !== 1 ? "s" : ""}
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
