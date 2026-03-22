"use client";

import { Search, Plus, ChevronRight } from "lucide-react";
import { DataTable, Button, type DataTableColumn } from "@praedixa/ui";
import { DataTableToolbar } from "@/components/ui/data-table-toolbar";
import { ErrorFallback } from "@/components/error-fallback";
import { PlanBadge } from "@/components/plan-badge";
import { OrgStatusBadge } from "@/components/org-status-badge";
import { SkeletonOrgList } from "@/components/skeletons/skeleton-org-list";
import {
  PLAN_OPTIONS,
  STATUS_OPTIONS,
  type OrgListItem,
  useClientsPageModel,
} from "./use-clients-page-model";

const STATIC_COLUMNS: DataTableColumn<OrgListItem>[] = [
  {
    key: "name",
    label: "Nom",
    sortable: true,
    render: (row) => (
      <div>
        <p className="font-medium text-charcoal">{row.name}</p>
        <p className="text-xs text-ink-placeholder">{row.slug}</p>
        {row.isTest ? (
          <p className="mt-1 text-xs font-medium text-amber-700">Client test</p>
        ) : null}
      </div>
    ),
  },
  {
    key: "plan",
    label: "Plan",
    render: (row) => <PlanBadge plan={row.plan} />,
  },
  {
    key: "status",
    label: "Statut",
    render: (row) => <OrgStatusBadge status={row.status} />,
  },
  {
    key: "siteCount",
    label: "Sites",
    sortable: true,
    align: "right",
  },
  {
    key: "userCount",
    label: "Utilisateurs",
    sortable: true,
    align: "right",
  },
  {
    key: "contactEmail",
    label: "Contact",
    render: (row) => (
      <span className="text-sm text-ink-tertiary">{row.contactEmail}</span>
    ),
  },
];

export default function ClientsPage() {
  const {
    canCreateClient,
    page,
    setPage,
    selectedKeys,
    setSelectedKeys,
    search,
    statusFilter,
    planFilter,
    sort,
    setSort,
    data,
    total,
    loading,
    error,
    refetch,
    handleSearchChange,
    handleStatusFilterChange,
    handlePlanFilterChange,
    clearSelection,
    handleOpenCreateClient,
    handleExportSelection,
    handleViewSelection,
    openClientDashboard,
  } = useClientsPageModel();

  const columns: DataTableColumn<OrgListItem>[] = [
    ...STATIC_COLUMNS,
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row: OrgListItem) => (
        <button
          onClick={() => openClientDashboard(row.id)}
          className="inline-flex items-center text-ink-placeholder transition-colors hover:text-charcoal"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ),
    },
  ];
  const hasMultipleClients = total > 1;

  if (loading && data.length === 0) {
    return <SkeletonOrgList />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink">Clients</h1>
          <p className="mt-1 text-sm text-ink-tertiary">
            {total} client{hasMultipleClients ? "s" : ""} au total
          </p>
        </div>
        {canCreateClient ? (
          <button
            onClick={handleOpenCreateClient}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
          >
            <Plus className="h-4 w-4" />
            Nouveau client
          </button>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-placeholder" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-border py-2 pl-10 pr-4 text-sm text-charcoal placeholder:text-ink-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => handlePlanFilterChange(e.target.value)}
          className="min-h-[44px] rounded-lg border border-border px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {PLAN_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          data={data}
          sort={sort}
          onSort={setSort}
          getRowKey={(row) => row.id}
          selection={{ selectedKeys, onSelectionChange: setSelectedKeys }}
          toolbar={
            selectedKeys.size > 0 ? (
              <DataTableToolbar
                selectedCount={selectedKeys.size}
                totalCount={data.length}
                onClearSelection={clearSelection}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleExportSelection}
                >
                  Exporter
                </Button>
                <Button variant="ghost" size="sm" onClick={handleViewSelection}>
                  Voir le client
                </Button>
              </DataTableToolbar>
            ) : undefined
          }
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
