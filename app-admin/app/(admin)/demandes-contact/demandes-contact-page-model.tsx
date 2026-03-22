"use client";

import { useMemo, useState } from "react";
import type { DataTableColumn } from "@praedixa/ui";

import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiError, apiPatch } from "@/lib/api/client";
import { getValidAccessToken, useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { buildCsvDocument } from "@/lib/security/csv";
import { buildMailtoHref } from "@/lib/security/navigation";
import { StatusBadge } from "@/components/ui/status-badge";

export type ContactRequestStatus = "new" | "in_progress" | "closed";
export type ContactRequestType =
  | "founding_pilot"
  | "product_demo"
  | "partnership"
  | "press_other";

export interface ContactRequestRow {
  id: string;
  createdAt: string;
  updatedAt: string;
  locale: "fr" | "en";
  requestType: ContactRequestType;
  companyName: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: ContactRequestStatus;
  consent: boolean;
  metadataJson: Record<string, unknown>;
}

export const CONTACT_REQUESTS_PAGE_SIZE = 20;

export const STATUS_OPTIONS: Array<{
  value: "" | ContactRequestStatus;
  label: string;
}> = [
  { value: "", label: "Tous les statuts" },
  { value: "new", label: "Nouveau" },
  { value: "in_progress", label: "En cours" },
  { value: "closed", label: "Cloture" },
];

export const TYPE_OPTIONS: Array<{
  value: "" | ContactRequestType;
  label: string;
}> = [
  { value: "", label: "Tous les types" },
  { value: "founding_pilot", label: "Pilote fondateur" },
  { value: "product_demo", label: "Demo produit" },
  { value: "partnership", label: "Partenariat" },
  { value: "press_other", label: "Presse / Autre" },
];

const STATUS_LABELS: Record<ContactRequestStatus, string> = {
  new: "Nouveau",
  in_progress: "En cours",
  closed: "Cloture",
};

const TYPE_LABELS: Record<ContactRequestType, string> = {
  founding_pilot: "Pilote fondateur",
  product_demo: "Demo produit",
  partnership: "Partenariat",
  press_other: "Presse / Autre",
};

function statusVariant(
  status: ContactRequestStatus,
): "info" | "warning" | "success" {
  if (status === "new") {
    return "info";
  }
  if (status === "in_progress") {
    return "warning";
  }
  return "success";
}

function buildContactRequestsUrl(args: {
  search: string;
  statusFilter: "" | ContactRequestStatus;
  typeFilter: "" | ContactRequestType;
}) {
  const params = new URLSearchParams();
  if (args.search.trim()) {
    params.set("search", args.search.trim());
  }
  if (args.statusFilter) {
    params.set("status", args.statusFilter);
  }
  if (args.typeFilter) {
    params.set("request_type", args.typeFilter);
  }

  const queryString = params.toString();
  const querySuffix = queryString ? `?` + queryString : "";
  return ADMIN_ENDPOINTS.contactRequests + querySuffix;
}

function exportContactRequests(rows: ContactRequestRow[]) {
  if (rows.length === 0) {
    return;
  }

  const csv = buildCsvDocument(
    [
      "id",
      "created_at",
      "type",
      "status",
      "company",
      "first_name",
      "last_name",
      "email",
      "phone",
      "subject",
    ],
    rows.map((row) => [
      row.id,
      row.createdAt,
      row.requestType,
      row.status,
      row.companyName,
      row.firstName,
      row.lastName,
      row.email,
      row.phone,
      row.subject,
    ]),
  );

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "demandes-contact-selection.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

type CreateColumnsArgs = {
  canManageSupport: boolean;
  updatingId: string | null;
  onStatusChange: (requestId: string, status: ContactRequestStatus) => void;
};

export function createContactRequestColumns({
  canManageSupport,
  updatingId,
  onStatusChange,
}: CreateColumnsArgs): DataTableColumn<ContactRequestRow>[] {
  return [
    {
      key: "createdAt",
      label: "Date",
      render: (row) => (
        <span className="text-sm text-ink-tertiary">
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
      key: "requestType",
      label: "Type",
      render: (row) => (
        <span className="text-sm font-medium text-charcoal">
          {TYPE_LABELS[row.requestType]}
        </span>
      ),
    },
    {
      key: "companyName",
      label: "Entreprise",
      render: (row) => (
        <div>
          <p className="font-medium text-charcoal">{row.companyName}</p>
          <p className="text-xs text-ink-placeholder">
            {row.firstName} {row.lastName}
          </p>
        </div>
      ),
    },
    {
      key: "subject",
      label: "Sujet",
      render: (row) => (
        <div className="max-w-[360px]">
          <p className="truncate text-sm text-charcoal">{row.subject}</p>
          <p className="truncate text-xs text-ink-placeholder">{row.message}</p>
        </div>
      ),
    },
    {
      key: "email",
      label: "Contact",
      render: (row) => {
        const mailtoHref = buildMailtoHref(row.email);
        return (
          <div>
            {mailtoHref ? (
              <a
                href={mailtoHref}
                className="text-sm font-medium text-primary hover:underline"
              >
                {row.email}
              </a>
            ) : (
              <span className="text-sm font-medium text-primary">
                {row.email}
              </span>
            )}
            <p className="text-xs text-ink-placeholder">{row.phone || "-"}</p>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => (
        <StatusBadge
          size="sm"
          variant={statusVariant(row.status)}
          label={STATUS_LABELS[row.status]}
        />
      ),
    },
    {
      key: "actions",
      label: "Action",
      render: (row) => (
        <select
          value={row.status}
          disabled={!canManageSupport || updatingId === row.id}
          onChange={(event) => {
            const nextStatus = event.target.value as ContactRequestStatus;
            if (nextStatus !== row.status) {
              onStatusChange(row.id, nextStatus);
            }
          }}
          className="min-h-[36px] rounded-lg border border-border px-2 py-1 text-xs text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="new">Nouveau</option>
          <option value="in_progress">En cours</option>
          <option value="closed">Cloture</option>
        </select>
      ),
    },
  ];
}

export function useDemandesContactPageModel() {
  const currentUser = useCurrentUser();
  const canManageSupport = hasAnyPermission(currentUser?.permissions, [
    "admin:support:write",
  ]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | ContactRequestStatus>(
    "",
  );
  const [typeFilter, setTypeFilter] = useState<"" | ContactRequestType>("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<ContactRequestRow>(
      buildContactRequestsUrl({ search, statusFilter, typeFilter }),
      page,
      CONTACT_REQUESTS_PAGE_SIZE,
    );

  async function handleStatusChange(
    requestId: string,
    status: ContactRequestStatus,
  ) {
    if (!canManageSupport) {
      setUpdateError("Permission requise: admin:support:write");
      return;
    }

    setUpdateError(null);
    setUpdatingId(requestId);

    try {
      await apiPatch<ContactRequestRow>(
        ADMIN_ENDPOINTS.contactRequestStatus(requestId),
        { status },
        getValidAccessToken,
      );
      refetch();
    } catch (error) {
      setUpdateError(
        error instanceof ApiError
          ? error.message
          : "Une erreur inattendue est survenue",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function handleExportSelection() {
    const selectedIds = new Set(Array.from(selectedKeys).map(String));
    exportContactRequests(data.filter((row) => selectedIds.has(row.id)));
  }

  const columns = useMemo(
    () =>
      createContactRequestColumns({
        canManageSupport,
        updatingId,
        onStatusChange: (requestId, status) => {
          handleStatusChange(requestId, status).catch(() => undefined);
        },
      }),
    [canManageSupport, updatingId],
  );

  return {
    canManageSupport,
    page,
    setPage,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    selectedKeys,
    setSelectedKeys,
    updateError,
    loading,
    error,
    data,
    total,
    refetch,
    columns,
    handleExportSelection,
  };
}
