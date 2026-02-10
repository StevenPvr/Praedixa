"use client";

import { useClientContext } from "../client-context";
import { useApiGet } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import {
  Card,
  CardContent,
  DataTable,
  SkeletonCard,
  type DataTableColumn,
} from "@praedixa/ui";
import { ErrorFallback } from "@/components/error-fallback";

interface CostParam {
  id: string;
  category: string;
  value: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  siteName?: string;
}

interface ProofPack {
  id: string;
  name: string;
  status: string;
  generatedAt?: string;
  downloadUrl?: string;
}

export default function ConfigPage() {
  const { orgId, selectedSiteId } = useClientContext();

  const costUrl = selectedSiteId
    ? `${ADMIN_ENDPOINTS.orgCostParams(orgId)}?site_id=${selectedSiteId}`
    : ADMIN_ENDPOINTS.orgCostParams(orgId);

  const {
    data: costParams,
    loading: costLoading,
    error: costError,
    refetch: costRefetch,
  } = useApiGet<CostParam[]>(costUrl);

  const {
    data: proofPacks,
    loading: proofLoading,
    error: proofError,
    refetch: proofRefetch,
  } = useApiGet<ProofPack[]>(ADMIN_ENDPOINTS.orgProofPacks(orgId));

  const costColumns: DataTableColumn<CostParam>[] = [
    {
      key: "category",
      label: "Categorie",
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.category}</span>
      ),
    },
    {
      key: "value",
      label: "Valeur",
      align: "right",
      render: (row) => <span>{row.value}</span>,
    },
    {
      key: "effectiveFrom",
      label: "Debut",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {new Date(row.effectiveFrom).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "effectiveUntil",
      label: "Fin",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {row.effectiveUntil
            ? new Date(row.effectiveUntil).toLocaleDateString("fr-FR")
            : "-"}
        </span>
      ),
    },
    {
      key: "siteName",
      label: "Site",
      render: (row) => <span>{row.siteName ?? "-"}</span>,
    },
  ];

  const proofColumns: DataTableColumn<ProofPack>[] = [
    {
      key: "name",
      label: "Nom",
      render: (row) => (
        <span className="font-medium text-neutral-900">{row.name}</span>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <span
          className={
            row.status === "generated"
              ? "text-green-600"
              : row.status === "pending"
                ? "text-amber-500"
                : "text-neutral-500"
          }
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "generatedAt",
      label: "Genere le",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {row.generatedAt
            ? new Date(row.generatedAt).toLocaleDateString("fr-FR")
            : "-"}
        </span>
      ),
    },
    {
      key: "downloadUrl",
      label: "Telecharger",
      render: (row) =>
        row.downloadUrl ? (
          <a
            href={row.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-600 hover:text-amber-700"
          >
            PDF
          </a>
        ) : (
          <span className="text-xs text-neutral-400">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-lg font-semibold text-neutral-900">
        Configuration
      </h2>

      {/* Cost Parameters */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
          Parametres de cout
        </h3>
        {costLoading ? (
          <SkeletonCard />
        ) : costError ? (
          <ErrorFallback message={costError} onRetry={costRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={costColumns}
                data={costParams ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Proof Packs */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-neutral-700">
          Packs de preuves
        </h3>
        {proofLoading ? (
          <SkeletonCard />
        ) : proofError ? (
          <ErrorFallback message={proofError} onRetry={proofRefetch} />
        ) : (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="p-0">
              <DataTable
                columns={proofColumns}
                data={proofPacks ?? []}
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
