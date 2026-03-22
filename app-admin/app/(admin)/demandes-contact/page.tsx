"use client";

import { Search } from "lucide-react";
import { Button, DataTable } from "@praedixa/ui";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { ErrorFallback } from "@/components/error-fallback";
import {
  CONTACT_REQUESTS_PAGE_SIZE,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  useDemandesContactPageModel,
  type ContactRequestStatus,
  type ContactRequestType,
} from "./demandes-contact-page-model";

export default function ContactRequestsPage() {
  const {
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
  } = useDemandesContactPageModel();
  const isSupportReadOnly = canManageSupport === false;
  const hasMultipleRequests = total > 1 || total === 0;
  const hasInitialLoadingState = loading && data.length === 0;
  const selectionToolbar =
    selectedKeys.size > 0 ? (
      <DataTableToolbar
        selectedCount={selectedKeys.size}
        totalCount={data.length}
        onClearSelection={() => setSelectedKeys(new Set())}
      >
        <Button variant="ghost" size="sm" onClick={handleExportSelection}>
          Exporter
        </Button>
      </DataTableToolbar>
    ) : undefined;

  let content: React.ReactNode;

  if (error) {
    content = <ErrorFallback message={error} onRetry={refetch} />;
  } else if (hasInitialLoadingState) {
    content = (
      <div className="rounded-2xl border border-border-subtle bg-card p-8 text-center text-sm text-ink-tertiary">
        Chargement des demandes...
      </div>
    );
  } else {
    content = (
      <DataTable
        columns={columns}
        data={data}
        getRowKey={(row) => row.id}
        selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
        toolbar={selectionToolbar}
        pagination={{
          page,
          pageSize: CONTACT_REQUESTS_PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-ink">
          Demandes contact
        </h1>
        <p className="mt-1 text-sm text-ink-tertiary">
          {total} demande{hasMultipleRequests ? "s" : ""} recue
          {hasMultipleRequests ? "s" : ""}
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

      {isSupportReadOnly ? (
        <div className="rounded-xl border border-border-subtle bg-card px-4 py-3 text-sm text-ink-tertiary">
          Mode lecture seule. Permission requise pour modifier le statut:{" "}
          <span className="font-medium text-ink">admin:support:write</span>
        </div>
      ) : null}

      {updateError && (
        <div className="rounded-xl border border-danger bg-danger-light px-4 py-3 text-sm text-danger-text">
          {updateError}
        </div>
      )}

      {content}
    </div>
  );
}
