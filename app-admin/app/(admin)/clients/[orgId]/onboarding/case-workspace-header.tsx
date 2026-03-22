"use client";

import type { JSX } from "react";
import { CalendarClock, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@praedixa/ui";

import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";
import type { OnboardingCaseBundle, OnboardingUiStepKey } from "./page-model";
import {
  labelForActivationMode,
  labelForEnvironment,
  ONBOARDING_UI_STEPS,
} from "./page-model";

type CaseWorkspaceHeaderProps = {
  bundle: OnboardingCaseBundle;
  currentStep: OnboardingUiStepKey;
  lifecycleAction: string | null;
  onRecomputeReadiness: () => Promise<void>;
  onCancelCase: () => Promise<void>;
  onReopenCase: () => Promise<void>;
};

export function CaseWorkspaceHeader({
  bundle,
  currentStep,
  lifecycleAction,
  onRecomputeReadiness,
  onCancelCase,
  onReopenCase,
}: Readonly<CaseWorkspaceHeaderProps>) {
  const stepMeta =
    ONBOARDING_UI_STEPS.find((step) => step.key === currentStep) ??
    ONBOARDING_UI_STEPS[0]!;
  const canReopen =
    bundle.case.status === "cancelled" || bundle.case.status === "completed";

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
      <div className="rounded-[1.75rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,247,250,0.92))] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <OnboardingStatusBadge status={bundle.case.status} />
          <span className="rounded-full border border-border bg-white/80 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-ink-tertiary">
            {bundle.case.phase.replaceAll("_", " ")}
          </span>
        </div>

        <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
          Etape en cours
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {stepMeta.label}
        </h3>
        <p className="mt-2 max-w-[58ch] text-sm leading-relaxed text-ink-tertiary">
          {stepMeta.description}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <SummaryTile
            label="Mode"
            value={labelForActivationMode(bundle.case.activationMode)}
          />
          <SummaryTile
            label="Environnement"
            value={labelForEnvironment(bundle.case.environmentTarget)}
          />
          <SummaryTile
            label="Preparation"
            value={`${bundle.case.lastReadinessScore}/100`}
          />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-zinc-900/90 bg-zinc-950 p-5 text-white">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/55">
          Dossier selectionne
        </p>
        <div className="mt-4 space-y-3 text-sm text-white/78">
          <MetaRow
            icon={<CalendarClock className="h-4 w-4" />}
            label="Demarre le"
            value={new Date(bundle.case.startedAt).toLocaleDateString("fr-FR")}
          />
          <MetaRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Residence data"
            value={bundle.case.dataResidencyRegion}
          />
          <MetaRow
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Etat"
            value={bundle.case.status}
          />
        </div>

        <HeaderActions
          canReopen={canReopen}
          lifecycleAction={lifecycleAction}
          onRecomputeReadiness={onRecomputeReadiness}
          onCancelCase={onCancelCase}
          onReopenCase={onReopenCase}
        />
      </div>
    </section>
  );
}

function HeaderActions(
  props: Readonly<{
    canReopen: boolean;
    lifecycleAction: string | null;
    onRecomputeReadiness: () => Promise<void>;
    onCancelCase: () => Promise<void>;
    onReopenCase: () => Promise<void>;
  }>,
) {
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={props.lifecycleAction === "recompute"}
        className="border-white/12 bg-white/6 text-white hover:bg-white/10"
        onClick={props.onRecomputeReadiness}
      >
        {props.lifecycleAction === "recompute" ? "Recalcul..." : "Recalculer"}
      </Button>
      {props.canReopen ? null : (
        <Button
          size="sm"
          variant="outline"
          disabled={props.lifecycleAction === "cancel"}
          className="border-white/12 bg-white/6 text-white hover:bg-white/10"
          onClick={props.onCancelCase}
        >
          {props.lifecycleAction === "cancel" ? "Annulation..." : "Annuler"}
        </Button>
      )}
      {props.canReopen ? (
        <Button
          size="sm"
          disabled={props.lifecycleAction === "reopen"}
          className="bg-white text-zinc-950 hover:bg-white/90"
          onClick={props.onReopenCase}
        >
          {props.lifecycleAction === "reopen" ? "Reouverture..." : "Rouvrir"}
        </Button>
      ) : null}
    </div>
  );
}

function SummaryTile(props: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-border bg-white/80 p-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ink-tertiary">
        {props.label}
      </p>
      <p className="mt-2 text-sm font-medium text-ink">{props.value}</p>
    </div>
  );
}

function MetaRow(
  props: Readonly<{ icon: JSX.Element; label: string; value: string }>,
) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-white/55">{props.icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
          {props.label}
        </p>
        <p className="mt-1 text-sm font-medium text-white">{props.value}</p>
      </div>
    </div>
  );
}
