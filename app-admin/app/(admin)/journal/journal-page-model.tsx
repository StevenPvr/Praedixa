"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Download, Eye, Trash2, type LucideIcon } from "lucide-react";
import type { DataTableColumn } from "@praedixa/ui";

import { SeverityBadge } from "@/components/severity-badge";
import { useApiGetPaginated } from "@/hooks/use-api";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ACTION_LABELS } from "@/lib/inbox-helpers";

export interface AuditLogEntry {
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

export interface RgpdAction {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  variant: "default" | "danger";
}

export const RGPD_ACTIONS: RgpdAction[] = [
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

export const AUDIT_PAGE_SIZE = 30;

export type JournalSection = "audit" | "rgpd";

function buildAuditLogUrl(actionFilter: string) {
  if (!actionFilter) {
    return ADMIN_ENDPOINTS.auditLog;
  }

  const params = new URLSearchParams();
  params.set("action", actionFilter);
  return `${ADMIN_ENDPOINTS.auditLog}?${params.toString()}`;
}

function createAuditLogColumns(): DataTableColumn<AuditLogEntry>[] {
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
}

export function useJournalPageModel() {
  const currentUser = useCurrentUser();
  const canReadAudit = hasAnyPermission(currentUser?.permissions, [
    "admin:audit:read",
  ]);
  const canManageRgpd = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
    "admin:billing:write",
    "admin:support:write",
  ]);
  const [section, setSection] = useState<JournalSection>(
    canReadAudit ? "audit" : "rgpd",
  );
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (!canReadAudit && canManageRgpd) {
      setSection("rgpd");
    }
  }, [canManageRgpd, canReadAudit]);

  const { data, total, error, refetch } = useApiGetPaginated<AuditLogEntry>(
    canReadAudit ? buildAuditLogUrl(actionFilter) : null,
    page,
    AUDIT_PAGE_SIZE,
  );

  const getRowKey = (row: AuditLogEntry) => row.id;
  const selectedOnPageCount = data.filter((row) =>
    selectedKeys.has(row.id),
  ).length;
  const columns = useMemo(() => createAuditLogColumns(), []);

  return {
    canReadAudit,
    canManageRgpd,
    section,
    setSection,
    page,
    setPage,
    selectedKeys,
    setSelectedKeys,
    actionFilter,
    setActionFilter,
    data,
    total,
    error,
    refetch,
    getRowKey,
    selectedOnPageCount,
    columns,
  };
}
