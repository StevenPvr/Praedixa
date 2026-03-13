"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  CoverageAlert,
  DecisionSummary,
  DecisionWorkspace,
  OperationalDecisionCreateRequest,
  OperationalDecision,
} from "@praedixa/shared-types";
import { DataTable, type DataTableColumn } from "@praedixa/ui";
import { useApiGet, useApiGetPaginated, useApiPost } from "@/hooks/use-api";
import { useDecisionConfig } from "@/hooks/use-decision-config";
import { useSiteScope } from "@/lib/site-scope";

const SEVERITY_FILTERS: Array<CoverageAlert["severity"] | "all"> = [
  "all",
  "critical",
  "high",
  "medium",
  "low",
];

function statusLabel(value: string): string {
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

function formatPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function formatPeriod(row: DecisionSummary): string {
  const start = row.targetPeriod?.startDate;
  const end = row.targetPeriod?.endDate;
  if (!start || !end) return "--";
  return `${start} → ${end}`;
}

const HISTORY_COLUMNS: DataTableColumn<DecisionSummary>[] = [
  { key: "title", label: "Decision" },
  {
    key: "status",
    label: "Statut",
    render: (row) => statusLabel(row.status),
  },
  {
    key: "priority",
    label: "Priorite",
    render: (row) => row.priority,
  },
  {
    key: "confidenceScore",
    label: "Confiance",
    align: "right",
    render: (row) => `${Math.round(row.confidenceScore)}%`,
  },
  {
    key: "targetPeriod",
    label: "Periode",
    render: (row) => formatPeriod(row),
  },
];

export default function ActionsPage() {
  const searchParams = useSearchParams();
  const { selectedSiteId, appendSiteParam } = useSiteScope();

  const initialSeverity = searchParams.get("severity");
  const [activeTab, setActiveTab] = useState<"treatment" | "history">(
    "treatment",
  );
  const [severityFilter, setSeverityFilter] = useState<
    CoverageAlert["severity"] | "all"
  >(
    initialSeverity &&
      SEVERITY_FILTERS.includes(initialSeverity as CoverageAlert["severity"])
      ? (initialSeverity as CoverageAlert["severity"])
      : "all",
  );
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const { config: decisionConfig } = useDecisionConfig(selectedSiteId);

  const horizonLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const horizon of decisionConfig?.payload?.horizons ?? []) {
      map.set(horizon.id, horizon.label);
    }
    return map;
  }, [decisionConfig]);

  const formatHorizonLabel = (horizonId: string): string =>
    horizonLabels.get(horizonId) ?? horizonId.toUpperCase();

  const alertsUrl = useMemo(() => {
    const base = "/api/v1/live/coverage-alerts?status=open&page_size=200";
    if (severityFilter === "all") {
      return appendSiteParam(base);
    }
    return appendSiteParam(`${base}&severity=${severityFilter}`);
  }, [appendSiteParam, severityFilter]);

  const {
    data: alerts,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useApiGet<CoverageAlert[]>(alertsUrl);

  const selectedAlert = useMemo(() => {
    if (!alerts || alerts.length === 0) return null;
    if (!selectedAlertId) return alerts[0];
    return alerts.find((item) => item.id === selectedAlertId) ?? alerts[0];
  }, [alerts, selectedAlertId]);

  const workspaceUrl = selectedAlert
    ? `/api/v1/live/decision-workspace/${selectedAlert.id}`
    : null;

  const {
    data: workspace,
    loading: workspaceLoading,
    error: workspaceError,
  } = useApiGet<DecisionWorkspace>(workspaceUrl);

  useEffect(() => {
    if (!workspace) return;
    setSelectedOptionId(workspace.recommendedOptionId ?? null);
  }, [workspace?.alert?.id, workspace?.recommendedOptionId]);

  const requiresOverrideNotes =
    workspace?.recommendedOptionId != null &&
    selectedOptionId != null &&
    selectedOptionId !== workspace.recommendedOptionId;

  useEffect(() => {
    if (!requiresOverrideNotes) {
      setDecisionNotes("");
    }
  }, [requiresOverrideNotes]);

  const {
    mutate: submitDecision,
    loading: submitLoading,
    error: submitError,
  } = useApiPost<OperationalDecisionCreateRequest, OperationalDecision>(
    "/api/v1/operational-decisions",
  );

  const {
    data: historyRows,
    total: historyTotal,
    loading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useApiGetPaginated<DecisionSummary>(
    "/api/v1/decisions?sort_by=created_at&sort_order=desc",
    historyPage,
    20,
  );

  async function handleValidateDecision(): Promise<void> {
    if (!selectedAlert || !selectedOptionId) return;
    const normalizedNotes = decisionNotes.trim();
    if (requiresOverrideNotes && normalizedNotes.length === 0) {
      return;
    }

    const payload: OperationalDecisionCreateRequest = {
      alertId: selectedAlert.id,
      optionId: selectedOptionId,
    };
    if (normalizedNotes.length > 0) {
      payload.notes = normalizedNotes;
    }

    const result = await submitDecision(payload);
    if (result) {
      setSelectedOptionId(null);
      setDecisionNotes("");
      refetchAlerts();
      refetchHistory();
    }
  }

  const options = workspace?.options ?? [];

  return (
    <div className="min-h-full space-y-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-secondary">
          Traitement
        </p>
        <h1 className="text-2xl font-semibold text-ink">Centre Actions</h1>
        <p className="text-sm text-ink-secondary">
          Validez les decisions recommandees puis suivez leur historique.
        </p>
      </section>

      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setActiveTab("treatment")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "treatment"
              ? "bg-primary text-white"
              : "text-ink-secondary hover:bg-surface-sunken"
          }`}
        >
          A traiter
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-primary text-white"
              : "text-ink-secondary hover:bg-surface-sunken"
          }`}
        >
          Historique
        </button>
      </div>

      {activeTab === "treatment" ? (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SEVERITY_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setSeverityFilter(filter);
                  setSelectedAlertId(null);
                  setSelectedOptionId(null);
                }}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  severityFilter === filter
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-card text-ink-secondary"
                }`}
              >
                {filter === "all" ? "Toutes" : filter}
              </button>
            ))}
          </div>

          {alertsError && (
            <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
              {alertsError}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-xl border border-border bg-card p-3">
              <h2 className="text-sm font-semibold text-ink">Alertes</h2>
              {alertsLoading ? (
                <p className="mt-3 text-sm text-ink-secondary">Chargement...</p>
              ) : (alerts?.length ?? 0) === 0 ? (
                <p className="mt-3 text-sm text-ink-secondary">
                  Aucune alerte.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {(alerts ?? []).map((alert) => {
                    const active = selectedAlert?.id === alert.id;
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlertId(alert.id);
                            setSelectedOptionId(null);
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border bg-surface-sunken hover:bg-surface"
                          }`}
                        >
                          <p className="text-sm font-medium text-ink">
                            {alert.siteId} · {alert.alertDate}
                          </p>
                          <p className="text-xs text-ink-secondary">
                            {String(alert.shift).toUpperCase()} ·{" "}
                            {alert.severity} ·
                            {formatHorizonLabel(alert.horizon)} · risque{" "}
                            {formatPercent(alert.pRupture)}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-ink">Diagnostic</h2>
                {!selectedAlert ? (
                  <p className="mt-3 text-sm text-ink-secondary">
                    Selectionnez une alerte.
                  </p>
                ) : (
                  <dl className="mt-3 grid gap-2 text-sm text-ink-secondary sm:grid-cols-2">
                    <div className="rounded-lg bg-surface-sunken px-3 py-2">
                      <dt>Site</dt>
                      <dd className="font-medium text-ink">
                        {selectedAlert.siteId}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-3 py-2">
                      <dt>Risque rupture</dt>
                      <dd className="font-medium text-ink">
                        {formatPercent(selectedAlert.pRupture)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-3 py-2">
                      <dt>Ecart</dt>
                      <dd className="font-medium text-ink">
                        {selectedAlert.gapH.toFixed(1)}h
                      </dd>
                    </div>
                    <div className="rounded-lg bg-surface-sunken px-3 py-2">
                      <dt>Horizon</dt>
                      <dd className="font-medium text-ink">
                        {formatHorizonLabel(selectedAlert.horizon)}
                      </dd>
                    </div>
                  </dl>
                )}
                {workspaceError && (
                  <p className="mt-3 text-sm text-warning-text">
                    {workspaceError}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold text-ink">
                  Options recommandees
                </h2>
                {workspaceLoading ? (
                  <p className="mt-3 text-sm text-ink-secondary">
                    Chargement...
                  </p>
                ) : options.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-secondary">
                    Aucune option disponible.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {options.map((option) => (
                      <li key={option.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedOptionId(option.id)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                            selectedOptionId === option.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-surface-sunken hover:bg-surface"
                          }`}
                        >
                          <p className="text-sm font-medium text-ink">
                            {option.optionType}
                            {workspace?.recommendedOptionId === option.id
                              ? " · recommandee"
                              : ""}
                          </p>
                          <p className="text-xs text-ink-secondary">
                            Cout:{" "}
                            {Math.round(option.coutTotalEur).toLocaleString(
                              "fr-FR",
                            )}
                            € · service: {Math.round(option.serviceAttenduPct)}%
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {requiresOverrideNotes && (
                  <div className="mt-4 space-y-2">
                    <label
                      htmlFor="decision-notes"
                      className="block text-sm font-medium text-ink"
                    >
                      Justification de l'override
                    </label>
                    <textarea
                      id="decision-notes"
                      value={decisionNotes}
                      onChange={(event) => setDecisionNotes(event.target.value)}
                      rows={3}
                      maxLength={1000}
                      placeholder="Expliquez pourquoi vous vous ecartez de la recommandation."
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors focus:border-primary"
                    />
                    <p className="text-xs text-ink-secondary">
                      Une justification est obligatoire pour valider une option
                      differente de la recommandation.
                    </p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      void handleValidateDecision();
                    }}
                    disabled={
                      !selectedOptionId ||
                      submitLoading ||
                      (requiresOverrideNotes &&
                        decisionNotes.trim().length === 0)
                    }
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitLoading ? "Validation..." : "Valider la decision"}
                  </button>
                  {submitError && (
                    <span className="text-sm text-danger-text">
                      {submitError}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-4">
          {historyError && (
            <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
              {historyError}
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-3">
            <DataTable<DecisionSummary>
              columns={HISTORY_COLUMNS}
              data={historyRows}
              getRowKey={(row) => row.id}
              emptyMessage={
                historyLoading ? "Chargement..." : "Aucune decision"
              }
              pagination={{
                page: historyPage,
                pageSize: 20,
                total: historyTotal,
                onPageChange: setHistoryPage,
              }}
            />
          </div>
        </section>
      )}
    </div>
  );
}
