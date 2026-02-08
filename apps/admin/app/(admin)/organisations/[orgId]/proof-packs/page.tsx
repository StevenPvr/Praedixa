"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileCheck } from "lucide-react";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface ProofRecord {
  id: string;
  month: string;
  siteId: string | null;
  departmentId: string | null;
  scenarioOptionId: string | null;
  gainGrossEur: number;
  costEur: number;
  gainNetEur: number;
  adoptedByUser: boolean;
  adoptionDate: string | null;
  createdAt: string;
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OrgProofPacksPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } = useApiGetPaginated<ProofRecord>(
    ADMIN_ENDPOINTS.orgProofPacks(orgId),
    page,
    20,
  );

  const columns: DataTableColumn<ProofRecord>[] = [
    {
      key: "month",
      label: "Mois",
      render: (row) => (
        <span className="font-medium text-charcoal">{row.month}</span>
      ),
    },
    {
      key: "gainGrossEur",
      label: "Gain brut",
      align: "right",
      render: (row) => (
        <span className="text-sm text-charcoal">
          {formatEur(row.gainGrossEur)}
        </span>
      ),
    },
    {
      key: "costEur",
      label: "Cout",
      align: "right",
      render: (row) => (
        <span className="text-sm text-gray-500">{formatEur(row.costEur)}</span>
      ),
    },
    {
      key: "gainNetEur",
      label: "Gain net",
      align: "right",
      render: (row) => (
        <span className="text-sm font-medium text-charcoal">
          {formatEur(row.gainNetEur)}
        </span>
      ),
    },
    {
      key: "adoptedByUser",
      label: "Adopte",
      render: (row) => (
        <span
          className={`text-sm font-medium ${row.adoptedByUser ? "text-green-600" : "text-gray-400"}`}
        >
          {row.adoptedByUser ? "Oui" : "Non"}
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
          <FileCheck className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">Proof Packs</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} proof record{total !== 1 ? "s" : ""}
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
