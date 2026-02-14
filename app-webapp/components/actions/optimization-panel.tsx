"use client";

import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import type { ScenarioOption } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { Badge } from "@/components/ui/badge";
import {
  getOptionLabel,
  simulateCostCI,
  simulateServiceCI,
  formatCostRange,
} from "@/lib/scenario-utils";
import { formatPercentFromDecimal } from "@/lib/formatters";

interface OptimizationPanelProps {
  options: ScenarioOption[];
  selectedOptionId: string | null;
  onSelectOption: (id: string) => void;
  loading: boolean;
}

export function OptimizationPanel({
  options,
  selectedOptionId,
  onSelectOption,
  loading,
}: OptimizationPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface-alt px-4 py-6 text-sm text-ink-secondary">
        Aucun scenario exploitable pour cette alerte. Verifiez les donnees
        d'entree ou relancez la generation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const costCI = simulateCostCI(option.coutTotalEur);
        const serviceCI = simulateServiceCI(option.serviceAttenduPct);
        const isSelected = selectedOptionId === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelectOption(option.id)}
            aria-pressed={isSelected}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
              isSelected
                ? "border-primary bg-primary/[0.06] shadow-sm"
                : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/20"
            } ${option.isRecommended ? "ring-1 ring-primary/30" : ""} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}
            data-testid={`option-card-${option.id}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt text-xs font-semibold text-ink-secondary">
                  {index + 1}
                </span>
                <span className="text-sm font-semibold text-ink">
                  {getOptionLabel(option.optionType)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {option.isParetoOptimal && <Badge variant="info">Pareto</Badge>}
                {option.isRecommended && (
                  <Badge
                    variant="warning"
                    className="inline-flex items-center gap-1"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Recommande
                  </Badge>
                )}
                {isSelected && (
                  <Badge
                    variant="success"
                    className="inline-flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Selectionne
                  </Badge>
                )}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <p className="text-ink-secondary">Cout estime</p>
                <p className="mt-0.5 font-semibold text-ink">
                  {formatCostRange(costCI)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <p className="text-ink-secondary">Couverture attendue</p>
                <p className="mt-0.5 font-semibold text-ink">
                  {option.serviceAttenduPct}% ({serviceCI.lower}% -{" "}
                  {serviceCI.upper}%)
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <p className="text-ink-secondary">Heures couvertes</p>
                <p className="mt-0.5 font-semibold text-ink">
                  {option.heuresCouvertes} h
                </p>
              </div>
              <div className="rounded-xl border border-border bg-surface px-3 py-2">
                <p className="text-ink-secondary">Robustesse</p>
                <p className="mt-0.5 inline-flex items-center gap-1 font-semibold text-ink">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Faisabilite{" "}
                  {formatPercentFromDecimal(option.feasibilityScore)}
                </p>
              </div>
            </div>

            {option.dominanceReason && (
              <p className="mt-2 text-xs text-ink-secondary">
                {option.dominanceReason}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}
