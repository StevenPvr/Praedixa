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
  code: string | null;
  timezone: string;
  headcount: number;
}

const columns: DataTableColumn<Site>[] = [
  { key: "name", label: "Nom", sortable: true },
  {
    key: "code",
    label: "Code",
    sortable: true,
    render: (row: Site) => row.code ?? "--",
  },
  {
    key: "headcount",
    label: "Effectif",
    sortable: true,
    align: "right",
    render: (row: Site) => row.headcount.toLocaleString("fr-FR"),
  },
  { key: "timezone", label: "Fuseau horaire", sortable: true },
];

function sortData(data: Site[], sort: DataTableSort): Site[] {
  return [...data].sort((a, b) => {
    /* v8 ignore next 2 -- null-coalescing fallback for nullable sort keys */
    const aVal = a[sort.key as keyof Site] ?? "";
    const bVal = b[sort.key as keyof Site] ?? "";
    const cmp = String(aVal).localeCompare(String(bVal), "fr-FR", {
      numeric: true,
    });
    return sort.direction === "asc" ? cmp : -cmp;
  });
}

export function SitesTable() {
  const { data, loading, error, refetch } = useApiGet<Site[]>("/api/v1/sites");
  const [sort, setSort] = useState<DataTableSort>({
    key: "name",
    direction: "asc",
  });

  if (loading) {
    return <SkeletonTable rows={5} columns={4} />;
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  const sorted = sortData(data ?? [], sort);

  return (
    <DataTable<Site>
      columns={columns}
      data={sorted}
      sort={sort}
      onSort={setSort}
      getRowKey={(row: Site) => row.id}
      emptyMessage="Aucun site configure"
    />
  );
}
