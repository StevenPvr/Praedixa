"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button, DataTable, type DataTableColumn } from "@praedixa/ui";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ErrorFallback } from "@/components/error-fallback";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ApiError, apiPatch } from "@/lib/api/client";
import { getValidAccessToken, useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { buildMailtoHref } from "@/lib/security/navigation";

type ContactRequestStatus = "new" | "in_progress" | "closed";
type ContactRequestType =
  | "founding_pilot"
  | "product_demo"
  | "partnership"
  | "press_other";

interface ContactRequestRow {
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

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{
  value: "" | ContactRequestStatus;
  label: string;
}> = [
  { value: "", label: "Tous les statuts" },
  { value: "new", label: "Nouveau" },
  { value: "in_progress", label: "En cours" },
  { value: "closed", label: "Cloture" },
];

const TYPE_OPTIONS: Array<{ value: "" | ContactRequestType; label: string }> = [
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
  if (status === "new") return "info";
  if (status === "in_progress") return "warning";
  return "success";
}

export default function ContactRequestsPage() {
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

  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (statusFilter) params.set("status", statusFilter);
  if (typeFilter) params.set("request_type", typeFilter);
  const queryString = params.toString();
  const baseUrl = `${ADMIN_ENDPOINTS.contactRequests}${queryString ? `?${queryString}` : ""}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<ContactRequestRow>(baseUrl, page, PAGE_SIZE);

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
    } catch (err) {
      setUpdateError(
        err instanceof ApiError
          ? err.message
          : "Une erreur inattendue est survenue",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function handleExportSelection() {
    const selectedIds = new Set(Array.from(selectedKeys).map(String));
    const rows = data.filter((row) => selectedIds.has(row.id));
    if (rows.length === 0) return;

    const header = [
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
    ];
    const body = rows.map((row) =>
      [
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
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );

    const csv = [header.join(","), ...body].join("\n");
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

  const columns: DataTableColumn<ContactRequestRow>[] = [
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
              <span className="text-sm font-medium text-primary">{row.email}</span>
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
            const next = event.target.value as ContactRequestStatus;
            if (next !== row.status) {
              void handleStatusChange(row.id, next);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">
          Demandes contact
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          {total} demande{total !== 1 ? "s" : ""} recue{total !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-placeholder" />
          <input
            type="text"
            placeholder="Rechercher entreprise, sujet, email..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="min-h-[44px] w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "" | ContactRequestStatus);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value as "" | ContactRequestType);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {!canManageSupport ? (
        <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
          Mode lecture seule. Permission requise pour modifier le statut:
          {" "}
          <span className="font-medium text-ink">admin:support:write</span>
        </div>
      ) : null}

      {updateError && (
        <div className="rounded-xl border border-danger bg-danger-light px-4 py-3 text-sm text-danger-text">
          {updateError}
        </div>
      )}

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading && data.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-card p-8 text-center text-sm text-ink-tertiary">
          Chargement des demandes...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
          toolbar={
            selectedKeys.size > 0 ? (
              <DataTableToolbar
                selectedCount={selectedKeys.size}
                totalCount={data.length}
                onClearSelection={() => setSelectedKeys(new Set())}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportSelection}
                >
                  Exporter
                </Button>
              </DataTableToolbar>
            ) : undefined
          }
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
