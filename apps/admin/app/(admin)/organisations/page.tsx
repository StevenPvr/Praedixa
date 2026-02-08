"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ChevronRight } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";
import { SkeletonOrgList } from "@/components/skeletons/skeleton-org-list";

interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  userCount: number;
  siteCount: number;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "trial", label: "Essai" },
  { value: "churned", label: "Churne" },
];

const PLAN_OPTIONS = [
  { value: "", label: "Tous les plans" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

export default function OrganisationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sort, setSort] = useState<DataTableSort>({
    key: "name",
    direction: "asc",
  });

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (statusFilter) params.set("status", statusFilter);
  if (planFilter) params.set("plan", planFilter);
  const queryString = params.toString();
  const baseUrl = `${ADMIN_ENDPOINTS.organizations}${queryString ? `?${queryString}` : ""}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<OrgListItem>(baseUrl, page, 20);

  const columns: DataTableColumn<OrgListItem>[] = [
    {
      key: "name",
      label: "Organisation",
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-charcoal">{row.name}</p>
          <p className="text-xs text-gray-400">{row.slug}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => <OrgStatusBadge status={row.status} />,
    },
    {
      key: "plan",
      label: "Plan",
      render: (row) => <PlanBadge plan={row.plan} />,
    },
    {
      key: "userCount",
      label: "Utilisateurs",
      sortable: true,
      align: "right",
    },
    {
      key: "siteCount",
      label: "Sites",
      sortable: true,
      align: "right",
    },
    {
      key: "contactEmail",
      label: "Contact",
      render: (row) => (
        <span className="text-sm text-gray-500">{row.contactEmail}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      render: (row: OrgListItem) => (
        <button
          onClick={() =>
            router.push(`/organisations/${encodeURIComponent(row.id)}`)
          }
          className="inline-flex items-center text-gray-400 transition-colors hover:text-charcoal"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ),
    },
  ];

  if (loading && data.length === 0) {
    return <SkeletonOrgList />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            Organisations
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {total} organisation{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <button
          onClick={() => router.push("/onboarding")}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-600"
        >
          <Plus className="h-4 w-4" />
          Nouvelle organisation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="min-h-[44px] w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
