"use client";

import { useState, useMemo } from "react";
import type {
  CanonicalRecord,
  CanonicalQualityDashboard,
  Site,
} from "@praedixa/shared-types";
import { DataTable, SkeletonTable } from "@praedixa/ui";
import type { DataTableColumn } from "@praedixa/ui";
import { MetricCard, type MetricStatus } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  SelectDropdown,
  type SelectOption,
} from "@/components/ui/select-dropdown";
import {
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-range-picker";
import { DetailCard } from "@/components/ui/detail-card";
import { StatusBanner } from "@/components/status-banner";
import { useApiGet, useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { AnimatedSection } from "@/components/animated-section";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

const PAGE_SIZE = 20;

const SHIFT_OPTIONS: SelectOption[] = [
  { value: "", label: "Tous les postes" },
  { value: "am", label: "Matin (AM)" },
  { value: "pm", label: "Apres-midi (PM)" },
];

function qualityStatus(
  value: number,
  goodThreshold: number,
  direction: "gte" | "lte",
): MetricStatus {
  if (direction === "gte") {
    return value >= goodThreshold
      ? "good"
      : value >= goodThreshold * 0.8
        ? "warning"
        : "danger";
  }
  return value <= goodThreshold
    ? "good"
    : value <= goodThreshold * 1.5
      ? "warning"
      : "danger";
}

const columns: DataTableColumn<CanonicalRecord>[] = [
  { key: "siteId", label: "Site" },
  { key: "date", label: "Date" },
  { key: "shift", label: "Poste" },
  { key: "capacitePlanH", label: "Capacite plan. (h)", align: "right" },
  {
    key: "realiseH",
    label: "Realise (h)",
    align: "right",
    render: (row) => String(row.realiseH ?? "—"),
  },
  { key: "absH", label: "Absences (h)", align: "right" },
  { key: "hsH", label: "Heures sup. (h)", align: "right" },
  { key: "interimH", label: "Interim (h)", align: "right" },
];

export default function DonneesPage() {
  const [siteFilter, setSiteFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [page, setPage] = useState(1);

  const {
    data: quality,
    loading: qualityLoading,
    error: qualityError,
    refetch: refetchQuality,
  } = useApiGet<CanonicalQualityDashboard>("/api/v1/live/canonical/quality", {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const { data: sites } = useApiGet<Site[]>("/api/v1/sites");

  const queryParams = useMemo(() => {
    const parts: string[] = [];
    if (siteFilter) parts.push(`site_id=${siteFilter}`);
    if (shiftFilter) parts.push(`shift=${shiftFilter}`);
    if (dateRange.from) parts.push(`date_from=${dateRange.from}`);
    if (dateRange.to) parts.push(`date_to=${dateRange.to}`);
    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }, [siteFilter, shiftFilter, dateRange]);

  const {
    data: records,
    total,
    loading: recordsLoading,
    error: recordsError,
    refetch: refetchRecords,
  } = useApiGetPaginated<CanonicalRecord>(
    `/api/v1/live/canonical${queryParams}`,
    page,
    PAGE_SIZE,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const siteOptions: SelectOption[] = useMemo(() => {
    const opts: SelectOption[] = [{ value: "", label: "Tous les sites" }];
    if (sites) {
      for (const s of sites) {
        opts.push({ value: s.code ?? s.id, label: s.name });
      }
    }
    return opts;
  }, [sites]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Voir"
        title="Referentiel operationnel"
        subtitle="Verifiez la fiabilite des donnees qui alimentent vos arbitrages quotidiens."
      />

      {qualityLoading ? (
        <StatusBanner variant="info" title="Controle qualite en cours">
          Synchronisation des indicateurs de fiabilite et des derniers imports.
        </StatusBanner>
      ) : (quality?.missingShiftsPct ?? 0) > 5 ? (
        <StatusBanner variant="danger" title="Qualite des donnees a corriger">
          Le taux de postes non renseignes depasse le seuil acceptable.
        </StatusBanner>
      ) : (quality?.coveragePct ?? 0) < 85 ? (
        <StatusBanner variant="warning" title="Qualite sous surveillance">
          Le taux de remplissage est inferieur a l'objectif attendu.
        </StatusBanner>
      ) : (
        <StatusBanner variant="success" title="Base de reference fiable">
          Les donnees consolidees sont suffisamment completes pour piloter les
          arbitrages.
        </StatusBanner>
      )}

      {/* Quality metrics */}
      {qualityError ? (
        <ErrorFallback message={qualityError} onRetry={refetchQuality} />
      ) : (
        <DetailCard>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              label="Lignes de donnees"
              value={
                qualityLoading ? "..." : String(quality?.totalRecords ?? 0)
              }
              status={quality ? "neutral" : "neutral"}
            />
            <MetricCard
              label="Taux de remplissage"
              value={qualityLoading ? "..." : `${quality?.coveragePct ?? 0}`}
              unit="%"
              status={
                quality
                  ? qualityStatus(quality.coveragePct, 85, "gte")
                  : "neutral"
              }
            />
            <MetricCard
              label="Absence moyenne"
              value={qualityLoading ? "..." : `${quality?.avgAbsPct ?? 0}`}
              unit="%"
              status={
                quality ? qualityStatus(quality.avgAbsPct, 5, "lte") : "neutral"
              }
            />
            <MetricCard
              label="Postes non renseignes"
              value={
                qualityLoading ? "..." : `${quality?.missingShiftsPct ?? 0}`
              }
              unit="%"
              status={
                quality
                  ? qualityStatus(quality.missingShiftsPct, 2, "lte")
                  : "neutral"
              }
            />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
            <p>Lignes de donnees: volume total de lignes consolidees.</p>
            <p>
              Taux de remplissage: part des champs utiles effectivement
              renseignes.
            </p>
            <p>
              Absence moyenne: niveau moyen d&apos;absence observe sur la
              periode.
            </p>
            <p>
              Postes non renseignes: part des shifts sans donnee exploitable.
            </p>
          </div>
        </DetailCard>
      )}

      {/* Filters */}
      <DetailCard>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-tertiary">
          Filtrage operationnel
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <SelectDropdown
            label="Site"
            options={siteOptions}
            value={siteFilter}
            onChange={(v) => {
              setSiteFilter(v);
              setPage(1);
            }}
            placeholder="Tous les sites"
          />
          <SelectDropdown
            label="Poste"
            options={SHIFT_OPTIONS}
            value={shiftFilter}
            onChange={(v) => {
              setShiftFilter(v);
              setPage(1);
            }}
            placeholder="Tous les postes"
          />
          <DateRangePicker
            value={dateRange}
            onChange={(r) => {
              setDateRange(r);
              setPage(1);
            }}
          />
        </div>
      </DetailCard>

      {/* Data table */}
      <AnimatedSection>
        <p className="mb-3 text-xs text-gray-500">
          Tableau source pour audit operationnel. Utilisez les filtres pour
          isoler un site, un shift ou une plage de dates.
        </p>
        {recordsError ? (
          <ErrorFallback message={recordsError} onRetry={refetchRecords} />
        ) : recordsLoading ? (
          <SkeletonTable rows={10} columns={8} />
        ) : (
          <DataTable<CanonicalRecord>
            columns={columns}
            data={records}
            getRowKey={(row) => row.id}
            emptyMessage="Aucune donnee disponible pour les filtres selectionnes."
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: setPage,
            }}
          />
        )}
      </AnimatedSection>
    </div>
  );
}
