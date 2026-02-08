"use client";

import { useState } from "react";
import Link from "next/link";
import type { OperationalDecision } from "@praedixa/shared-types";
import {
  DataTable,
  SelectDropdown,
  DateRangePicker,
  Badge,
  SkeletonTable,
} from "@praedixa/ui";
import type { DataTableColumn, SelectOption, DateRange } from "@praedixa/ui";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const PAGE_SIZE = 15;

const HORIZON_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les horizons" },
  { value: "j3", label: "J+3" },
  { value: "j7", label: "J+7" },
  { value: "j14", label: "J+14" },
];

export default function DecisionsPage() {
  const [page, setPage] = useState(1);
  const [siteFilter] = useState("all");
  const [horizonFilter, setHorizonFilter] = useState("all");
  const [overrideOnly, setOverrideOnly] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });

  const params = new URLSearchParams();
  if (siteFilter !== "all") params.set("site_id", siteFilter);
  if (horizonFilter !== "all") params.set("horizon", horizonFilter);
  if (overrideOnly) params.set("is_override", "true");
  if (dateRange.from) params.set("date_from", dateRange.from);
  if (dateRange.to) params.set("date_to", dateRange.to);
  const queryStr = params.toString();
  const url = `/api/v1/operational-decisions${queryStr ? `?${queryStr}` : ""}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<OperationalDecision>(url, page, PAGE_SIZE);

  const columns: DataTableColumn<OperationalDecision>[] = [
    { key: "siteId", label: "Site" },
    { key: "decisionDate", label: "Date" },
    { key: "shift", label: "Shift" },
    { key: "horizon", label: "Horizon" },
    {
      key: "chosenOptionId",
      label: "Option choisie",
      render: (row) =>
        row.chosenOptionId ? row.chosenOptionId.slice(0, 8) + "..." : "-",
    },
    {
      key: "isOverride",
      label: "Override",
      render: (row) =>
        row.isOverride ? (
          <Badge variant="destructive">Override</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "coutAttenduEur",
      label: "Cout attendu",
      align: "right",
      render: (row) =>
        row.coutAttenduEur != null
          ? `${row.coutAttenduEur.toLocaleString("fr-FR")} EUR`
          : "-",
    },
    {
      key: "coutObserveEur",
      label: "Cout observe",
      align: "right",
      render: (row) =>
        row.coutObserveEur != null
          ? `${row.coutObserveEur.toLocaleString("fr-FR")} EUR`
          : "-",
    },
    {
      key: "id",
      label: "",
      render: (row) => (
        <Link
          href={`/decisions/${row.id}`}
          className="text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Detail
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">Decisions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Journal des decisions operationnelles
        </p>
      </div>

      {/* Filters */}
      <section aria-label="Filtres" className="flex flex-wrap items-end gap-4">
        <SelectDropdown
          label="Horizon"
          options={HORIZON_OPTIONS}
          value={horizonFilter}
          onChange={(v) => {
            setHorizonFilter(v);
            setPage(1);
          }}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <label className="flex items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={overrideOnly}
            onChange={(e) => {
              setOverrideOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 rounded border-gray-300"
          />
          Overrides uniquement
        </label>
      </section>

      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={9} />
      ) : data.length === 0 ? (
        <ErrorFallback
          variant="empty"
          message="Aucune decision pour les filtres selectionnes."
        />
      ) : (
        <DataTable<OperationalDecision>
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          pagination={{
            page,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
