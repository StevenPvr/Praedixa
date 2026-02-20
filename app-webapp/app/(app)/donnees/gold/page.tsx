"use client";

import { useMemo, useState } from "react";
import { Database, Search, Rows3, Layers } from "lucide-react";
import { DataTable, type DataTableColumn, SkeletonTable } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { useApiGet, useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { useSiteScope } from "@/lib/site-scope";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface GoldColumnDescriptor {
  name: string;
  dtype: "number" | "boolean" | "date" | "string" | "unknown";
  nullable: boolean;
  sample: string | number | boolean | null;
}

interface GoldSchema {
  revision: string;
  loadedAt: string;
  totalRows: number;
  totalColumns: number;
  columns: GoldColumnDescriptor[];
}

interface GoldColumnCoverage {
  name: string;
  exposedInExplorer: boolean;
  usedInBusinessViews: boolean;
  mappedViews: string[];
}

interface GoldCoverage {
  totalColumns: number;
  explorerExposedColumns: number;
  businessMappedColumns: number;
  columns: GoldColumnCoverage[];
}

interface GoldProvenancePolicy {
  allowedMockDomains: string[];
  forecastMockColumns: string[];
  nonForecastMockColumns: string[];
  strictDataPolicyOk: boolean;
}

interface GoldQualityReports {
  silverQualityAvailable: boolean;
  goldFeatureQualityAvailable: boolean;
  lastRunSummaryAvailable: boolean;
  lastRunAt: string | null;
  lastRunGoldRows: number | null;
}

interface GoldProvenance {
  revision: string;
  loadedAt: string;
  sourcePath: string;
  scopedRows: number;
  totalRows: number;
  totalColumns: number;
  policy: GoldProvenancePolicy;
  qualityReports: GoldQualityReports;
}

type GoldRow = Record<string, string | number | boolean | null>;

const PAGE_SIZE = 20;

function toDisplayValue(
  value: string | number | boolean | null | undefined,
): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export default function GoldExplorerPage() {
  const { appendSiteParam, selectedSiteId } = useSiteScope();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const schemaUrl = useMemo(
    () => appendSiteParam("/api/v1/live/gold/schema"),
    [appendSiteParam],
  );
  const coverageUrl = useMemo(
    () => appendSiteParam("/api/v1/live/gold/coverage"),
    [appendSiteParam],
  );
  const provenanceUrl = useMemo(
    () => appendSiteParam("/api/v1/live/gold/provenance"),
    [appendSiteParam],
  );

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [dateFrom, dateTo, search]);

  const rowsUrl = useMemo(
    () => appendSiteParam(`/api/v1/live/gold/rows${query}`),
    [appendSiteParam, query],
  );

  const {
    data: schema,
    loading: schemaLoading,
    error: schemaError,
    refetch: refetchSchema,
  } = useApiGet<GoldSchema>(schemaUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: coverage,
    loading: coverageLoading,
    error: coverageError,
    refetch: refetchCoverage,
  } = useApiGet<GoldCoverage>(coverageUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: rows,
    total,
    loading: rowsLoading,
    error: rowsError,
    refetch: refetchRows,
  } = useApiGetPaginated<GoldRow>(rowsUrl, page, PAGE_SIZE, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: provenance,
    loading: provenanceLoading,
    error: provenanceError,
    refetch: refetchProvenance,
  } = useApiGet<GoldProvenance>(provenanceUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const columns: DataTableColumn<GoldRow>[] = useMemo(
    () =>
      (schema?.columns ?? []).map((column) => ({
        key: column.name,
        label: column.name,
        render: (row) => toDisplayValue(row[column.name]),
        minWidth: 160,
        resizable: true,
      })),
    [schema?.columns],
  );

  const mappedPct =
    coverage && coverage.totalColumns > 0
      ? Math.round(
          (coverage.businessMappedColumns / coverage.totalColumns) * 100,
        )
      : 0;

  const headerSubtitle = selectedSiteId
    ? "Exploration Gold sur le site scope courant."
    : "Exploration Gold sur l'ensemble des sites de votre organisation.";

  return (
    <PageTransition>
      <div className="gradient-mesh min-h-full space-y-8">
        <PageHeader
          eyebrow="Donnees"
          title="Gold Explorer"
          subtitle={headerSubtitle}
        />

        {schemaLoading || coverageLoading || provenanceLoading ? (
          <StatusBanner variant="info" title="Synchronisation Gold en cours">
            Lecture du schema et de la couverture metier de la couche Gold.
          </StatusBanner>
        ) : schemaError || coverageError || provenanceError ? (
          <StatusBanner variant="warning" title="Visibilite Gold partielle">
            Certaines metadonnees Gold ne sont pas accessibles temporairement.
          </StatusBanner>
        ) : provenance && !provenance.policy.strictDataPolicyOk ? (
          <StatusBanner variant="danger" title="Politique donnees non conforme">
            Des colonnes mock hors forecasting sont detectees dans Gold.
          </StatusBanner>
        ) : (
          <StatusBanner
            variant={mappedPct >= 30 ? "success" : "warning"}
            title={
              mappedPct >= 30
                ? "Couverture Gold suivie"
                : "Couverture metier Gold a renforcer"
            }
          >
            {mappedPct}% des colonnes Gold sont actuellement mappees dans des
            vues metier.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Colonnes Gold"
              value={schemaLoading ? "..." : (schema?.totalColumns ?? 0)}
              status="neutral"
              icon={<Layers className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Lignes scope"
              value={schemaLoading ? "..." : (schema?.totalRows ?? 0)}
              status="neutral"
              icon={<Rows3 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Colonnes mappees"
              value={
                coverageLoading ? "..." : (coverage?.businessMappedColumns ?? 0)
              }
              status={mappedPct >= 30 ? "good" : "warning"}
              icon={<Database className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Revision"
              value={schemaLoading ? "..." : (schema?.revision ?? "n/a")}
              status="neutral"
              icon={<Search className="h-5 w-5" />}
            />
          </div>
        </DetailCard>

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Lignes scope verifiees"
              value={
                provenanceLoading
                  ? "..."
                  : String(provenance?.scopedRows ?? schema?.totalRows ?? 0)
              }
              status="neutral"
              icon={<Rows3 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Politique non-mock"
              value={
                provenanceLoading
                  ? "..."
                  : provenance?.policy.strictDataPolicyOk
                    ? "Conforme"
                    : "Non conforme"
              }
              status={
                provenance?.policy.strictDataPolicyOk === false
                  ? "danger"
                  : "good"
              }
              icon={<Database className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Rapports qualite"
              value={
                provenanceLoading
                  ? "..."
                  : provenance?.qualityReports.lastRunSummaryAvailable
                    ? "Disponibles"
                    : "Partiels"
              }
              status={
                provenance?.qualityReports.lastRunSummaryAvailable
                  ? "good"
                  : "warning"
              }
              icon={<Layers className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Run Gold"
              value={
                provenanceLoading
                  ? "..."
                  : provenance?.qualityReports.lastRunAt
                    ? provenance.qualityReports.lastRunAt.slice(0, 10)
                    : "n/a"
              }
              status="neutral"
              icon={<Search className="h-5 w-5" />}
            />
          </div>
          <div className="mt-3 space-y-2 text-caption text-ink-secondary">
            <p>
              Source physique:{" "}
              <code className="rounded bg-surface-alt px-1 py-0.5">
                {provenance?.sourcePath ?? "data-ready/gold/gold_site_day.csv"}
              </code>
            </p>
            {provenance &&
            provenance.policy.nonForecastMockColumns.length > 0 ? (
              <p className="text-danger-text">
                Colonnes mock non autorisees:{" "}
                {provenance.policy.nonForecastMockColumns.join(", ")}
              </p>
            ) : (
              <p>
                Aucune colonne mock hors forecasting detectee dans la couche
                Gold exposee.
              </p>
            )}
          </div>
        </DetailCard>

        <DetailCard>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-body-sm text-ink">
              Recherche plein texte
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Ex: site_code, model_version, meteo..."
                className="rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-ink outline-none transition-all duration-fast focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm text-ink">
              Date debut
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-ink outline-none transition-all duration-fast focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-body-sm text-ink">
              Date fin
              <input
                type="date"
                value={dateTo}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-border bg-card px-3 py-2 text-body-sm text-ink outline-none transition-all duration-fast focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        </DetailCard>

        {schemaError || coverageError || provenanceError ? (
          <ErrorFallback
            message={
              schemaError ??
              coverageError ??
              provenanceError ??
              "Erreur inconnue"
            }
            onRetry={() => {
              refetchSchema();
              refetchCoverage();
              refetchProvenance();
            }}
          />
        ) : rowsError ? (
          <ErrorFallback message={rowsError} onRetry={refetchRows} />
        ) : rowsLoading || schemaLoading ? (
          <SkeletonTable rows={10} columns={Math.max(columns.length, 8)} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Database className="h-6 w-6 text-ink-tertiary" />}
            title="Aucune ligne Gold"
            description="Aucune ligne ne correspond aux filtres selectionnes."
          />
        ) : (
          <DataTable<GoldRow>
            columns={columns}
            data={rows}
            getRowKey={(row, index) =>
              `${String(row.client_slug ?? "client")}-${String(row.site_code ?? "site")}-${String(row.date ?? index)}-${index}`
            }
            emptyMessage="Aucune ligne Gold"
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: setPage,
            }}
            stickyHeader
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-floating)]"
          />
        )}
      </div>
    </PageTransition>
  );
}
