"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CanonicalRecord,
  CanonicalQualityDashboard,
  Site,
} from "@praedixa/shared-types";
import { Database, PieChart, UserMinus, AlertCircle } from "lucide-react";
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
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { useSiteScope } from "@/lib/site-scope";

const PAGE_SIZE = 20;
const COVERAGE_THRESHOLD_PCT = 85;
const MISSING_SHIFTS_THRESHOLD_PCT = 5;
const MISSING_SHIFTS_ACCEPTABLE_PCT = 2;
const AVG_ABS_THRESHOLD_PCT = 5;
const WARNING_FACTOR = 0.8;
const DANGER_FACTOR = 1.5;

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
      : value >= goodThreshold * WARNING_FACTOR
        ? "warning"
        : "danger";
  }
  return value <= goodThreshold
    ? "good"
    : value <= goodThreshold * DANGER_FACTOR
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
  const {
    selectedSiteId: scopedSiteId,
    isSiteLocked,
    appendSiteParam,
  } = useSiteScope();
  const [siteFilter, setSiteFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!scopedSiteId) return;
    if (isSiteLocked || !siteFilter) {
      setSiteFilter(scopedSiteId);
    }
  }, [isSiteLocked, scopedSiteId, siteFilter]);

  const qualityUrl = useMemo(
    () => appendSiteParam("/api/v1/live/canonical/quality"),
    [appendSiteParam],
  );

  const {
    data: quality,
    loading: qualityLoading,
    error: qualityError,
    refetch: refetchQuality,
  } = useApiGet<CanonicalQualityDashboard>(qualityUrl, {
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
    appendSiteParam(`/api/v1/live/canonical${queryParams}`),
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
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Voir"
          title="Référentiel opérationnel"
          subtitle="Vérifiez la fiabilité des données qui alimentent vos arbitrages quotidiens."
        />

        {qualityLoading ? (
          <StatusBanner variant="info" title="Contrôle qualité en cours">
            Synchronisation des indicateurs de fiabilité et des derniers
            imports.
          </StatusBanner>
        ) : (quality?.missingShiftsPct ?? 0) > MISSING_SHIFTS_THRESHOLD_PCT ? (
          <StatusBanner variant="danger" title="Qualité des données à corriger">
            Le taux de postes non renseignés dépasse le seuil acceptable.
          </StatusBanner>
        ) : (quality?.coveragePct ?? 0) < COVERAGE_THRESHOLD_PCT ? (
          <StatusBanner variant="warning" title="Qualité sous surveillance">
            Le taux de remplissage est inférieur à l&apos;objectif attendu.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Base de référence fiable">
            Les données consolidées sont suffisamment complètes pour piloter les
            arbitrages.
          </StatusBanner>
        )}

        {qualityError ? (
          <ErrorFallback message={qualityError} onRetry={refetchQuality} />
        ) : (
          <DetailCard>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <MetricCard
                label="Lignes de données"
                value={
                  qualityLoading ? "..." : String(quality?.totalRecords ?? 0)
                }
                status={quality ? "neutral" : "neutral"}
                icon={<Database className="h-5 w-5" />}
                animate
              />
              <MetricCard
                label="Taux de remplissage"
                value={qualityLoading ? "..." : `${quality?.coveragePct ?? 0}`}
                unit="%"
                status={
                  quality
                    ? qualityStatus(
                        quality.coveragePct,
                        COVERAGE_THRESHOLD_PCT,
                        "gte",
                      )
                    : "neutral"
                }
                icon={<PieChart className="h-5 w-5" />}
                animate
              />
              <MetricCard
                label="Absence moyenne"
                value={qualityLoading ? "..." : `${quality?.avgAbsPct ?? 0}`}
                unit="%"
                status={
                  quality
                    ? qualityStatus(
                        quality.avgAbsPct,
                        AVG_ABS_THRESHOLD_PCT,
                        "lte",
                      )
                    : "neutral"
                }
                icon={<UserMinus className="h-5 w-5" />}
                animate
              />
              <MetricCard
                label="Postes non renseignés"
                value={
                  qualityLoading ? "..." : `${quality?.missingShiftsPct ?? 0}`
                }
                unit="%"
                status={
                  quality
                    ? qualityStatus(
                        quality.missingShiftsPct,
                        MISSING_SHIFTS_ACCEPTABLE_PCT,
                        "lte",
                      )
                    : "neutral"
                }
                icon={<AlertCircle className="h-5 w-5" />}
                animate
              />
            </div>
            <div className="mt-3 grid gap-2 text-caption text-ink-secondary sm:grid-cols-2 lg:grid-cols-4">
              <p>Lignes de données : volume total de lignes consolidées.</p>
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

        <DetailCard>
          <p className="mb-3 text-overline text-ink-tertiary">
            Filtrage operationnel
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <SelectDropdown
              label="Site"
              options={siteOptions}
              value={siteFilter}
              onChange={(v) => {
                if (isSiteLocked) return;
                setSiteFilter(v);
                setPage(1);
              }}
              placeholder="Tous les sites"
              disabled={isSiteLocked}
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

        <AnimatedSection>
          <p className="mb-3 text-caption text-ink-secondary">
            Tableau source pour audit operationnel. Utilisez les filtres pour
            isoler un site, un shift ou une plage de dates.
          </p>
          {recordsError ? (
            <ErrorFallback message={recordsError} onRetry={refetchRecords} />
          ) : recordsLoading ? (
            <SkeletonTable rows={10} columns={8} />
          ) : (records ?? []).length === 0 ? (
            <EmptyState
              icon={<Database className="h-6 w-6 text-ink-tertiary" />}
              title="Aucune donnee disponible"
              description="Aucune donnee ne correspond aux filtres selectionnes. Essayez d'elargir la plage de dates ou de changer de site."
            />
          ) : records ? (
            <DataTable<CanonicalRecord>
              columns={columns}
              data={records ?? []}
              getRowKey={(row) => row.id}
              emptyMessage="Aucune donnee disponible pour les filtres selectionnes."
              pagination={{
                page,
                pageSize: PAGE_SIZE,
                total,
                onPageChange: setPage,
              }}
              className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-floating)]"
            />
          ) : null}
        </AnimatedSection>
      </div>
    </PageTransition>
  );
}
