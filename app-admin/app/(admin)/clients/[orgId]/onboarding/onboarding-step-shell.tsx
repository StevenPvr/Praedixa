"use client";

import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { Button, SkeletonCard } from "@praedixa/ui";

import { ONBOARDING_UI_STEPS, type OnboardingUiStepKey } from "./page-model";

type StepNavigationProps = {
  currentStep: OnboardingUiStepKey;
  selectedCaseId: string | null;
  onSelectStep: (step: OnboardingUiStepKey) => void;
};

type StepFooterProps = {
  currentStep: OnboardingUiStepKey;
  selectedCaseId: string | null;
  onSelectStep: (step: OnboardingUiStepKey) => void;
};

type NextStepCardProps = {
  disabled: boolean;
  onClick: () => void;
};

export function OnboardingStepNavigation({
  currentStep,
  selectedCaseId,
  onSelectStep,
}: Readonly<StepNavigationProps>) {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-5">
      {ONBOARDING_UI_STEPS.map((step, index) => {
        const isCurrent = step.key === currentStep;
        const isLocked = step.key !== "dossier" && selectedCaseId == null;
        return (
          <button
            key={step.key}
            type="button"
            disabled={isLocked}
            onClick={() => onSelectStep(step.key)}
            className={`rounded-[1.35rem] border px-4 py-4 text-left transition ${
              isCurrent
                ? "border-primary/45 bg-primary-50/55"
                : "border-border bg-surface-sunken/22 hover:border-primary/20 hover:bg-surface-sunken/38"
            } ${isLocked ? "cursor-not-allowed opacity-55" : ""}`}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
              Etape {index + 1}
            </p>
            <p className="mt-2 text-sm font-medium text-ink">{step.label}</p>
            <p className="mt-1 text-xs text-ink-tertiary">{step.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export function OnboardingStepFooter({
  currentStep,
  selectedCaseId,
  onSelectStep,
}: Readonly<StepFooterProps>) {
  const selectedStepIndex = ONBOARDING_UI_STEPS.findIndex(
    (step) => step.key === currentStep,
  );
  const stepMeta =
    ONBOARDING_UI_STEPS[selectedStepIndex] ?? ONBOARDING_UI_STEPS[0]!;
  const canGoToPreviousStep = selectedStepIndex > 0;
  const canGoToNextStep = selectedStepIndex < ONBOARDING_UI_STEPS.length - 1;

  function goToStep(direction: -1 | 1) {
    const nextIndex = Math.min(
      ONBOARDING_UI_STEPS.length - 1,
      Math.max(0, selectedStepIndex + direction),
    );
    onSelectStep(ONBOARDING_UI_STEPS[nextIndex]?.key ?? currentStep);
  }

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border bg-white px-4 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.12)]">
      <div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
          Etape en cours
        </p>
        <p className="mt-1 text-sm font-medium text-ink">{stepMeta.label}</p>
        <p className="mt-1 text-sm text-ink-tertiary">{stepMeta.description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!canGoToPreviousStep}
          onClick={() => goToStep(-1)}
        >
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Etape precedente
        </Button>
        <Button
          disabled={!selectedCaseId || !canGoToNextStep}
          onClick={() => goToStep(1)}
        >
          Etape suivante
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}

export function OnboardingLoadingCards() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export function OnboardingNextStepCard({
  disabled,
  onClick,
}: Readonly<NextStepCardProps>) {
  return (
    <div className="rounded-[2rem] border border-border bg-white px-5 py-5 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.12)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
            Etape 1
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            Creer ou choisir le dossier
          </h3>
          <p className="mt-2 max-w-[58ch] text-sm text-ink-tertiary">
            Commence ici. Une fois le dossier ouvert, passe a l&apos;etape
            suivante pour inviter le client et configurer ses acces.
          </p>
        </div>
        <div className="rounded-2xl bg-surface-sunken/35 p-3 text-ink-tertiary">
          <FolderOpen className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button disabled={disabled} onClick={onClick}>
          Passer a l&apos;etape suivante
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
