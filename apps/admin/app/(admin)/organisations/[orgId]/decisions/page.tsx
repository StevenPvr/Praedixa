"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Scale } from "lucide-react";
import { DataTable, type DataTableColumn, StatusBadge } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface DecisionListItem {
  id: string;
  departmentName: string;
  type: string;
  status: string;
  description: string;
  createdAt: string;
  reviewedAt: string | null;
  implementedAt: string | null;
}

const STATUS_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger" | "neutral" | "info"; label: string }
> = {
  draft: { variant: "neutral", label: "Brouillon" },
  pending_review: { variant: "warning", label: "En attente" },
  approved: { variant: "success", label: "Approuve" },
  rejected: { variant: "danger", label: "Rejete" },
  implemented: { variant: "info", label: "Implemente" },
};

const TYPE_LABELS: Record<string, string> = {
  overtime: "Heures sup.",
  external: "Externe",
  redistribution: "Redistribution",
  no_action: "Pas d'action",
};

export default function OrgDecisionsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } =
    useApiGetPaginated<DecisionListItem>(
      `/api/v1/admin/organizations/${encodeURIComponent(orgId)}/decisions`,
      page,
      20,
    );

  const columns: DataTableColumn<DecisionListItem>[] = [
    {
      key: "departmentName",
      label: "Departement",
      render: (row) => (
        <span className="font-medium text-charcoal">
          {row.departmentName}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (row) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
          {TYPE_LABELS[row.type] ?? row.type}
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
      key: "description",
      label: "Description",
      render: (row) => (
        <span className="max-w-[200px] truncate text-sm text-gray-500">
          {row.description}
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
          className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-charcoal"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour a l&apos;organisation
        </button>

        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Decisions</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} decision{total !== 1 ? "s" : ""}
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
