"use client";

import { SkeletonCard } from "@praedixa/ui";
import type { ArbitrageOption } from "@praedixa/shared-types";
import { OptionCard } from "./option-card";

interface OptionsComparisonProps {
  options: ArbitrageOption[];
  recommendationIndex: number;
  loading: boolean;
  onValidate: (index: number) => void;
  /** Index of the option currently being validated (-1 if none) */
  validatingIndex: number;
  /** Index of the currently selected/validated option (-1 if none) */
  selectedIndex: number;
}

export function OptionsComparison({
  options,
  recommendationIndex,
  loading,
  onValidate,
  validatingIndex,
  selectedIndex,
}: OptionsComparisonProps) {
  if (loading) {
    return (
      <div
        className="grid gap-4 sm:grid-cols-2"
        aria-busy="true"
        aria-label="Chargement des options"
      >
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    );
  }

  const isAnyValidating = validatingIndex >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {options.map((option, idx) => (
        <OptionCard
          key={option.type}
          option={option}
          index={idx}
          isRecommended={idx === recommendationIndex}
          isSelected={idx === selectedIndex}
          onValidate={onValidate}
          validating={idx === validatingIndex}
          disabled={isAnyValidating && idx !== validatingIndex}
        />
      ))}
    </div>
  );
}
