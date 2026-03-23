"use client";

import type { ResolvedDecisionEngineConfig } from "@praedixa/shared-types";
import { Button } from "@praedixa/ui";

import { compactVersionId, formatDateTime } from "./config-operations";
import type {
  DecisionConfigDraftState,
  DecisionConfigRecomputeResponse,
} from "./config-types";

type DecisionConfigMetricsProps = {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
};

type MetricCardProps = {
  label: string;
  value: string;
  mono?: boolean;
};

type HorizonListProps = {
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
};

type InputFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "datetime-local";
  placeholder?: string;
};

type ScheduleVersionFormProps = {
  effectiveAtInput: string;
  changeReason: string;
  canManageConfig: boolean;
  actionLoading: string | null;
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  onEffectiveAtChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSchedule: () => void;
};

type PayloadEditorProps = {
  payloadDraft: string;
  canManageConfig: boolean;
  onChange: (value: string) => void;
};

type RecomputeScenarioFormProps = {
  recomputeAlertId: string;
  canManageConfig: boolean;
  actionLoading: string | null;
  onChange: (value: string) => void;
  onRecompute: () => void;
};

type LastRecomputeSummaryProps = {
  lastRecompute: DecisionConfigRecomputeResponse | null;
};

type DecisionConfigSummaryProps = {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
};

type DecisionConfigControlsProps = {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  draft: DecisionConfigDraftState;
  canManageConfig: boolean;
  actionLoading: string | null;
  onSchedule: () => void;
  onRecompute: () => void;
};

function DecisionConfigMetrics(props: Readonly<DecisionConfigMetricsProps>) {
  const { resolvedConfig, activeHorizon } = props;
  const activeCount = (resolvedConfig?.payload?.horizons ?? []).filter(
    (horizon) => horizon.active,
  ).length;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        label="Version active"
        value={
          resolvedConfig ? compactVersionId(resolvedConfig.versionId) : "-"
        }
        mono
      />
      <MetricCard
        label="Horizon par defaut"
        value={
          activeHorizon
            ? `${activeHorizon.label} (${activeHorizon.days} jours)`
            : "-"
        }
      />
      <MetricCard label="Horizon actifs" value={String(activeCount)} />
      <MetricCard
        label="Version suivante"
        value={
          resolvedConfig?.nextVersion
            ? compactVersionId(resolvedConfig.nextVersion.id)
            : "-"
        }
        mono
      />
    </div>
  );
}

function MetricCard(props: Readonly<MetricCardProps>) {
  const { label, value, mono = false } = props;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p
        className={
          mono ? "font-mono text-sm text-ink" : "text-sm font-medium text-ink"
        }
      >
        {value}
      </p>
    </div>
  );
}

function HorizonList(props: Readonly<HorizonListProps>) {
  const { horizons } = props;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">Horizons configures</p>
      <ul className="space-y-1 text-sm text-ink-secondary">
        {horizons.map((horizon) => (
          <li key={horizon.id}>
            {horizon.label} ({horizon.id}) · {horizon.days} jours · rank{" "}
            {horizon.rank}
            {horizon.active ? " · actif" : " · inactif"}
            {horizon.isDefault ? " · defaut" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InputField(props: Readonly<InputFieldProps>) {
  const {
    label,
    value,
    onChange,
    disabled,
    type = "text",
    placeholder,
  } = props;
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function ScheduleVersionForm(props: Readonly<ScheduleVersionFormProps>) {
  const {
    effectiveAtInput,
    changeReason,
    canManageConfig,
    actionLoading,
    resolvedConfig,
    onEffectiveAtChange,
    onReasonChange,
    onSchedule,
  } = props;
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
      <InputField
        label="Date d'effet"
        value={effectiveAtInput}
        disabled={!canManageConfig}
        type="datetime-local"
        onChange={onEffectiveAtChange}
      />
      <InputField
        label="Motif (optionnel)"
        value={changeReason}
        disabled={!canManageConfig}
        placeholder="Mise a jour des poids recommandation"
        onChange={onReasonChange}
      />
      <div className="flex items-end">
        <Button
          type="button"
          onClick={onSchedule}
          disabled={
            !canManageConfig || !resolvedConfig || actionLoading != null
          }
        >
          Planifier version
        </Button>
      </div>
    </div>
  );
}

function PayloadEditor(props: Readonly<PayloadEditorProps>) {
  const { payloadDraft, canManageConfig, onChange } = props;
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-ink">
        Payload decision-config (JSON)
      </span>
      <textarea
        value={payloadDraft}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        disabled={!canManageConfig}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-ink outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

function RecomputeScenarioForm(props: Readonly<RecomputeScenarioFormProps>) {
  const {
    recomputeAlertId,
    canManageConfig,
    actionLoading,
    onChange,
    onRecompute,
  } = props;
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
      <InputField
        label="Recalcul scenario alerte"
        value={recomputeAlertId}
        disabled={!canManageConfig}
        placeholder="alt-001"
        onChange={onChange}
      />
      <div className="flex items-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onRecompute}
          disabled={!canManageConfig || actionLoading != null}
        >
          Recalculer
        </Button>
      </div>
    </div>
  );
}

function LastRecomputeSummary(props: Readonly<LastRecomputeSummaryProps>) {
  const { lastRecompute } = props;
  if (!lastRecompute) return null;

  return (
    <p className="text-xs text-ink-secondary">
      Dernier recalcul: {lastRecompute.alertId} · recommande{" "}
      {lastRecompute.recommendedOptionId ?? "-"} · policy{" "}
      {compactVersionId(lastRecompute.recommendationPolicyVersion)} ·{" "}
      {formatDateTime(lastRecompute.recomputedAt)}
    </p>
  );
}

export function DecisionConfigSummary(
  props: Readonly<DecisionConfigSummaryProps>,
) {
  const { resolvedConfig, activeHorizon, horizons } = props;
  return (
    <>
      <DecisionConfigMetrics
        resolvedConfig={resolvedConfig}
        activeHorizon={activeHorizon}
      />
      <HorizonList horizons={horizons} />
    </>
  );
}

export function DecisionConfigControls(
  props: Readonly<DecisionConfigControlsProps>,
) {
  const {
    resolvedConfig,
    draft,
    canManageConfig,
    actionLoading,
    onSchedule,
    onRecompute,
  } = props;
  return (
    <>
      <ScheduleVersionForm
        effectiveAtInput={draft.effectiveAtInput}
        changeReason={draft.changeReason}
        canManageConfig={canManageConfig}
        actionLoading={actionLoading}
        resolvedConfig={resolvedConfig}
        onEffectiveAtChange={draft.setEffectiveAtInput}
        onReasonChange={draft.setChangeReason}
        onSchedule={onSchedule}
      />
      <PayloadEditor
        payloadDraft={draft.payloadDraft}
        canManageConfig={canManageConfig}
        onChange={draft.setPayloadDraft}
      />
      <RecomputeScenarioForm
        recomputeAlertId={draft.recomputeAlertId}
        canManageConfig={canManageConfig}
        actionLoading={actionLoading}
        onChange={draft.setRecomputeAlertId}
        onRecompute={onRecompute}
      />
      <LastRecomputeSummary lastRecompute={draft.lastRecompute} />
    </>
  );
}
