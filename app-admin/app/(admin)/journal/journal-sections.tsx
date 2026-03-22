"use client";

import type { ReactNode } from "react";
import { FileText, Shield } from "lucide-react";
import { Button, DataTable, type DataTableColumn } from "@praedixa/ui";

import { ErrorFallback } from "@/components/error-fallback";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { ACTION_LABELS } from "@/lib/inbox-helpers";

import {
  AUDIT_PAGE_SIZE,
  RGPD_ACTIONS,
  type AuditLogEntry,
  type JournalSection,
} from "./journal-page-model";

type JournalTabsProps = {
  section: JournalSection;
  total: number;
  onChange: (section: JournalSection) => void;
};

export function JournalTabs(props: Readonly<JournalTabsProps>) {
  const { section, total, onChange } = props;
  const auditTabClassName =
    section === "audit"
      ? "font-medium text-primary"
      : "text-ink-tertiary hover:text-ink-secondary";
  const auditButtonClassName = `relative px-4 py-2.5 text-sm transition-colors ${auditTabClassName}`;
  const rgpdTabClassName =
    section === "rgpd"
      ? "font-medium text-primary"
      : "text-ink-tertiary hover:text-ink-secondary";
  const rgpdButtonClassName = `relative px-4 py-2.5 text-sm transition-colors ${rgpdTabClassName}`;
  return (
    <div className="flex gap-1 border-b border-border-subtle">
      <button
        type="button"
        onClick={() => onChange("audit")}
        className={auditButtonClassName}
      >
        <FileText className="mr-1.5 inline-block h-4 w-4" />
        Audit ({total})
        {section === "audit" ? (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onChange("rgpd")}
        className={rgpdButtonClassName}
      >
        <Shield className="mr-1.5 inline-block h-4 w-4" />
        RGPD
        {section === "rgpd" ? (
          <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
        ) : null}
      </button>
    </div>
  );
}

type JournalAuditSectionProps = {
  canReadAudit: boolean;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  error: string | null;
  refetch: () => void;
  columns: DataTableColumn<AuditLogEntry>[];
  data: AuditLogEntry[];
  getRowKey: (row: AuditLogEntry) => string;
  selectedKeys: Set<string | number>;
  setSelectedKeys: (value: Set<string | number>) => void;
  selectedOnPageCount: number;
  page: number;
  setPage: (page: number) => void;
  total: number;
};

export function JournalAuditSection({
  canReadAudit,
  actionFilter,
  onActionFilterChange,
  error,
  refetch,
  columns,
  data,
  getRowKey,
  selectedKeys,
  setSelectedKeys,
  selectedOnPageCount,
  page,
  setPage,
  total,
}: Readonly<JournalAuditSectionProps>) {
  const hasAuditReadPermission = canReadAudit;
  const permissionNotice =
    hasAuditReadPermission === false ? (
      <div className="rounded-lg border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
        Permission requise: admin:audit:read
      </div>
    ) : null;
  const toolbarContent =
    selectedKeys.size > 0 ? (
      <DataTableToolbar
        selectedCount={selectedOnPageCount}
        totalCount={data.length}
        onClearSelection={() => setSelectedKeys(new Set())}
      >
        <Button variant="ghost" size="sm">
          Exporter
        </Button>
      </DataTableToolbar>
    ) : undefined;
  let content: ReactNode = (
    <DataTable
      columns={columns}
      data={data}
      getRowKey={getRowKey}
      selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
      toolbar={toolbarContent}
      pagination={{
        page,
        pageSize: AUDIT_PAGE_SIZE,
        total,
        onPageChange: setPage,
      }}
    />
  );

  if (error) {
    content = <ErrorFallback message={error} onRetry={refetch} />;
  } else if (hasAuditReadPermission === false) {
    content = null;
  }

  return (
    <div className="space-y-4">
      {permissionNotice}

      <div className="flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={(event) => {
            onActionFilterChange(event.target.value);
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
      {content}
    </div>
  );
}

type JournalRgpdSectionProps = {
  canManageRgpd: boolean;
};

export function JournalRgpdSection({
  canManageRgpd,
}: Readonly<JournalRgpdSectionProps>) {
  const hasManageRgpdPermission = canManageRgpd;
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {RGPD_ACTIONS.map((action) => {
        const Icon = action.icon;
        let buttonClassName =
          "border border-border text-charcoal hover:bg-surface-sunken";
        if (hasManageRgpdPermission === false) {
          buttonClassName =
            "cursor-not-allowed border border-border-subtle text-ink-placeholder";
        } else if (action.variant === "danger") {
          buttonClassName =
            "border border-danger text-danger-text hover:bg-danger-light";
        }
        const className = `inline-flex min-h-[44px] items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${buttonClassName}`;
        const permissionMessage =
          hasManageRgpdPermission === false ? (
            <p className="mt-2 text-xs text-ink-placeholder">
              Permission requise pour cette action.
            </p>
          ) : null;
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
              type="button"
              disabled={hasManageRgpdPermission === false}
              className={className}
            >
              {action.buttonLabel}
            </button>
            {permissionMessage}
          </div>
        );
      })}
    </div>
  );
}
