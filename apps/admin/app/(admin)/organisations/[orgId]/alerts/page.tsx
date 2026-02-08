"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { DataTable, type DataTableColumn, StatusBadge } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";

interface CoverageAlert {
  id: string;
  alertType: string;
  severity: string;
  status: string;
  siteId: string | null;
  departmentId: string | null;
  message: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

const SEVERITY_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  low: { variant: "neutral", label: "Basse" },
  medium: { variant: "warning", label: "Moyenne" },
  high: { variant: "danger", label: "Haute" },
  critical: { variant: "danger", label: "Critique" },
};

const STATUS_VARIANTS: Record<
  string,
  { variant: "success" | "warning" | "danger" | "neutral"; label: string }
> = {
  open: { variant: "danger", label: "Ouverte" },
  acknowledged: { variant: "warning", label: "Prise en charge" },
  resolved: { variant: "success", label: "Resolue" },
  expired: { variant: "neutral", label: "Expiree" },
};

export default function OrgAlertsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const [page, setPage] = useState(1);

  const { data, total, error, refetch } = useApiGetPaginated<CoverageAlert>(
    ADMIN_ENDPOINTS.orgAlerts(orgId),
    page,
    20,
  );

  const columns: DataTableColumn<CoverageAlert>[] = [
    {
      key: "alertType",
      label: "Type",
      render: (row) => (
        <span className="text-sm font-medium text-charcoal">
          {row.alertType}
        </span>
      ),
    },
    {
      key: "severity",
      label: "Severite",
      render: (row) => {
        const mapping = SEVERITY_VARIANTS[row.severity] ?? {
          variant: "neutral" as const,
          label: row.severity,
        };
        return <StatusBadge variant={mapping.variant} label={mapping.label} />;
      },
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
      key: "message",
      label: "Message",
      render: (row) => (
        <span className="max-w-xs truncate text-sm text-gray-500">
          {row.message}
        </span>
      ),
    },
    {
      key: "triggeredAt",
      label: "Declenchee",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.triggeredAt).toLocaleDateString("fr-FR")}
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
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Alertes de couverture
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {total} alerte{total !== 1 ? "s" : ""}
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
