"use client";

import { useMemo, useState } from "react";
import type { DatasetSummary } from "@praedixa/shared-types";
import { Database, FileArchive, Filter, Table2 } from "lucide-react";
import { DataTable, type DataTableColumn, SkeletonTable } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { StatusBanner } from "@/components/status-banner";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import {
  SelectDropdown,
  type SelectOption,
} from "@/components/ui/select-dropdown";
import { useApiGetPaginated } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: SelectOption[] = [
  { value: "", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "pending", label: "En attente" },
  { value: "migrating", label: "Migration" },
  { value: "archived", label: "Archives" },
];

function statusLabel(value: string): string {
  switch (value) {
    case "active":
      return "Actif";
    case "pending":
      return "En attente";
    case "migrating":
      return "Migration";
    case "archived":
      return "Archive";
    default:
      return value;
  }
}

function statusVariant(
  value: string,
): "success" | "warning" | "danger" | "outline" {
  switch (value) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "migrating":
      return "warning";
    case "archived":
      return "outline";
    default:
      return "outline";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const columns: DataTableColumn<DatasetSummary>[] = [
  { key: "name", label: "Fichier" },
  { key: "tableName", label: "Table" },
  {
    key: "status",
    label: "Statut",
    render: (row) => (
      <Badge variant={statusVariant(row.status)}>
        {statusLabel(row.status)}
      </Badge>
    ),
  },
  { key: "rowCount", label: "Lignes", align: "right" },
  { key: "columnCount", label: "Colonnes", align: "right" },
  {
    key: "lastIngestionAt",
    label: "Derniere ingestion",
    render: (row) => formatDate(row.lastIngestionAt),
  },
];

export default function DatasetsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    return params.toString() ? `?${params.toString()}` : "";
  }, [status]);

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<DatasetSummary>(
      `/api/v1/datasets${query}`,
      page,
      PAGE_SIZE,
    );

  const activeCount = (data ?? []).filter(
    (item) => item.status === "active",
  ).length;
  const migratingCount = (data ?? []).filter(
    (item) => item.status === "migrating",
  ).length;
  const totalRows = (data ?? []).reduce((sum, item) => sum + item.rowCount, 0);

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Donnees"
          title="Fichiers importes"
          subtitle="Pilotez l'etat des imports et la fraicheur des jeux de donnees de vos sites."
        />

        {loading ? (
          <StatusBanner variant="info" title="Lecture des imports en cours">
            Synchronisation des statuts de pipeline et des volumes de fichiers.
          </StatusBanner>
        ) : error ? (
          <StatusBanner
            variant="warning"
            title="Vue partiellement indisponible"
          >
            Les imports n'ont pas pu etre charges. Vous pouvez relancer le
            chargement.
          </StatusBanner>
        ) : (
          <StatusBanner
            variant={migratingCount > 0 ? "warning" : "success"}
            title={
              migratingCount > 0
                ? "Migrations de donnees en cours"
                : "Pipeline de donnees stable"
            }
          >
            {migratingCount > 0
              ? `${migratingCount} fichier(s) en migration.`
              : "Tous les fichiers visibles sont actifs et exploitables."}
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Fichiers affiches"
              value={loading ? "..." : data.length}
              status="neutral"
              icon={<FileArchive className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Fichiers actifs"
              value={loading ? "..." : activeCount}
              status={activeCount > 0 ? "good" : "neutral"}
              icon={<Database className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Lignes chargees"
              value={loading ? "..." : totalRows.toLocaleString("fr-FR")}
              status="neutral"
              icon={<Table2 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Total en base"
              value={loading ? "..." : total.toLocaleString("fr-FR")}
              status="neutral"
              icon={<Filter className="h-5 w-5" />}
            />
          </div>
        </DetailCard>

        <DetailCard>
          <div className="flex flex-wrap items-end gap-4">
            <SelectDropdown
              label="Statut"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(next) => {
                setStatus(next);
                setPage(1);
              }}
            />
          </div>
        </DetailCard>

        {error ? (
          <ErrorFallback message={error} onRetry={refetch} />
        ) : loading ? (
          <SkeletonTable rows={10} columns={6} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Database className="h-6 w-6 text-ink-tertiary" />}
            title="Aucun fichier trouve"
            description="Aucun import ne correspond au filtre selectionne."
          />
        ) : (
          <DataTable<DatasetSummary>
            columns={columns}
            data={data}
            getRowKey={(row) => row.id}
            emptyMessage="Aucun fichier importé"
            pagination={{
              page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: setPage,
            }}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-floating)]"
          />
        )}
      </div>
    </PageTransition>
  );
}
