"use client";

import { useMemo, useState } from "react";
import type { DecisionSummary } from "@praedixa/shared-types";
import { CheckCircle2, Clock3, Scale, Target } from "lucide-react";
import { DataTable, type DataTableColumn, SkeletonTable } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { StatusBanner } from "@/components/status-banner";
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
  { value: "pending_review", label: "En revue" },
  { value: "approved", label: "Approuvee" },
  { value: "implemented", label: "Implantee" },
  { value: "rejected", label: "Rejetee" },
  { value: "expired", label: "Expiree" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "", label: "Toutes les priorites" },
  { value: "critical", label: "Critique" },
  { value: "high", label: "Elevee" },
  { value: "medium", label: "Moderee" },
  { value: "low", label: "Faible" },
];

function mapDecisionStatus(value: string): string {
  switch (value) {
    case "pending_review":
      return "En revue";
    case "approved":
      return "Approuvee";
    case "implemented":
      return "Implantee";
    case "rejected":
      return "Rejetee";
    case "expired":
      return "Expiree";
    default:
      return value;
  }
}

function mapPriority(value: string): string {
  switch (value) {
    case "critical":
      return "Critique";
    case "high":
      return "Elevee";
    case "medium":
      return "Moderee";
    case "low":
      return "Faible";
    default:
      return value;
  }
}

function priorityVariant(
  value: string,
): "danger" | "warning" | "info" | "outline" {
  switch (value) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    default:
      return "outline";
  }
}

const columns: DataTableColumn<DecisionSummary>[] = [
  { key: "title", label: "Decision" },
  {
    key: "priority",
    label: "Priorite",
    render: (row) => (
      <Badge variant={priorityVariant(row.priority)}>
        {mapPriority(row.priority)}
      </Badge>
    ),
  },
  {
    key: "status",
    label: "Statut",
    render: (row) => mapDecisionStatus(row.status),
  },
  { key: "type", label: "Type" },
  {
    key: "confidenceScore",
    label: "Confiance",
    align: "right",
    render: (row) => `${Math.round(row.confidenceScore)}%`,
  },
  {
    key: "estimatedCost",
    label: "Cout estime",
    align: "right",
    render: (row) =>
      typeof row.estimatedCost === "number"
        ? row.estimatedCost.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          })
        : "—",
  },
  {
    key: "targetPeriod",
    label: "Periode cible",
    render: (row) =>
      `${row.targetPeriod.startDate} → ${row.targetPeriod.endDate}`,
  },
];

export default function ActionsHistoriquePage() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    params.set("sort_by", "created_at");
    params.set("sort_order", "desc");
    return `?${params.toString()}`;
  }, [status, priority]);

  const { data, total, loading, error, refetch } =
    useApiGetPaginated<DecisionSummary>(
      `/api/v1/decisions${query}`,
      page,
      PAGE_SIZE,
    );

  const implementedCount = data.filter(
    (decision) => decision.status === "implemented",
  ).length;
  const pendingCount = data.filter(
    (decision) => decision.status === "pending_review",
  ).length;

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Traitement"
          title="Decisions passees"
          subtitle="Auditez les decisions prises, leur priorite et leur niveau de confiance."
        />

        {loading ? (
          <StatusBanner variant="info" title="Consolidation en cours">
            Recuperation des decisions recentes de votre file de traitement.
          </StatusBanner>
        ) : (
          <StatusBanner
            variant={pendingCount > 0 ? "warning" : "success"}
            title={
              pendingCount > 0
                ? "Des decisions restent en revue"
                : "Boucle de suivi stable"
            }
          >
            {pendingCount > 0
              ? `${pendingCount} decision(s) attendent encore une revue finale.`
              : "Toutes les decisions affichees sont validees ou appliquees."}
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Decisions affichees"
              value={loading ? "..." : data.length}
              status="neutral"
              icon={<Scale className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Implantees"
              value={loading ? "..." : implementedCount}
              status={implementedCount > 0 ? "good" : "neutral"}
              icon={<CheckCircle2 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="En revue"
              value={loading ? "..." : pendingCount}
              status={pendingCount > 0 ? "warning" : "good"}
              icon={<Clock3 className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Total resultats"
              value={loading ? "..." : total}
              status="neutral"
              icon={<Target className="h-5 w-5" />}
            />
          </div>
        </DetailCard>

        <DetailCard>
          <div className="flex flex-wrap items-end gap-4">
            <SelectDropdown
              label="Statut"
              options={STATUS_OPTIONS}
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            />
            <SelectDropdown
              label="Priorite"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(value) => {
                setPriority(value);
                setPage(1);
              }}
            />
          </div>
        </DetailCard>

        {error ? (
          <ErrorFallback message={error} onRetry={refetch} />
        ) : loading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Scale className="h-6 w-6 text-ink-tertiary" />}
            title="Aucune decision trouvee"
            description="Aucune decision n'est disponible avec les filtres en cours."
          />
        ) : (
          <DataTable<DecisionSummary>
            columns={columns}
            data={data}
            getRowKey={(row) => row.id}
            emptyMessage="Aucune decision"
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
