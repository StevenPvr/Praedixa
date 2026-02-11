"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Clock3, Euro, Gauge } from "lucide-react";
import type {
  CoverageAlert,
  DecisionQueueItem,
  DecisionWorkspace,
  OperationalDecision,
  ParetoFrontierResponse,
} from "@praedixa/shared-types";
import { Button, SkeletonCard, SkeletonChart } from "@praedixa/ui";
import { PageHeader } from "@/components/ui/page-header";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { ParetoChart, type ParetoPoint } from "@/components/ui/pareto-chart";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";
import { ErrorFallback } from "@/components/error-fallback";
import { OptimizationPanel } from "@/components/actions/optimization-panel";
import { AnimatedSection } from "@/components/animated-section";
import { getOptionLabel, sortAlertsBySeverity } from "@/lib/scenario-utils";
import { formatSeverity } from "@/lib/formatters";
import { useI18n } from "@/lib/i18n/provider";
import { trackProductEvent } from "@/lib/product-events";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface DecisionBody {
  coverageAlertId: string;
  chosenOptionId: string;
  siteId: string;
  shift: string;
  decisionDate: string;
  horizon: string;
  gapH: number;
}

const SEVERITY_ORDER: Record<CoverageAlert["severity"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function toCoverageAlert(item: DecisionQueueItem): CoverageAlert {
  return {
    id: item.id,
    organizationId: "unknown",
    siteId: item.siteId,
    alertDate: item.alertDate,
    shift: (item.shift as CoverageAlert["shift"]) ?? "am",
    horizon: item.horizon ?? "j7",
    pRupture: item.pRupture ?? 0,
    gapH: item.gapH,
    severity: item.severity,
    status: "open",
    driversJson: item.driversJson ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(value)} EUR`;
}

function sortQueueItems(items: DecisionQueueItem[]): DecisionQueueItem[] {
  return [...items].sort((a, b) => {
    const priorityDelta = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    if (priorityDelta !== 0) return priorityDelta;

    const severityDelta =
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
    if (severityDelta !== 0) return severityDelta;

    return (b.gapH ?? 0) - (a.gapH ?? 0);
  });
}

export default function ActionsPage() {
  const { t } = useI18n();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<
    CoverageAlert["severity"] | "all"
  >("all");

  const { toast } = useToast();
  const alertStartedAtRef = useRef<number | null>(null);
  const hasTrackedQueueOpenRef = useRef(false);

  const {
    data: liveAlerts,
    loading: liveLoading,
    error: liveError,
    refetch: refetchLiveAlerts,
  } = useApiGet<CoverageAlert[]>(
    "/api/v1/live/coverage-alerts?status=open&page_size=200",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const {
    data: queueData,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useApiGet<DecisionQueueItem[]>(
    "/api/v1/coverage-alerts/queue?status=open&limit=50",
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const {
    data: legacyAlerts,
    loading: legacyLoading,
    error: legacyError,
    refetch: refetchLegacyAlerts,
  } = useApiGet<CoverageAlert[]>(
    liveError ? "/api/v1/coverage-alerts?status=open&page_size=200" : null,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const queueMetaById = useMemo(() => {
    const map = new Map<string, DecisionQueueItem>();
    (queueData ?? []).forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [queueData]);

  const alerts = useMemo(() => {
    if (liveAlerts && liveAlerts.length > 0) {
      return sortAlertsBySeverity(liveAlerts);
    }
    if (queueData && queueData.length > 0) {
      return sortQueueItems(queueData).map(toCoverageAlert);
    }
    if (legacyAlerts && legacyAlerts.length > 0) {
      return sortAlertsBySeverity(legacyAlerts);
    }
    return [];
  }, [liveAlerts, queueData, legacyAlerts]);

  const loading = liveLoading || queueLoading || legacyLoading;
  const hasAnyAlertData =
    (liveAlerts?.length ?? 0) > 0 ||
    (queueData?.length ?? 0) > 0 ||
    (legacyAlerts?.length ?? 0) > 0;
  const error = hasAnyAlertData
    ? null
    : (liveError ?? queueError ?? legacyError);

  const filteredAlerts = useMemo(() => {
    if (severityFilter === "all") return alerts;
    return alerts.filter((alert) => alert.severity === severityFilter);
  }, [alerts, severityFilter]);

  const effectiveAlertId =
    selectedAlertId ??
    (filteredAlerts.length > 0 ? filteredAlerts[0].id : null);
  const selectedAlert =
    filteredAlerts.find((alert) => alert.id === effectiveAlertId) ?? null;
  const workspaceAlertId = useMemo(() => {
    if (!selectedAlert) return null;
    if (queueMetaById.has(selectedAlert.id)) return selectedAlert.id;
    const fallback = (queueData ?? []).find(
      (item) =>
        item.siteId === selectedAlert.siteId &&
        item.alertDate === selectedAlert.alertDate &&
        String(item.shift).toLowerCase() ===
          String(selectedAlert.shift).toLowerCase(),
    );
    return fallback?.id ?? null;
  }, [selectedAlert, queueMetaById, queueData]);

  const {
    data: workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useApiGet<DecisionWorkspace>(
    workspaceAlertId ? `/api/v1/decision-workspace/${workspaceAlertId}` : null,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const {
    data: fallbackFrontier,
    loading: fallbackLoading,
    error: fallbackError,
  } = useApiGet<ParetoFrontierResponse>(
    workspaceAlertId && workspaceError
      ? `/api/v1/scenarios/alert/${workspaceAlertId}`
      : null,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const options = workspace?.options ?? fallbackFrontier?.options ?? [];
  const diagnostic = workspace?.diagnostic;

  const {
    mutate,
    loading: submitting,
    error: submitError,
  } = useApiPost<DecisionBody, OperationalDecision>(
    "/api/v1/operational-decisions",
  );

  const paretoPoints: ParetoPoint[] = useMemo(
    () =>
      options.map((option) => ({
        id: option.id,
        label: getOptionLabel(option.optionType),
        cost: option.coutTotalEur,
        service: option.serviceAttenduPct,
        isParetoOptimal: option.isParetoOptimal,
        isRecommended: option.isRecommended,
      })),
    [options],
  );

  useEffect(() => {
    if (!effectiveAlertId) {
      alertStartedAtRef.current = null;
      return;
    }
    alertStartedAtRef.current = Date.now();
  }, [effectiveAlertId]);

  useEffect(() => {
    if (hasTrackedQueueOpenRef.current || loading) return;
    hasTrackedQueueOpenRef.current = true;
    void trackProductEvent("decision_queue_opened", {
      alertCount: alerts.length,
    });
  }, [loading, alerts.length]);

  const handleSelectAlert = useCallback((id: string) => {
    setSelectedAlertId(id);
    setSelectedOptionId(null);
  }, []);

  const handleSelectOption = useCallback(
    (id: string) => {
      setSelectedOptionId(id);
      void trackProductEvent("decision_option_selected", {
        optionId: id,
        alertId: effectiveAlertId,
      });
    },
    [effectiveAlertId],
  );

  const handleValidate = useCallback(async () => {
    if (!selectedAlert || !selectedOptionId) return;

    const body: DecisionBody = {
      coverageAlertId: workspaceAlertId ?? selectedAlert.id,
      chosenOptionId: selectedOptionId,
      siteId: selectedAlert.siteId,
      shift: selectedAlert.shift,
      decisionDate: selectedAlert.alertDate,
      horizon: selectedAlert.horizon ?? "j7",
      gapH: selectedAlert.gapH,
    };

    const result = await mutate(body);
    if (!result) return;

    const elapsedMs =
      alertStartedAtRef.current != null
        ? Date.now() - alertStartedAtRef.current
        : null;

    void trackProductEvent("decision_validated", {
      alertId: selectedAlert.id,
      optionId: selectedOptionId,
      elapsedMs,
    });

    if (typeof elapsedMs === "number") {
      void trackProductEvent("time_to_decision_ms", {
        alertId: selectedAlert.id,
        value: elapsedMs,
      });
    }

    toast({
      variant: "success",
      title: t("actions.successTitle"),
      description: t("actions.successDescription"),
    });

    const currentIndex = filteredAlerts.findIndex(
      (a) => a.id === effectiveAlertId,
    );
    const nextAlert = filteredAlerts[currentIndex + 1];
    if (nextAlert) {
      setSelectedAlertId(nextAlert.id);
      setSelectedOptionId(null);
      return;
    }

    setSelectedAlertId(null);
    setSelectedOptionId(null);
    refetchLiveAlerts();
    refetchQueue();
    refetchLegacyAlerts();
  }, [
    workspaceAlertId,
    selectedAlert,
    selectedOptionId,
    mutate,
    toast,
    t,
    filteredAlerts,
    effectiveAlertId,
    refetchLiveAlerts,
    refetchQueue,
    refetchLegacyAlerts,
  ]);

  const workspaceIsLoading = workspaceLoading || fallbackLoading;
  const workspaceFailure =
    workspaceError && !fallbackFrontier
      ? (fallbackError ?? workspaceError)
      : null;

  const filterOptions: Array<{
    id: CoverageAlert["severity"] | "all";
    label: string;
  }> = [
    { id: "all", label: "Toutes" },
    { id: "critical", label: "Critiques" },
    { id: "high", label: "Hautes" },
    { id: "medium", label: "Moyennes" },
    { id: "low", label: "Basses" },
  ];

  const noAlerts = !loading && filteredAlerts.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t("actions.title")} subtitle={t("actions.subtitle")} />

      {error ? (
        <ErrorFallback
          variant="api"
          message={error}
          onRetry={() => {
            refetchLiveAlerts();
            refetchQueue();
            refetchLegacyAlerts();
          }}
        />
      ) : (
        <AnimatedSection>
          {noAlerts ? (
            <EmptyState
              icon={<CheckCircle className="h-6 w-6 text-green-500" />}
              title={t("actions.queueEmptyTitle")}
              description={t("actions.queueEmptyDescription")}
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_380px]">
              <section aria-label="Selection de l'alerte" className="space-y-3">
                <DetailCard>
                  <h2 className="font-serif text-base font-semibold text-charcoal">
                    {t("actions.queueTitle")}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {filterOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSeverityFilter(option.id);
                          setSelectedAlertId(null);
                        }}
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          severityFilter === option.id
                            ? "bg-amber-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </DetailCard>

                <div className="space-y-2">
                  {loading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <SkeletonCard key={index} />
                    ))}

                  {!loading &&
                    filteredAlerts.map((alert) => {
                      const meta = queueMetaById.get(alert.id);
                      const isActive = alert.id === effectiveAlertId;
                      return (
                        <button
                          key={alert.id}
                          onClick={() => handleSelectAlert(alert.id)}
                          className={`w-full rounded-xl border bg-white p-3 text-left transition-colors ${
                            isActive
                              ? "border-amber-400 shadow-sm"
                              : "border-gray-200 hover:border-amber-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-charcoal">
                                {alert.siteId}
                              </p>
                              <p className="text-xs text-gray-500">
                                {alert.alertDate} — {alert.shift}
                              </p>
                            </div>
                            <Badge
                              variant={
                                alert.severity === "critical" ||
                                alert.severity === "high"
                                  ? "destructive"
                                  : alert.severity === "medium"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {formatSeverity(alert.severity)}
                            </Badge>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div className="rounded-md bg-gray-50 p-2">
                              {t("actions.risk")}:{" "}
                              {`${Math.round((alert.pRupture ?? 0) * 100)}%`}
                            </div>
                            <div className="rounded-md bg-gray-50 p-2">
                              {t("actions.impact")}:{" "}
                              {meta?.estimatedImpactEur
                                ? formatCurrency(meta.estimatedImpactEur)
                                : "--"}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </section>

              <section aria-label="Graphique Pareto" className="space-y-3">
                <DetailCard>
                  <h2 className="font-serif text-base font-semibold text-charcoal">
                    {t("actions.diagnosticTitle")}
                  </h2>
                  {selectedAlert ? (
                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          {selectedAlert.siteId}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          {selectedAlert.shift}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-1">
                          {selectedAlert.alertDate}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Gauge className="h-3.5 w-3.5" />
                            {t("actions.risk")}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-charcoal">
                            {Math.round((selectedAlert.pRupture ?? 0) * 100)}%
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Euro className="h-3.5 w-3.5" />
                            {t("actions.impact")}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-charcoal">
                            {queueMetaById.get(selectedAlert.id)
                              ?.estimatedImpactEur
                              ? formatCurrency(
                                  queueMetaById.get(selectedAlert.id)!
                                    .estimatedImpactEur!,
                                )
                              : "--"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {t("actions.breach")}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-charcoal">
                            {queueMetaById.get(selectedAlert.id)
                              ?.timeToBreachHours != null
                              ? `${queueMetaById.get(selectedAlert.id)?.timeToBreachHours}h`
                              : "--"}
                          </p>
                        </div>
                      </div>

                      {diagnostic?.topDrivers?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {diagnostic.topDrivers.map((driver) => (
                            <span
                              key={driver}
                              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-700"
                            >
                              {driver}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          {selectedAlert.driversJson.length > 0
                            ? selectedAlert.driversJson.join(", ")
                            : t("actions.noWorkspace")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-gray-500">
                      {t("actions.noWorkspace")}
                    </p>
                  )}
                </DetailCard>

                <DetailCard>
                  <h3 className="font-serif text-base font-semibold text-charcoal">
                    {t("actions.paretoTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {t("actions.paretoSubtitle")}
                  </p>
                  <div className="mt-3">
                    {workspaceFailure ? (
                      <ErrorFallback variant="api" message={workspaceFailure} />
                    ) : workspaceIsLoading ? (
                      <SkeletonChart />
                    ) : paretoPoints.length > 0 ? (
                      <ParetoChart
                        points={paretoPoints}
                        onPointClick={(point) => handleSelectOption(point.id)}
                      />
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500">
                        Aucun scenario disponible pour cette alerte.
                      </div>
                    )}
                  </div>
                </DetailCard>
              </section>

              <section
                aria-label="Options d'optimisation"
                className="space-y-3"
              >
                <DetailCard>
                  <h2 className="font-serif text-base font-semibold text-charcoal">
                    {t("actions.optionsTitle")}
                  </h2>
                  <div className="mt-3">
                    <OptimizationPanel
                      options={options}
                      selectedOptionId={selectedOptionId}
                      onSelectOption={handleSelectOption}
                      loading={workspaceIsLoading}
                    />
                  </div>

                  <div className="mt-4 space-y-3">
                    <Button
                      onClick={handleValidate}
                      disabled={!selectedOptionId || submitting}
                      className="w-full bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50"
                    >
                      {submitting
                        ? t("actions.validating")
                        : t("actions.validate")}
                    </Button>
                    {submitError && (
                      <p className="text-sm text-red-600">{submitError}</p>
                    )}
                    {effectiveAlertId && (
                      <Link
                        href={`/previsions?alert=${encodeURIComponent(
                          effectiveAlertId,
                        )}`}
                        className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 hover:text-amber-600"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Ouvrir l'analyse detaillee de cette alerte
                      </Link>
                    )}
                  </div>
                </DetailCard>
              </section>
            </div>
          )}
        </AnimatedSection>
      )}
    </div>
  );
}
