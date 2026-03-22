"use client";

import type { JSX } from "react";
import { AlertTriangle, Clock3 } from "lucide-react";
import type { OnboardingCaseBlocker } from "@praedixa/shared-types/api";

import type { OnboardingCaseBundle, OnboardingUiStepKey } from "./page-model";
import { blockerTone } from "./page-model";

type CaseWorkspaceAsideProps = {
  bundle: OnboardingCaseBundle;
  currentStep: OnboardingUiStepKey;
};

export function CaseWorkspaceAside({
  bundle,
  currentStep,
}: Readonly<CaseWorkspaceAsideProps>) {
  const blockers = blockersForStep(bundle, currentStep);

  return (
    <div className="space-y-5">
      <BlockersPanel blockers={blockers} />
      <EventsPanel bundle={bundle} />
    </div>
  );
}

function BlockersPanel(
  props: Readonly<{ blockers: readonly OnboardingCaseBlocker[] }>,
) {
  return (
    <aside className="rounded-[1.75rem] border border-border bg-white p-4 md:p-5">
      <PanelHeader
        icon={<AlertTriangle className="h-4 w-4" />}
        iconClassName="bg-amber-50 text-amber-700"
        eyebrow="Points de vigilance"
        title="Ce qui bloque encore"
      />

      {props.blockers.length > 0 ? (
        <div className="mt-4 space-y-3">
          {props.blockers.map((blocker) => (
            <div
              key={blocker.id}
              className="rounded-[1.35rem] border border-border bg-surface-sunken/25 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={`mt-0.5 h-4 w-4 ${blockerTone(blocker)}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">
                    {blocker.title}
                  </p>
                  <p className="mt-2 text-xs text-ink-tertiary">
                    {blocker.domain} - {blocker.status}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PanelEmptyState message="Aucun point de vigilance ouvert pour cette etape." />
      )}
    </aside>
  );
}

function EventsPanel(props: Readonly<{ bundle: OnboardingCaseBundle }>) {
  return (
    <aside className="rounded-[1.75rem] border border-border bg-white p-4 md:p-5">
      <PanelHeader
        icon={<Clock3 className="h-4 w-4" />}
        iconClassName="bg-surface-sunken text-ink-tertiary"
        eyebrow="Dernieres traces"
        title="Historique recent"
      />

      {props.bundle.events.length > 0 ? (
        <div className="mt-4 space-y-3">
          {props.bundle.events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="rounded-[1.35rem] border border-border bg-surface-sunken/22 px-4 py-4"
            >
              <p className="text-sm font-medium text-ink">{event.message}</p>
              <p className="mt-2 text-xs text-ink-tertiary">
                {new Date(event.occurredAt).toLocaleString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <PanelEmptyState message="Aucun evenement recent a afficher." />
      )}
    </aside>
  );
}

function PanelHeader(
  props: Readonly<{
    icon: JSX.Element;
    iconClassName: string;
    eyebrow: string;
    title: string;
  }>,
) {
  return (
    <div className="flex items-start gap-3">
      <div className={`rounded-2xl p-2 ${props.iconClassName}`}>
        {props.icon}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
          {props.eyebrow}
        </p>
        <h4 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          {props.title}
        </h4>
      </div>
    </div>
  );
}

function PanelEmptyState(props: Readonly<{ message: string }>) {
  return (
    <div className="mt-4 rounded-[1.35rem] border border-dashed border-border bg-surface-sunken/25 px-4 py-5">
      <p className="text-sm font-medium text-ink">{props.message}</p>
    </div>
  );
}

function blockersForStep(
  bundle: OnboardingCaseBundle,
  currentStep: OnboardingUiStepKey,
) {
  if (currentStep === "activation") {
    return bundle.blockers;
  }

  const blockers = bundle.blockers.filter(
    (blocker) => blocker.domain === currentStep,
  );
  return blockers.length > 0 ? blockers : bundle.blockers;
}
