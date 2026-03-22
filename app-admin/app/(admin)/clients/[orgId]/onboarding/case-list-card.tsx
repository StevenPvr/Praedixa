"use client";

import { Card, CardContent } from "@praedixa/ui";
import type { OnboardingCaseSummary } from "@praedixa/shared-types/api";

import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";
import { labelForActivationMode, labelForEnvironment } from "./page-model";

type CaseListCardProps = {
  cases: readonly OnboardingCaseSummary[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
};

export function CaseListCard(props: Readonly<CaseListCardProps>) {
  const { cases, selectedCaseId, onSelect } = props;

  return (
    <Card className="rounded-[2rem] border border-border bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.16)]">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.24em] text-ink-tertiary">
            Dossiers d&apos;activation
          </p>
          <h3 className="text-lg font-semibold tracking-tight text-ink">
            Choisis le dossier actif.
          </h3>
          <p className="text-sm text-ink-tertiary">
            Garde un seul dossier actif pour la demo. Les autres restent comme
            historique de cadrage.
          </p>
        </div>

        {cases.length > 0 ? (
          <div className="space-y-3">
            {cases.map((entry, index) => (
              <CaseListItem
                key={entry.id}
                entry={entry}
                index={index}
                selected={entry.id === selectedCaseId}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border bg-surface-sunken/25 px-4 py-6">
            <p className="text-sm font-medium text-ink">
              Aucun dossier d&apos;activation n&apos;est encore ouvert.
            </p>
            <p className="mt-2 text-sm text-ink-tertiary">
              Commence par le rail du dessus pour ouvrir un premier dossier
              d&apos;activation.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CaseListItem(
  props: Readonly<{
    entry: OnboardingCaseSummary;
    index: number;
    selected: boolean;
    onSelect: (caseId: string) => void;
  }>,
) {
  const { entry, index, selected, onSelect } = props;
  const selectionClassName = selected
    ? "border-primary/50 bg-primary-50/55 shadow-[0_18px_40px_-30px_rgba(12,120,98,0.55)]"
    : "border-border bg-white hover:border-primary/25 hover:bg-surface-sunken/28";

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition duration-200 ${selectionClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-ink-tertiary">
              Dossier {String(index + 1).padStart(2, "0")}
            </span>
            <OnboardingStatusBadge status={entry.status} size="sm" />
          </div>
          <p className="text-base font-semibold tracking-tight text-ink">
            {labelForActivationMode(entry.activationMode)} /{" "}
            {labelForEnvironment(entry.environmentTarget)}
          </p>
          <p className="text-xs text-ink-tertiary">
            Phase {entry.phase.replaceAll("_", " ")}
          </p>
        </div>

        <div className="rounded-2xl border border-black/5 bg-black/[0.02] px-3 py-2 text-right text-xs text-ink-tertiary">
          <p>{entry.openTaskCount} taches</p>
          <p>{entry.openBlockerCount} blocages</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <SummaryLine
          label="Sources"
          value={joinOrFallback(entry.sourceModes, "Aucune source")}
        />
        <SummaryLine
          label="Packs"
          value={joinOrFallback(entry.selectedPacks, "Aucun pack")}
        />
      </div>
    </button>
  );
}

function SummaryLine(props: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-ink-tertiary">
      <span className="font-medium text-ink-secondary">{props.label}:</span>{" "}
      {props.value}
    </div>
  );
}

function joinOrFallback(values: readonly string[], fallback: string) {
  return values.length > 0 ? values.join(", ") : fallback;
}
