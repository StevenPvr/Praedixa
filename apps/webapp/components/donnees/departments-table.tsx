"use client";

import { useState } from "react";
import {
  DataTable,
  type DataTableColumn,
  type DataTableSort,
} from "@praedixa/ui";
import { SkeletonTable } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

interface Site {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  code: string | null;
  siteId: string | null;
  headcount: number;
  minStaffingLevel: number;
  criticalRolesCount: number;
}

interface DepartmentsTableProps {
  sites: Site[];
}

function sortData(data: Department[], sort: DataTableSort): Department[] {
  return [...data].sort((a, b) => {
    /* v8 ignore next 2 -- null-coalescing fallback for nullable sort keys */
    const aVal = a[sort.key as keyof Department] ?? "";
    const bVal = b[sort.key as keyof Department] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), "fr-FR", {
      numeric: true,
    });
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

export function DepartmentsTable({ sites }: DepartmentsTableProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [sort, setSort] = useState<DataTableSort>({
    key: "name",
    direction: "asc",
  });

  const url = selectedSiteId
    ? `/api/v1/departments?site_id=${encodeURIComponent(selectedSiteId)}`
    : "/api/v1/departments";

  const { data, loading, error, refetch } = useApiGet<Department[]>(url);

  const siteNameMap = new Map(sites.map((s) => [s.id, s.name]));

  const columns: DataTableColumn<Department>[] = [
    { key: "name", label: "Nom", sortable: true },
    {
      key: "code",
      label: "Code",
      sortable: true,
      render: (row: Department) => row.code ?? "--",
    },
    {
      key: "siteId",
      label: "Site",
      sortable: true,
      render: (row: Department) =>
        row.siteId ? (siteNameMap.get(row.siteId) ?? "--") : "--",
    },
    {
      key: "headcount",
      label: "Effectif",
      sortable: true,
      align: "right",
      render: (row: Department) => row.headcount.toLocaleString("fr-FR"),
    },
    {
      key: "minStaffingLevel",
      label: "Seuil min.",
      sortable: true,
      align: "right",
      render: (row: Department) => `${row.minStaffingLevel.toFixed(0)}%`,
    },
    {
      key: "criticalRolesCount",
      label: "Roles critiques",
      sortable: true,
      align: "right",
      render: (row: Department) => String(row.criticalRolesCount),
    },
  ];

  const sorted = sortData(data ?? [], sort);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <label
          htmlFor="site-filter"
          className="text-sm font-medium text-gray-600"
        >
          Filtrer par site
        </label>
        <select
          id="site-filter"
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-charcoal sm:min-h-0 sm:py-1.5"
        >
          <option value="">Tous les sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <SkeletonTable rows={5} columns={6} />
      ) : error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : (
        <DataTable<Department>
          columns={columns}
          data={sorted}
          sort={sort}
          onSort={setSort}
          getRowKey={(row: Department) => row.id}
          emptyMessage="Aucun departement configure"
        />
      )}
    </div>
  );
}
