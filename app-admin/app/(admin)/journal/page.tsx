"use client";

import { useEffect, useState } from "react";
import { FileText, Shield, Download, Trash2, Eye, Clock } from "lucide-react";
import { DataTable, Button, type DataTableColumn } from "@praedixa/ui";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { SeverityBadge } from "@/components/severity-badge";
import { ACTION_LABELS } from "@/lib/inbox-helpers";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

/* ────────────────────────────────────────────── */
/*  Audit Log types                               */
/* ────────────────────────────────────────────── */

interface AuditLogEntry {
  id: string;
  adminUserId: string;
  targetOrgId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string;
  userAgent: string | null;
  requestId?: string | null;
  metadataJson: Record<string, unknown>;
  severity: string;
  createdAt: string;
}

/* ────────────────────────────────────────────── */
/*  RGPD actions                                  */
/* ────────────────────────────────────────────── */

interface RGPDAction {
  icon: typeof Shield;
  title: string;
  description: string;
  buttonLabel: string;
  variant: "default" | "danger";
}

const RGPD_ACTIONS: RGPDAction[] = [
  {
    icon: Eye,
    title: "Registre des traitements",
    description:
      "Consulter le registre des traitements de donnees personnelles conformement a l'article 30 du RGPD.",
    buttonLabel: "Consulter",
    variant: "default",
  },
  {
    icon: Download,
    title: "Export des donnees",
    description:
      "Generer un export complet des donnees personnelles d'une organisation (droit a la portabilite, article 20).",
    buttonLabel: "Exporter",
    variant: "default",
  },
  {
    icon: Trash2,
    title: "Suppression des donnees",
    description:
      "Supprimer definitivement toutes les donnees personnelles d'une organisation (droit a l'effacement, article 17).",
    buttonLabel: "Supprimer",
    variant: "danger",
  },
  {
    icon: Clock,
    title: "Politique de retention",
    description:
      "Configurer les delais de conservation des donnees par type (logs, audit, donnees metier).",
    buttonLabel: "Configurer",
    variant: "default",
  },
];

/* ────────────────────────────────────────────── */
/*  Sections                                      */
/* ────────────────────────────────────────────── */

const AUDIT_PAGE_SIZE = 30;

type Section = "audit" | "rgpd";

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export default function JournalPage() {
  const currentUser = useCurrentUser();
  const canReadAudit = hasAnyPermission(currentUser?.permissions, [
    "admin:audit:read",
  ]);
  const canManageRgpd = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
    "admin:billing:write",
    "admin:support:write",
  ]);
  const [section, setSection] = useState<Section>(
    canReadAudit ? "audit" : "rgpd",
  );
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );
  const [actionFilter, setActionFilter] = useState("");

  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  const queryString = params.toString();
  const baseUrl = `${ADMIN_ENDPOINTS.auditLog}${queryString ? `?${queryString}` : ""}`;
  useEffect(() => {
    if (!canReadAudit && canManageRgpd) {
      setSection("rgpd");
    }
  }, [canManageRgpd, canReadAudit]);

  const { data, total, error, refetch } = useApiGetPaginated<AuditLogEntry>(
    canReadAudit ? baseUrl : null,
    page,
    AUDIT_PAGE_SIZE,
  );
  const getRowKey = (row: AuditLogEntry, _index: number) => row.id;
  const selectedOnPageCount = data.filter((row, index) =>
    selectedKeys.has(getRowKey(row, index)),
  ).length;

  const columns: DataTableColumn<AuditLogEntry>[] = [
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
          <span className="text-sm text-ink-tertiary">{row.resourceType}</span>
        ) : (
          <span className="text-sm text-ink-placeholder">-</span>
        ),
    },
    {
      key: "ipAddress",
      label: "IP",
      render: (row) => (
        <span className="font-mono text-xs text-ink-placeholder">
          {row.ipAddress}
        </span>
      ),
    },
    {
      key: "requestId",
      label: "Request ID",
      render: (row) => (
        <span className="font-mono text-xs text-ink-placeholder">
          {row.requestId ? `${row.requestId.substring(0, 8)}...` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">Journal</h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          Audit et conformite RGPD
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border-subtle">
        <button
          onClick={() => setSection("audit")}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "audit"
              ? "font-medium text-primary"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          <FileText className="mr-1.5 inline-block h-4 w-4" />
          Audit ({total})
          {section === "audit" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setSection("rgpd")}
          className={`relative px-4 py-2.5 text-sm transition-colors ${
            section === "rgpd"
              ? "font-medium text-primary"
              : "text-ink-tertiary hover:text-ink-secondary"
          }`}
        >
          <Shield className="mr-1.5 inline-block h-4 w-4" />
          RGPD
          {section === "rgpd" && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Audit section */}
      {section === "audit" && (
        <div className="space-y-4">
          {!canReadAudit ? (
            <div className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
              Permission requise: admin:audit:read
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
          ) : !canReadAudit ? null : (
            <DataTable
              columns={columns}
              data={data}
              getRowKey={getRowKey}
              selection={{
                selectedKeys,
                onSelectionChange: setSelectedKeys,
              }}
              toolbar={
                selectedKeys.size > 0 ? (
                  <DataTableToolbar
                    selectedCount={selectedOnPageCount}
                    totalCount={data.length}
                    onClearSelection={setSelectedKeys.bind(
                      null,
                      new Set<string | number>(),
                    )}
                  >
                    <Button variant="ghost" size="sm">
                      Exporter
                    </Button>
                  </DataTableToolbar>
                ) : undefined
              }
              pagination={{
                page,
                pageSize: AUDIT_PAGE_SIZE,
                total,
                onPageChange: setPage,
              }}
            />
          )}
        </div>
      )}

      {/* RGPD section */}
      {section === "rgpd" && (
        <div className="grid gap-6 sm:grid-cols-2">
          {RGPD_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.title}
                className="rounded-2xl border border-border-subtle bg-card p-6 shadow-soft"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-sunken">
                  <Icon className="h-5 w-5 text-ink-tertiary" />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-charcoal">
                  {action.title}
                </h3>
                <p className="mb-4 text-sm text-ink-tertiary">
                  {action.description}
                </p>
                <button
                  disabled={!canManageRgpd}
                  className={`inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    !canManageRgpd
                      ? "cursor-not-allowed border border-border-subtle text-ink-placeholder"
                      : action.variant === "danger"
                        ? "border border-danger text-danger-text hover:bg-danger-light"
                        : "border border-border text-charcoal hover:bg-surface-sunken"
                  }`}
                >
                  {action.buttonLabel}
                </button>
                {!canManageRgpd ? (
                  <p className="mt-2 text-xs text-ink-placeholder">
                    Permission requise pour cette action.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
