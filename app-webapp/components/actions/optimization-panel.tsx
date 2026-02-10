"use client";

import type { ScenarioOption } from "@praedixa/shared-types";
import { SkeletonCard } from "@praedixa/ui";
import { Badge } from "@/components/ui/badge";
import { DetailCard } from "@/components/ui/detail-card";
import {
  getOptionLabel,
  simulateCostCI,
  simulateServiceCI,
  formatCostRange,
} from "@/lib/scenario-utils";

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

  if (options.length === 0) return null;

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const costCI = simulateCostCI(option.coutTotalEur);
        const serviceCI = simulateServiceCI(option.serviceAttenduPct);
        const isSelected = selectedOptionId === option.id;

        return (
          <DetailCard
            key={option.id}
            padding="compact"
            className={`cursor-pointer transition-shadow hover:shadow-card ${
              option.isRecommended ? "bg-amber-50/50 ring-1 ring-amber-200" : ""
            } ${isSelected ? "ring-2 ring-amber-500" : ""}`}
            onClick={() => onSelectOption(option.id)}
            data-testid={`option-card-${option.id}`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-charcoal">
                  {getOptionLabel(option.optionType)}
                </span>
                {option.isParetoOptimal && (
                  <Badge className="bg-amber-100 text-amber-800">Optimal</Badge>
                )}
                {option.isRecommended && (
                  <Badge variant="success">Recommande</Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">
                Cout estime : {formatCostRange(costCI)}
              </p>
              <p className="text-sm text-gray-600">
                Couverture attendue : {option.serviceAttenduPct}% (
                {serviceCI.lower}% — {serviceCI.upper}%)
              </p>
              <p className="text-sm text-gray-600">
                Heures couvertes : {option.heuresCouvertes}h
              </p>
            </div>
          </DetailCard>
        );
      })}
    </div>
  );
}
