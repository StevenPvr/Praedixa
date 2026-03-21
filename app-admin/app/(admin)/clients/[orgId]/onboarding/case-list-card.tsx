"use client";

import { Card, CardContent } from "@praedixa/ui";
import type { OnboardingCaseSummary } from "@praedixa/shared-types/api";

import { OnboardingStatusBadge } from "@/components/onboarding-status-badge";

type CaseListCardProps = {
  cases: readonly OnboardingCaseSummary[];
  selectedCaseId: string | null;
  onSelect: (caseId: string) => void;
};

export function CaseListCard({
  cases,
  selectedCaseId,
  onSelect,
}: CaseListCardProps) {
  return (
    <Card className="rounded-2xl shadow-soft">
      <CardContent className="space-y-4 p-5">
        <div>
          <h3 className="text-sm font-medium text-ink-secondary">
            Cases onboarding
          </h3>
          <p className="text-xs text-ink-tertiary">
            Historique de cadrage, readiness et activations pour cette
            organisation.
          </p>
        </div>

        {cases.length > 0 ? (
          <div className="space-y-3">
            {cases.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelect(entry.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  entry.id === selectedCaseId
                    ? "border-primary bg-primary-50/60"
                    : "border-border bg-card hover:bg-surface-sunken/40"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <OnboardingStatusBadge status={entry.status} size="sm" />
                      <span className="text-xs uppercase tracking-[0.18em] text-ink-tertiary">
                        {entry.phase.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-ink">
                      {entry.activationMode} / {entry.environmentTarget}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ink-tertiary">
                    <p>{entry.openTaskCount} taches ouvertes</p>
                    <p>{entry.openBlockerCount} blockers ouverts</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-tertiary">
                  <span>Sources: {entry.sourceModes.join(", ")}</span>
                  <span>•</span>
                  <span>Packs: {entry.selectedPacks.join(", ")}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-ink-tertiary">
            Aucun case onboarding n&apos;est encore ouvert pour cette
            organisation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
