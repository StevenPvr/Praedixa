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
import { Card } from "@/components/ui/card";
import { DetailCard } from "@/components/ui/detail-card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/metric-card";
import { ParetoChart, type ParetoPoint } from "@/components/ui/pareto-chart";
import { useApiGet, useApiPost } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/empty-state";
import { ErrorFallback } from "@/components/error-fallback";
import { StatusBanner } from "@/components/status-banner";
import { OptimizationPanel } from "@/components/actions/optimization-panel";
import { AnimatedSection } from "@/components/animated-section";
import { PageTransition } from "@/components/page-transition";
import {
  getOptionLabel,
  sortAlertsBySeverity,
  SEVERITY_ORDER,
} from "@/lib/scenario-utils";
import {
  formatSeverity,
  formatCurrency,
  getSeverityBadgeVariant,
} from "@/lib/formatters";
import { useI18n } from "@/lib/i18n/provider";
import { trackProductEvent } from "@/lib/product-events";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";
import { useSiteScope } from "@/lib/site-scope";

interface DecisionBody {
  coverageAlertId: string;
  chosenOptionId: string;
  siteId: string;
  shift: string;
  decisionDate: string;
  horizon: string;
  gapH: number;
}

const FILTER_OPTIONS: Array<{
  id: CoverageAlert["severity"] | "all";
  label: string;
}> = [
  { id: "all", label: "Toutes" },
  { id: "critical", label: "Critiques" },
  { id: "high", label: "Hautes" },
  { id: "medium", label: "Moyennes" },
  { id: "low", label: "Basses" },
];
const MAX_VISIBLE_ALERTS = 50;

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

