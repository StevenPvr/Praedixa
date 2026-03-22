"use client";

import type { CoverageAlert, ScenarioOption } from "@praedixa/shared-types";

import { SEVERITY_FILTERS } from "./use-actions-page-model";

interface ActionsTreatmentSectionProps {
  severityFilter: CoverageAlert["severity"] | "all";
  setSeverityFilter: (filter: CoverageAlert["severity"] | "all") => void;
  alerts: CoverageAlert[] | null | undefined;
  alertsLoading: boolean;
  alertsError: string | null;
  selectedAlert: CoverageAlert | null;
  workspaceLoading: boolean;
  workspaceError: string | null;
  recommendedOptionId: string | null | undefined;
  options: ScenarioOption[];
  selectedOptionId: string | null;
  setSelectedOptionId: (optionId: string | null) => void;
  decisionNotes: string;
  setDecisionNotes: (notes: string) => void;
  requiresOverrideNotes: boolean;
  submitLoading: boolean;
  submitError: string | null;
  formatHorizonLabel: (horizonId: string) => string;
  handleValidateDecision: () => Promise<void>;
  resetAlertSelection: () => void;
  selectAlert: (alertId: string) => void;
}

function formatPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function AlertsList({
  severityFilter,
  setSeverityFilter,
  alerts,
  alertsLoading,
  alertsError,
  selectedAlert,
  formatHorizonLabel,
  resetAlertSelection,
  selectAlert,
}: Pick<
  ActionsTreatmentSectionProps,
  | "severityFilter"
  | "setSeverityFilter"
  | "alerts"
  | "alertsLoading"
  | "alertsError"
  | "selectedAlert"
  | "formatHorizonLabel"
  | "resetAlertSelection"
  | "selectAlert"
>) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {SEVERITY_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => {
              setSeverityFilter(filter);
              resetAlertSelection();
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

      {alertsError ? (
        <div className="rounded-xl border border-warning-light bg-warning-light/20 px-4 py-3 text-sm text-warning-text">
          {alertsError}
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold text-ink">Alertes</h2>
        {alertsLoading ? (
          <p className="mt-3 text-sm text-ink-secondary">Chargement...</p>
        ) : (alerts?.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-ink-secondary">Aucune alerte.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(alerts ?? []).map((alert) => {
              const active = selectedAlert?.id === alert.id;
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => selectAlert(alert.id)}
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
                      {String(alert.shift).toUpperCase()} · {alert.severity} ·{" "}
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
    </>
  );
}

function DiagnosticCard({
  selectedAlert,
  workspaceError,
  formatHorizonLabel,
}: Pick<
  ActionsTreatmentSectionProps,
  "selectedAlert" | "workspaceError" | "formatHorizonLabel"
>) {
  return (
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
            <dd className="font-medium text-ink">{selectedAlert.siteId}</dd>
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
      {workspaceError ? (
        <p className="mt-3 text-sm text-warning-text">{workspaceError}</p>
      ) : null}
    </div>
  );
}

function OptionsCard({
  workspaceLoading,
  options,
  recommendedOptionId,
  selectedOptionId,
  setSelectedOptionId,
  decisionNotes,
  setDecisionNotes,
  requiresOverrideNotes,
  submitLoading,
  submitError,
  handleValidateDecision,
}: Pick<
  ActionsTreatmentSectionProps,
  | "workspaceLoading"
  | "options"
  | "recommendedOptionId"
  | "selectedOptionId"
  | "setSelectedOptionId"
  | "decisionNotes"
  | "setDecisionNotes"
  | "requiresOverrideNotes"
  | "submitLoading"
  | "submitError"
  | "handleValidateDecision"
>) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-ink">Options recommandees</h2>
      {workspaceLoading ? (
        <p className="mt-3 text-sm text-ink-secondary">Chargement...</p>
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
                  {recommendedOptionId === option.id ? " · recommandee" : ""}
                </p>
                <p className="text-xs text-ink-secondary">
                  Cout:{" "}
                  {Math.round(option.coutTotalEur).toLocaleString("fr-FR")}€
                  {" · "}service: {Math.round(option.serviceAttenduPct)}%
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {requiresOverrideNotes ? (
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
            Une justification est obligatoire pour valider une option differente
            de la recommandation.
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            handleValidateDecision().catch(() => undefined);
          }}
          disabled={
            !selectedOptionId ||
            submitLoading ||
            (requiresOverrideNotes && decisionNotes.trim().length === 0)
          }
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLoading ? "Validation..." : "Valider la decision"}
        </button>
        {submitError ? (
          <span className="text-sm text-danger-text">{submitError}</span>
        ) : null}
      </div>
    </div>
  );
}

export function ActionsTreatmentSection(props: ActionsTreatmentSectionProps) {
  return (
    <section className="space-y-4">
      <AlertsList {...props} />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div />
        <div className="space-y-4">
          <DiagnosticCard
            selectedAlert={props.selectedAlert}
            workspaceError={props.workspaceError}
            formatHorizonLabel={props.formatHorizonLabel}
          />
          <OptionsCard
            workspaceLoading={props.workspaceLoading}
            options={props.options}
            recommendedOptionId={props.recommendedOptionId}
            selectedOptionId={props.selectedOptionId}
            setSelectedOptionId={props.setSelectedOptionId}
            decisionNotes={props.decisionNotes}
            setDecisionNotes={props.setDecisionNotes}
            requiresOverrideNotes={props.requiresOverrideNotes}
            submitLoading={props.submitLoading}
            submitError={props.submitError}
            handleValidateDecision={props.handleValidateDecision}
          />
        </div>
      </div>
    </section>
  );
}
