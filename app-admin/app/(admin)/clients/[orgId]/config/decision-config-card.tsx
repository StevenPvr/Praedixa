"use client";

import type { ResolvedDecisionEngineConfig } from "@praedixa/shared-types";
import { Button, Card, CardContent } from "@praedixa/ui";

import { compactVersionId, formatDateTime } from "./config-operations";
import type { DecisionConfigRecomputeResponse } from "./config-types";

export interface DecisionConfigDraftState {
  effectiveAtInput: string;
  setEffectiveAtInput: (value: string) => void;
  payloadDraft: string;
  setPayloadDraft: (value: string) => void;
  changeReason: string;
  setChangeReason: (value: string) => void;
  recomputeAlertId: string;
  setRecomputeAlertId: (value: string) => void;
  lastRecompute: DecisionConfigRecomputeResponse | null;
}

function DecisionConfigMetrics({
  resolvedConfig,
  activeHorizon,
}: {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
}) {
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

function MetricCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
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

function HorizonList({
  horizons,
}: {
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
}) {
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

function InputField({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: "text" | "datetime-local";
  placeholder?: string;
}) {
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

function ScheduleVersionForm({
  effectiveAtInput,
  changeReason,
  canManageConfig,
  actionLoading,
  resolvedConfig,
  onEffectiveAtChange,
  onReasonChange,
  onSchedule,
}: {
  effectiveAtInput: string;
  changeReason: string;
  canManageConfig: boolean;
  actionLoading: string | null;
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  onEffectiveAtChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSchedule: () => void;
}) {
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

function PayloadEditor({
  payloadDraft,
  canManageConfig,
  onChange,
}: {
  payloadDraft: string;
  canManageConfig: boolean;
  onChange: (value: string) => void;
}) {
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

function RecomputeScenarioForm({
  recomputeAlertId,
  canManageConfig,
  actionLoading,
  onChange,
  onRecompute,
}: {
  recomputeAlertId: string;
  canManageConfig: boolean;
  actionLoading: string | null;
  onChange: (value: string) => void;
  onRecompute: () => void;
}) {
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

function LastRecomputeSummary({
  lastRecompute,
}: {
  lastRecompute: DecisionConfigRecomputeResponse | null;
}) {
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

function DecisionConfigSummary({
  resolvedConfig,
  activeHorizon,
  horizons,
}: {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
}) {
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

function DecisionConfigControls({
  resolvedConfig,
  draft,
  canManageConfig,
  actionLoading,
  onSchedule,
  onRecompute,
}: {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  draft: DecisionConfigDraftState;
  canManageConfig: boolean;
  actionLoading: string | null;
  onSchedule: () => void;
  onRecompute: () => void;
}) {
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

export function DecisionConfigCard({
  resolvedConfig,
  activeHorizon,
  horizons,
  draft,
  canManageConfig,
  actionLoading,
  onSchedule,
  onRecompute,
}: {
  resolvedConfig: ResolvedDecisionEngineConfig | null | undefined;
  activeHorizon:
    | ResolvedDecisionEngineConfig["payload"]["horizons"][number]
    | null;
  horizons: ResolvedDecisionEngineConfig["payload"]["horizons"];
  draft: DecisionConfigDraftState;
  canManageConfig: boolean;
  actionLoading: string | null;
  onSchedule: () => void;
  onRecompute: () => void;
}) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-4">
        <DecisionConfigSummary
          resolvedConfig={resolvedConfig}
          activeHorizon={activeHorizon}
          horizons={horizons}
        />
        <DecisionConfigControls
          resolvedConfig={resolvedConfig}
          draft={draft}
          canManageConfig={canManageConfig}
          actionLoading={actionLoading}
          onSchedule={onSchedule}
          onRecompute={onRecompute}
        />
      </CardContent>
    </Card>
  );
}
