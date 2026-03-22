"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DataTableSort } from "@praedixa/ui";

import { useApiGetPaginated } from "@/hooks/use-api";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { buildCsvDocument } from "@/lib/security/csv";
import type { PlanTier } from "@/components/plan-badge";
import type { OrgStatus } from "@/components/org-status-badge";

export interface OrgListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  plan: PlanTier;
  contactEmail: string;
  isTest: boolean;
  userCount: number;
  siteCount: number;
  createdAt: string;
}

export const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "active", label: "Actif" },
  { value: "suspended", label: "Suspendu" },
  { value: "trial", label: "Essai" },
  { value: "churned", label: "Churne" },
];

export const PLAN_OPTIONS = [
  { value: "", label: "Tous les plans" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "professional", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

const INITIAL_SORT: DataTableSort = {
  key: "name",
  direction: "asc",
};

export function useClientsPageModel() {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const canCreateClient = hasAnyPermission(currentUser?.permissions, [
    "admin:org:write",
  ]);

  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string | number>>(
    new Set(),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [sort, setSort] = useState(INITIAL_SORT);

  const baseUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (planFilter) params.set("plan", planFilter);

    const queryString = params.toString();
    const querySuffix = queryString ? `?${queryString}` : "";
    return `${ADMIN_ENDPOINTS.organizations}${querySuffix}`;
  }, [planFilter, search, statusFilter]);

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<OrgListItem>(baseUrl, page, 20);

  function resetToFirstPage() {
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    resetToFirstPage();
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    resetToFirstPage();
  }

  function handlePlanFilterChange(value: string) {
    setPlanFilter(value);
    resetToFirstPage();
  }

  function clearSelection() {
    setSelectedKeys(new Set());
  }

  function openClientDashboard(clientId: string) {
    router.push(`/clients/${encodeURIComponent(clientId)}/dashboard`);
  }

  function handleOpenCreateClient() {
    router.push("/parametres");
  }

  function handleExportSelection() {
    const selectedIds = new Set(Array.from(selectedKeys).map(String));
    const rows = data.filter((org) => selectedIds.has(org.id));
    if (rows.length === 0) {
      return;
    }

    const csv = buildCsvDocument(
      ["organization_id", "name", "slug", "status", "plan", "contact_email"],
      rows.map((row) => [
        row.id,
        row.name,
        row.slug,
        row.status,
        row.plan,
        row.contactEmail,
      ]),
    );

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "clients-selection.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function handleViewSelection() {
    const firstSelected = Array.from(selectedKeys)[0];
    if (!firstSelected) {
      return;
    }
    openClientDashboard(String(firstSelected));
  }

  return {
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
  };
}
