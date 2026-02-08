"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Search, ChevronRight } from "lucide-react";
import {
  DataTable,
  type DataTableColumn,
} from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { ErrorFallback } from "@/components/error-fallback";
import { PlanBadge, type PlanTier } from "@/components/plan-badge";
import { OrgStatusBadge, type OrgStatus } from "@/components/org-status-badge";

interface OrgBillingListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  userCount: number;
  createdAt: string;
}

export default function FacturationPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (planFilter) params.set("plan", planFilter);
  const queryString = params.toString();
  const baseUrl = `${ADMIN_ENDPOINTS.organizations}${queryString ? `?${queryString}` : ""}`;

  const { data, total, error, refetch } =
    useApiGetPaginated<OrgBillingListItem>(baseUrl, page, 20);

  const columns: DataTableColumn<OrgBillingListItem>[] = [
    {
      key: "name",
      label: "Organisation",
      sortable: true,
      render: (row) => (
        <span className="font-medium text-charcoal">{row.name}</span>
      ),
    },
    {
      key: "plan",
      label: "Plan actuel",
      render: (row) => <PlanBadge plan={row.plan} />,
    },
    {
      key: "status",
      label: "Statut",
      render: (row) => <OrgStatusBadge status={row.status} />,
    },
    {
      key: "userCount",
      label: "Utilisateurs",
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
      render: (row: OrgBillingListItem) => (
        <button
          onClick={() =>
            router.push(
              `/organisations/${encodeURIComponent(row.id)}`,
            )
          }
          className="inline-flex items-center text-gray-400 transition-colors hover:text-charcoal"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-semibold text-charcoal">
            Facturation
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Gestion des plans et facturation des organisations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="min-h-[44px] w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm text-charcoal placeholder:text-gray-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-sm text-charcoal focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="professional">Pro</option>
          <option value="enterprise">Enterprise</option>
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
            pageSize: 20,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
