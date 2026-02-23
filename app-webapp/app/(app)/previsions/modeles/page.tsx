"use client";

import { useMemo } from "react";
import { Activity, Cpu, Gauge, RefreshCw } from "lucide-react";
import { DataTable, type DataTableColumn, SkeletonTable } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBanner } from "@/components/status-banner";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";
import { PageTransition } from "@/components/page-transition";
import { useSiteScope } from "@/lib/site-scope";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface MlMonitoringSummary {
  latestModelVersion: string | null;
  latestDate: string | null;
  avgMapePct: number | null;
  avgDataDriftScore: number | null;
  avgConceptDriftScore: number | null;
  avgFeatureCoveragePct: number | null;
  avgInferenceLatencyMs: number | null;
  retrainRecommendedDays: number;
}

interface MlMonitoringPoint {
  date: string;
  mapePct: number | null;
  dataDriftScore: number | null;
  conceptDriftScore: number | null;
  featureCoveragePct: number | null;
  inferenceLatencyMs: number | null;
  retrainRecommended: boolean;
}

function formatMetric(value: number | null, digits = 2): string {
  if (value == null) return "—";
  return value.toFixed(digits);
}

const columns: DataTableColumn<MlMonitoringPoint>[] = [
  { key: "date", label: "Date" },
  {
    key: "mapePct",
    label: "MAPE (%)",
    align: "right",
    render: (row) => formatMetric(row.mapePct),
  },
  {
    key: "dataDriftScore",
    label: "Data drift",
    align: "right",
    render: (row) => formatMetric(row.dataDriftScore, 4),
  },
  {
    key: "conceptDriftScore",
    label: "Concept drift",
    align: "right",
    render: (row) => formatMetric(row.conceptDriftScore, 4),
  },
  {
    key: "featureCoveragePct",
    label: "Feature coverage (%)",
    align: "right",
    render: (row) => formatMetric(row.featureCoveragePct),
  },
  {
    key: "inferenceLatencyMs",
    label: "Latence (ms)",
    align: "right",
    render: (row) => formatMetric(row.inferenceLatencyMs),
  },
  {
    key: "retrainRecommended",
    label: "Retrain",
    render: (row) => (row.retrainRecommended ? "Oui" : "Non"),
  },
];

export default function PrevisionsModelesPage() {
  const { appendSiteParam } = useSiteScope();

  const summaryUrl = useMemo(
    () => appendSiteParam("/api/v1/live/ml-monitoring/summary"),
    [appendSiteParam],
  );
  const driftUrl = useMemo(
    () => appendSiteParam("/api/v1/live/ml-monitoring/drift?limit_days=60"),
    [appendSiteParam],
  );

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useApiGet<MlMonitoringSummary>(summaryUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: drift,
    loading: driftLoading,
    error: driftError,
    refetch: refetchDrift,
  } = useApiGet<MlMonitoringPoint[]>(driftUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const hasCriticalDrift =
    (summary?.avgDataDriftScore ?? 0) > 0.7 ||
    (summary?.avgConceptDriftScore ?? 0) > 0.7;

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Anticipation"
          title="Monitoring IA/ML"
          subtitle="Suivez la qualite predictive, le drift et la latence du moteur de prevision."
        />

        {summaryLoading ? (
          <StatusBanner
            variant="info"
            title="Monitoring en cours de synchronisation"
          >
            Consolidation des metriques de qualite et de drift.
          </StatusBanner>
        ) : hasCriticalDrift ? (
          <StatusBanner variant="warning" title="Derive modele a surveiller">
            Les scores de drift depassent le seuil de confort.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success" title="Modele sous controle">
            Les signaux de qualite sont dans une zone stable.
          </StatusBanner>
        )}

        <DetailCard>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Version active"
              value={
                summaryLoading ? "..." : (summary?.latestModelVersion ?? "n/a")
              }
              status="neutral"
              icon={<Cpu className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="MAPE moyenne"
              value={
                summaryLoading
                  ? "..."
                  : `${formatMetric(summary?.avgMapePct ?? null)}%`
              }
              status={(summary?.avgMapePct ?? 100) <= 15 ? "good" : "warning"}
              icon={<Gauge className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Drift data moyen"
              value={
                summaryLoading
                  ? "..."
                  : formatMetric(summary?.avgDataDriftScore ?? null, 4)
              }
              status={
                (summary?.avgDataDriftScore ?? 0) <= 0.5 ? "good" : "warning"
              }
              icon={<Activity className="h-5 w-5" />}
              animate
            />
            <MetricCard
              label="Jours retrain recommandes"
              value={
                summaryLoading ? "..." : (summary?.retrainRecommendedDays ?? 0)
              }
              status={
                (summary?.retrainRecommendedDays ?? 0) > 0 ? "warning" : "good"
              }
              icon={<RefreshCw className="h-5 w-5" />}
              animate
            />
          </div>
        </DetailCard>

        {summaryError || driftError ? (
          <ErrorFallback
            message={summaryError ?? driftError ?? "Erreur inconnue"}
            onRetry={() => {
              refetchSummary();
              refetchDrift();
            }}
          />
        ) : driftLoading ? (
          <SkeletonTable rows={10} columns={7} />
        ) : (drift ?? []).length === 0 ? (
          <EmptyState
            icon={<Cpu className="h-6 w-6 text-ink-tertiary" />}
            title="Pas de metrique monitoring"
            description="Aucune metrique de monitoring n'est disponible pour le scope courant."
          />
        ) : (
          <DataTable<MlMonitoringPoint>
            columns={columns}
            data={drift ?? []}
            getRowKey={(row) => row.date}
            emptyMessage="Aucune metrique"
            stickyHeader
            className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-card shadow-[var(--shadow-floating)]"
          />
        )}
      </div>
    </PageTransition>
  );
}
