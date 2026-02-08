"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Database, BarChart3 } from "lucide-react";
import { DataTable, type DataTableColumn, StatCard, SkeletonCard } from "@praedixa/ui";
import { useApiGet, useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface CanonicalRecord {
  id: string;
  employeeRef: string;
  siteId: string;
  departmentId: string;
  periodStart: string;
  periodEnd: string;
  contractType: string;
  fte: number;
  createdAt: string;
}

interface QualityDashboard {
  totalRecords: number;
  completenessScore: number;
  duplicateCount: number;
  outlierCount: number;
  lastUpdated: string | null;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function OrgCanonicalPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data: quality, loading: qualityLoading, error: qualityError } =
    useApiGet<QualityDashboard>(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId));

  const { data: records, total, error: recordsError, refetch } =
    useApiGetPaginated<CanonicalRecord>(
      ADMIN_ENDPOINTS.orgCanonical(orgId),
      page,
      20,
    );

  const columns: DataTableColumn<CanonicalRecord>[] = [
    {
      key: "employeeRef",
      label: "Ref. employe",
      render: (row) => (
        <span className="font-mono text-xs text-gray-600">
          {row.employeeRef}
        </span>
      ),
    },
    {
      key: "contractType",
      label: "Contrat",
      render: (row) => (
        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 uppercase">
          {row.contractType}
        </span>
      ),
    },
    {
      key: "fte",
      label: "ETP",
      align: "right",
      render: (row) => (
        <span className="text-sm text-charcoal">{row.fte.toFixed(2)}</span>
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
          <Database className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Donnees canoniques
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} enregistrement{total !== 1 ? "s" : ""} canoniques
        </p>
      </div>

      {/* Quality dashboard */}
      {qualityError ? (
        <ErrorFallback message={qualityError} />
      ) : qualityLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={`qual-skel-${i}`} />
          ))}
        </div>
      ) : quality ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total records"
            value={String(quality.totalRecords)}
            icon={<Database className="h-5 w-5" />}
          />
          <StatCard
            label="Completude"
            value={formatPercent(quality.completenessScore)}
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <StatCard
            label="Doublons"
            value={String(quality.duplicateCount)}
            icon={<Database className="h-5 w-5" />}
          />
          <StatCard
            label="Outliers"
            value={String(quality.outlierCount)}
            icon={<BarChart3 className="h-5 w-5" />}
          />
        </div>
      ) : null}

      {/* Records table */}
      {recordsError ? (
        <ErrorFallback message={recordsError} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={records}
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
