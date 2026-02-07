"use client";

type Dimension = "human" | "merchandise";

interface FilterBarProps {
  dimension: Dimension;
  onDimensionChange: (d: Dimension) => void;
}

export function FilterBar({ dimension, onDimensionChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Dimension toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Dimension</span>
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          <button
            onClick={() => onDimensionChange("human")}
            className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
              dimension === "human"
                ? "bg-white text-charcoal shadow-sm"
                : "text-gray-500 hover:text-charcoal"
            }`}
          >
            Humaine
          </button>
          <button
            onClick={() => onDimensionChange("merchandise")}
            className={`min-h-[44px] rounded-md px-4 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
              dimension === "merchandise"
                ? "bg-white text-charcoal shadow-sm"
                : "text-gray-500 hover:text-charcoal"
            }`}
          >
            Marchandise
          </button>
        </div>
      </div>
    </div>
  );
}
