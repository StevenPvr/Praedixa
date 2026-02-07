"use client";

import type { DecisionStatus } from "@praedixa/shared-types";

const statusOptions: Array<{ value: DecisionStatus | "all"; label: string }> = [
  { value: "all", label: "Toutes" },
  { value: "suggested", label: "Suggerees" },
  { value: "pending_review", label: "En attente" },
  { value: "approved", label: "Approuvees" },
  { value: "rejected", label: "Rejetees" },
  { value: "implemented", label: "Implementees" },
];

interface DecisionStatusFilterProps {
  value: DecisionStatus | "all";
  onChange: (status: DecisionStatus | "all") => void;
}

export function DecisionStatusFilter({
  value,
  onChange,
}: DecisionStatusFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1"
      role="tablist"
      aria-label="Filtrer par statut"
    >
      {statusOptions.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-[36px] rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === option.value
              ? "bg-white text-charcoal shadow-sm"
              : "text-gray-500 hover:text-charcoal"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
