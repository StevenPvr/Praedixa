"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import type { CanonicalRecord, CanonicalQualityDashboard, Site } from "@praedixa/shared-types";
import {
  DataTable,
  MetricCard,
  SelectDropdown,
  DateRangePicker,
  Button,
  SkeletonTable,
} from "@praedixa/ui";
import type { DataTableColumn, DateRange, SelectOption } from "@praedixa/ui";
import { useApiGet, useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";

const PAGE_SIZE = 20;

const SHIFT_OPTIONS: SelectOption[] = [
  { value: "all", label: "Tous les shifts" },
  { value: "am", label: "Matin (AM)" },
  { value: "pm", label: "Apres-midi (PM)" },
];

export default function CanoniquePage() {
  const [page, setPage] = useState(1);
  const [siteFilter, setSiteFilter] = useState("all");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: "",
    to: "",
  });

  // Build query params
  const params = new URLSearchParams();
  if (siteFilter !== "all") params.set("site_id", siteFilter);
  if (shiftFilter !== "all") params.set("shift", shiftFilter);
  if (dateRange.from) params.set("date_from", dateRange.from);
  if (dateRange.to) params.set("date_to", dateRange.to);
  const queryStr = params.toString();
  const url = `/api/v1/canonical${queryStr ? `?${queryStr}` : ""}`;

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<CanonicalRecord>(url, page, PAGE_SIZE);

  const {
    data: quality,
  } = useApiGet<CanonicalQualityDashboard>("/api/v1/canonical/quality");

  const { data: sites } = useApiGet<Site[]>("/api/v1/organizations/sites");

  const siteOptions: SelectOption[] = [
    { value: "all", label: "Tous les sites" },
    ...(sites ?? []).map((s) => ({ value: s.id, label: s.name })),
  ];

  const columns: DataTableColumn<CanonicalRecord>[] = [
    { key: "siteId", label: "Site" },
    { key: "date", label: "Date" },
    { key: "shift", label: "Shift" },
    { key: "capacitePlanH", label: "Capacite", align: "right" },
    { key: "realiseH", label: "Realise", align: "right", render: (row) => String(row.realiseH ?? "-") },
    { key: "absH", label: "Abs", align: "right" },
    { key: "hsH", label: "HS", align: "right" },
    { key: "interimH", label: "Interim", align: "right" },
  ];

  const handleSiteChange = (value: string) => {
    setSiteFilter(value);
    setPage(1);
  };

  const handleShiftChange = (value: string) => {
    setShiftFilter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            Donnees canoniques
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Donnees operationnelles normalisees par site, date et shift
          </p>
        </div>
        <Button variant="default" className="gap-2">
          <Upload className="h-4 w-4" />
          Importer CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <section aria-label="Indicateurs canoniques">
        <div className="flex flex-wrap gap-3">
          <MetricCard
            label="Total enregistrements"
            value={quality?.totalRecords ?? "--"}
            status={quality ? "neutral" : "neutral"}
          />
          <MetricCard
            label="Couverture"
            value={quality ? `${Number(quality.coveragePct).toFixed(1)}%` : "--"}
            status={quality && Number(quality.coveragePct) >= 85 ? "good" : "warning"}
          />
          <MetricCard
            label="Taux absence moyen"
            value={quality ? `${Number(quality.avgAbsPct).toFixed(1)}%` : "--"}
            status={quality && Number(quality.avgAbsPct) <= 5 ? "good" : "warning"}
          />
          <MetricCard
            label="Shifts manquants"
            value={quality ? `${Number(quality.missingShiftsPct).toFixed(1)}%` : "--"}
            status={quality && Number(quality.missingShiftsPct) <= 2 ? "good" : "danger"}
          />
        </div>
      </section>

      {/* Filters */}
      <section aria-label="Filtres" className="flex flex-wrap items-end gap-4">
        <SelectDropdown
          label="Site"
          options={siteOptions}
          value={siteFilter}
          onChange={handleSiteChange}
        />
        <SelectDropdown
          label="Shift"
          options={SHIFT_OPTIONS}
          value={shiftFilter}
          onChange={handleShiftChange}
        />
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </section>

      {/* Data Table */}
      {error ? (
        <ErrorFallback message={error} onRetry={refetch} />
      ) : loading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : (
        <DataTable<CanonicalRecord>
          columns={columns}
          data={data}
          getRowKey={(row) => row.id}
          emptyMessage="Aucune donnee canonique trouvee"
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