function sortQueueItems(items: DecisionQueueItem[]): DecisionQueueItem[] {
  return [...items].toSorted((a, b) => {
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
  const { appendSiteParam } = useSiteScope();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<
    CoverageAlert["severity"] | "all"
  >("all");

  const { toast } = useToast();
  const alertStartedAtRef = useRef<number | null>(null);
  const hasTrackedQueueOpenRef = useRef(false);

  const liveAlertsUrl = useMemo(
    () =>
      appendSiteParam("/api/v1/live/coverage-alerts?status=open&page_size=200"),
    [appendSiteParam],
  );
  const queueUrl = useMemo(
    () =>
      appendSiteParam(
        "/api/v1/live/coverage-alerts/queue?status=open&limit=50",
      ),
    [appendSiteParam],
  );

  const {
    data: liveAlerts,
    loading: liveLoading,
    error: liveError,
    refetch: refetchLiveAlerts,
  } = useApiGet<CoverageAlert[]>(liveAlertsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const {
    data: queueData,
    loading: queueLoading,
    error: queueError,
    refetch: refetchQueue,
  } = useApiGet<DecisionQueueItem[]>(queueUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  const queueMetaById = useMemo(() => {
    const map = new Map<string, DecisionQueueItem>();
    (queueData ?? []).forEach((item) => {
      map.set(item.id, item);
    });
    return map;
  }, [queueData]);

  const alerts = useMemo(() => {
    if (queueData) {
      return sortQueueItems(queueData).map(toCoverageAlert);
    }
    if (queueError && liveAlerts && liveAlerts.length > 0) {
      return sortAlertsBySeverity(liveAlerts);
    }
    return [];
  }, [liveAlerts, queueData, queueError]);

  const loading = liveLoading || queueLoading;
  const hasAnyAlertData =
    (liveAlerts?.length ?? 0) > 0 || (queueData?.length ?? 0) > 0;
  const error = hasAnyAlertData ? null : (liveError ?? queueError);

  const filteredAlerts = useMemo(() => {
    const matching =
      severityFilter === "all"
        ? alerts
        : alerts.filter((alert) => alert.severity === severityFilter);
    return matching.slice(0, MAX_VISIBLE_ALERTS);
  }, [alerts, severityFilter]);
  const filteredAlertsTotal = useMemo(
    () =>
      severityFilter === "all"
        ? alerts.length
        : alerts.filter((alert) => alert.severity === severityFilter).length,
    [alerts, severityFilter],
  );

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
    workspaceAlertId
      ? `/api/v1/live/decision-workspace/${workspaceAlertId}`
      : null,
    { pollInterval: LIVE_DATA_POLL_INTERVAL_MS },
  );

  const {
    data: fallbackFrontier,
    loading: fallbackLoading,
    error: fallbackError,
  } = useApiGet<ParetoFrontierResponse>(
    workspaceAlertId && workspaceError
      ? `/api/v1/live/scenarios/alert/${workspaceAlertId}`
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
  ]);

  const workspaceIsLoading = workspaceLoading || fallbackLoading;
  const workspaceFailure =
    workspaceError && !fallbackFrontier
      ? (fallbackError ?? workspaceError)
      : null;

  const noAlerts = !loading && filteredAlertsTotal === 0;
  const criticalCount = alerts.filter(
    (alert) => alert.severity === "critical",
  ).length;
  const highCount = alerts.filter((alert) => alert.severity === "high").length;
  const exposedSites = new Set(alerts.map((alert) => alert.siteId)).size;
  const avgGap =
    alerts.length > 0
      ? alerts.reduce((sum, alert) => sum + alert.gapH, 0) / alerts.length
      : 0;

  return (
    <PageTransition>
      <div className="min-h-full space-y-12">
        <PageHeader
          eyebrow="Decider"
          title={t("actions.title")}
          subtitle={t("actions.subtitle")}
        />

        {!error &&
          (criticalCount > 0 ? (
            <StatusBanner variant="danger" title="Action immediate recommandee">
              {criticalCount} alerte(s) critique(s) et {highCount} alerte(s)
              elevee(s) sont en file active.
            </StatusBanner>
          ) : alerts.length > 0 ? (
            <StatusBanner variant="warning" title="File active sous controle">
              {alerts.length} alerte(s) ouvertes sur {exposedSites} site(s).
              Priorisez les dossiers avec rupture imminente.
            </StatusBanner>
          ) : (
            <StatusBanner variant="success" title="Aucune alerte a traiter">
              La file de decision est vide. Les operations restent sous controle
              pour l'instant.
            </StatusBanner>
          ))}

        {!error && (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Alertes ouvertes"
              value={loading ? "..." : alerts.length}
              status={
                criticalCount > 0
                  ? "danger"
                  : alerts.length > 0
                    ? "warning"
                    : "good"
              }
            />
            <MetricCard
              label="Sites exposes"
              value={loading ? "..." : exposedSites}
              status={exposedSites > 0 ? "warning" : "good"}
            />
            <MetricCard
              label="Criticite haute"
              value={loading ? "..." : criticalCount + highCount}
              status={
                criticalCount > 0
                  ? "danger"
                  : highCount > 0
                    ? "warning"
                    : "good"
              }
            />
            <MetricCard
              label="Ecart moyen"
              value={loading ? "..." : `${avgGap.toFixed(1)} h`}
              status={avgGap > 6 ? "warning" : "neutral"}
            />
          </div>
        )}

        {error ? (
          <ErrorFallback
            variant="api"
            message={error}
            onRetry={() => {
              refetchLiveAlerts();
              refetchQueue();
            }}
          />
        ) : (
          <AnimatedSection>
            {noAlerts ? (
              <EmptyState
                icon={<CheckCircle className="h-6 w-6 text-success" />}
                title={t("actions.queueEmptyTitle")}
                description={t("actions.queueEmptyDescription")}
              />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_380px]">
                <section
                  aria-label="Selection de l'alerte"
                  className="space-y-3"
                >
                  <DetailCard>
                    <h2 className="font-sans text-base font-semibold text-ink">
                      {t("actions.queueTitle")}
                    </h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setSeverityFilter(option.id);
                            setSelectedAlertId(null);
                          }}
                          aria-pressed={severityFilter === option.id}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition-all duration-normal ${
                            severityFilter === option.id
                              ? "bg-primary text-white shadow-sm"
                              : "bg-surface-alt text-ink-secondary hover:bg-surface-alt/80"
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </DetailCard>

                  <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
                    {!loading &&
                      filteredAlertsTotal > filteredAlerts.length && (
                        <p className="rounded-lg border border-border bg-surface-sunken px-3 py-2 text-caption text-ink-secondary">
                          Affichage limite aux {MAX_VISIBLE_ALERTS} alertes les
                          plus prioritaires.
                        </p>
                      )}
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
                            type="button"
                            onClick={() => handleSelectAlert(alert.id)}
                            aria-pressed={isActive}
                            className={`w-full rounded-lg border bg-card p-3.5 text-left transition-all duration-fast ${
                              isActive
                                ? "border-primary/40 shadow-raised"
                                : "border-border hover:-translate-y-0.5 hover:border-border-hover hover:shadow-floating"
                            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-title-sm text-ink">
                                  {alert.siteId}
                                </p>
                                <p className="text-caption text-ink-secondary">
                                  {alert.alertDate} — {alert.shift}
                                </p>
                              </div>
                              <Badge
                                variant={getSeverityBadgeVariant(
                                  alert.severity,
                                )}
                              >
                                {formatSeverity(alert.severity)}
                              </Badge>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-caption text-ink-secondary">
                              <div className="rounded-md bg-surface-sunken p-2">
                                {t("actions.risk")}:{" "}
                                {`${Math.round((alert.pRupture ?? 0) * 100)}%`}
                              </div>
                              <div className="rounded-md bg-surface-sunken p-2">
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
                    <h2 className="text-heading-sm text-ink">
                      {t("actions.diagnosticTitle")}
                    </h2>
                    {selectedAlert ? (
                      (() => {
                        const selectedMeta = queueMetaById.get(
                          selectedAlert.id,
                        );
                        return (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-body-sm text-ink-secondary">
                              <span className="rounded-md bg-surface-sunken px-2 py-1">
                                {selectedAlert.siteId}
                              </span>
                              <span className="rounded-md bg-surface-sunken px-2 py-1">
                                {selectedAlert.shift}
                              </span>
                              <span className="rounded-md bg-surface-sunken px-2 py-1">
                                {selectedAlert.alertDate}
                              </span>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-3">
                              <div className="rounded-lg border border-border bg-surface-sunken p-3">
                                <div className="flex items-center gap-2 text-caption text-ink-secondary">
                                  <Gauge className="h-3.5 w-3.5" />
                                  {t("actions.risk")}
                                </div>
                                <p className="mt-1 text-title-sm text-ink">
                                  {Math.round(
                                    (selectedAlert.pRupture ?? 0) * 100,
                                  )}
                                  %
                                </p>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-sunken p-3">
                                <div className="flex items-center gap-2 text-caption text-ink-secondary">
                                  <Euro className="h-3.5 w-3.5" />
                                  {t("actions.impact")}
                                </div>
                                <p className="mt-1 text-title-sm text-ink">
                                  {selectedMeta?.estimatedImpactEur
                                    ? formatCurrency(
                                        selectedMeta.estimatedImpactEur,
                                      )
                                    : "--"}
                                </p>
                              </div>
                              <div className="rounded-lg border border-border bg-surface-sunken p-3">
                                <div className="flex items-center gap-2 text-caption text-ink-secondary">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  {t("actions.breach")}
                                </div>
                                <p className="mt-1 text-title-sm text-ink">
                                  {selectedMeta?.timeToBreachHours != null
                                    ? `${selectedMeta.timeToBreachHours}h`
                                    : "--"}
                                </p>
                              </div>
                            </div>

                            {diagnostic?.topDrivers?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {diagnostic.topDrivers.map((driver) => (
                                  <span
                                    key={driver}
                                    className="rounded-full bg-primary/8 px-2.5 py-0.5 text-caption font-medium text-primary"
                                  >
                                    {driver}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-body-sm text-ink-secondary">
                                {selectedAlert.driversJson.length > 0
                                  ? selectedAlert.driversJson.join(", ")
                                  : t("actions.noWorkspace")}
                              </p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <p className="mt-3 text-body-sm text-ink-secondary">
                        {t("actions.noWorkspace")}
                      </p>
                    )}
                  </DetailCard>

                  <DetailCard>
                    <h3 className="text-heading-sm text-ink">
                      {t("actions.paretoTitle")}
                    </h3>
                    <p className="mt-1 text-body-sm text-ink-secondary">
                      {t("actions.paretoSubtitle")}
                    </p>
                    <div className="mt-3">
                      {workspaceFailure ? (
                        <ErrorFallback
                          variant="api"
                          message={workspaceFailure}
                        />
                      ) : workspaceIsLoading ? (
                        <SkeletonChart />
                      ) : paretoPoints.length > 0 ? (
                        <ParetoChart
                          points={paretoPoints}
                          onPointClick={(point) => handleSelectOption(point.id)}
                        />
                      ) : (
                        <div className="rounded-lg border border-dashed border-border bg-surface-sunken p-6 text-body-sm text-ink-secondary">
                          Aucun scenario disponible pour cette alerte.
                        </div>
                      )}
                    </div>
                  </DetailCard>
                </section>

                <section
                  aria-label="Options d'optimisation"
                  className="space-y-3 lg:col-span-2 xl:col-span-1"
                >
                  <Card variant="premium" className="p-6">
                    <h2 className="text-heading-sm text-ink">
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
                        className="w-full"
                      >
                        {submitting
                          ? t("actions.validating")
                          : t("actions.validate")}
                      </Button>
                      {submitError && (
                        <p className="text-body-sm text-danger-text">
                          {submitError}
                        </p>
                      )}
                      {effectiveAlertId && (
                        <Link
                          href={`/previsions?alert=${encodeURIComponent(
                            effectiveAlertId,
                          )}`}
                          className="inline-flex items-center gap-2 text-caption font-semibold text-primary transition-colors duration-fast hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Ouvrir l&apos;analyse détaillée de cette alerte
                        </Link>
                      )}
                    </div>
                  </Card>
                </section>
              </div>
            )}
          </AnimatedSection>
        )}
      </div>
    </PageTransition>
  );
}
