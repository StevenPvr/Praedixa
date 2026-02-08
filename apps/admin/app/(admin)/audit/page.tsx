"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { SeverityBadge } from "@/components/severity-badge";

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  targetOrgId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestId: string;
  metadataJson: Record<string, unknown>;
  severity: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  view_org: "Consultation organisation",
  create_org: "Creation organisation",
  update_org: "Modification organisation",
  suspend_org: "Suspension organisation",
  reactivate_org: "Reactivation organisation",
  churn_org: "Churn organisation",
  view_users: "Consultation utilisateurs",
  invite_user: "Invitation utilisateur",
  change_role: "Changement role",
  suspend_user: "Suspension utilisateur",
  change_plan: "Changement plan",
  view_monitoring: "Consultation monitoring",
  view_mirror: "Consultation miroir",
  view_audit: "Consultation audit",
  start_onboarding: "Demarrage onboarding",
  complete_step: "Etape completee",
};

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");

  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  const queryString = params.toString();
  const baseUrl = `${ADMIN_ENDPOINTS.auditLog}${queryString ? `?${queryString}` : ""}`;

  const { data, total, error, refetch } = useApiGetPaginated<AuditLogEntry>(
    baseUrl,
    page,
    30,
  );

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: "createdAt",
      label: "Date",
      render: (row) => (
        <span className="text-sm text-gray-500">
          {new Date(row.createdAt).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (row) => (
        <span className="font-medium text-charcoal">
          {ACTION_LABELS[row.action] ?? row.action}
        </span>
      ),
    },
    {
      key: "severity",
      label: "Severite",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "resourceType",
      label: "Ressource",
      render: (row) =>
        row.resourceType ? (
          <span className="text-sm text-gray-500">{row.resourceType}</span>
        ) : (
          <span className="text-sm text-gray-300">-</span>
        ),
    },
    {
      key: "ipAddress",
      label: "IP",
      render: (row) => (
        <span className="font-mono text-xs text-gray-400">{row.ipAddress}</span>
      ),
    },
    {
      key: "requestId",
      label: "Request ID",
      render: (row) => (
        <span className="font-mono text-xs text-gray-400">
          {row.requestId.substring(0, 8)}...
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Journal d&apos;audit
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Historique de toutes les actions administratives ({total} entrees)
        </p>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
            pageSize: 30,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
