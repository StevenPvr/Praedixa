"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Database } from "lucide-react";
import { DataTable, type DataTableColumn, StatusBadge } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface DatasetListItem {
  id: string;
  name: string;
  description: string | null;
  format: string;
  status: string;
  rowCount: number;
  columnCount: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  active: { variant: "success", label: "Actif" },
  processing: { variant: "warning", label: "En cours" },
  error: { variant: "danger", label: "Erreur" },
  draft: { variant: "neutral", label: "Brouillon" },
};

export default function OrgDatasetsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } = useApiGetPaginated<DatasetListItem>(
    `${ADMIN_ENDPOINTS.organization(orgId)}/datasets`,
    page,
    20,
  );

  const columns: DataTableColumn<DatasetListItem>[] = [
    {
      key: "name",
      label: "Nom",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-charcoal">{row.name}</p>
          {row.description && (
            <p className="text-xs text-gray-400">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "format",
      label: "Format",
      render: (row) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
          {row.format}
        </span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => {
        const mapping = STATUS_VARIANTS[row.status] ?? {
          variant: "neutral" as const,
          label: row.status,
        };
        return <StatusBadge variant={mapping.variant} label={mapping.label} />;
      },
    },
    {
      key: "rowCount",
      label: "Lignes",
      align: "right",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.rowCount.toLocaleString("fr-FR")}
        </span>
      ),
    },
    {
      key: "columnCount",
      label: "Colonnes",
      align: "right",
    },
    {
      key: "updatedAt",
      label: "Mis a jour",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.updatedAt).toLocaleDateString("fr-FR")}
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
          <Database className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Datasets</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} dataset{total !== 1 ? "s" : ""}
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
