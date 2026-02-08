// Heatmap grid component for coverage/risk visualization
import * as React from "react";
import { cn } from "../utils/cn";

export interface HeatmapCell {
  row: string;
  column: string;
  value: number;
  label?: string;
}

export interface HeatmapGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cells: HeatmapCell[];
  rows: string[];
  columns: string[];
  /** Color scale: green (high) -> amber (medium) -> red (low) for coverage, inverted for risk */
  colorScale?: "coverage" | "risk";
  onCellClick?: (cell: HeatmapCell) => void;
}

/**
 * Interpolate between OKLCH color stops based on a 0-100 value.
 * Coverage: red (0%) -> amber (50%) -> green (100%)
 * Risk: green (0%) -> amber (50%) -> red (100%)
 */
function getCellColor(value: number, colorScale: "coverage" | "risk"): string {
  const clamped = Math.max(0, Math.min(100, value));
  const normalized = colorScale === "risk" ? 100 - clamped : clamped;

  // Color stops in OKLCH: red -> amber -> green
  if (normalized <= 50) {
    const t = normalized / 50;
    const l = 0.55 + t * (0.8 - 0.55);
    const c = 0.2 + t * (0.15 - 0.2);
    const h = 25 + t * (85 - 25);
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
  }

  const t = (normalized - 50) / 50;
  const l = 0.8 + t * (0.75 - 0.8);
  const c = 0.15 + t * (0.15 - 0.15);
  const h = 85 + t * (145 - 85);
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
}

function getCellByPosition(
  cells: HeatmapCell[],
  row: string,
  column: string,
): HeatmapCell | undefined {
  return cells.find((c) => c.row === row && c.column === column);
}

const HeatmapGrid = React.forwardRef<HTMLDivElement, HeatmapGridProps>(
  (
    {
      cells,
      rows,
      columns,
      colorScale = "coverage",
      onCellClick,
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn("overflow-auto", className)}
        role="grid"
        aria-label="Heatmap"
        {...props}
      >
        <div
          className="inline-grid gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${columns.length}, minmax(3rem, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="p-2" />
          {columns.map((col) => (
            <div
              key={col}
              className="truncate p-2 text-center text-xs font-semibold text-gray-500"
              role="columnheader"
            >
              {col}
            </div>
          ))}

          {/* Data rows */}
          {rows.map((row) => (
            <React.Fragment key={row}>
              <div
                className="flex items-center p-2 text-xs font-semibold text-gray-600"
                role="rowheader"
              >
                {row}
              </div>
              {columns.map((col) => {
                const cell = getCellByPosition(cells, row, col);
                const value = cell?.value ?? 0;
                const bg = getCellColor(value, colorScale);

                return (
                  <button
                    key={`${row}-${col}`}
                    type="button"
                    role="gridcell"
                    className={cn(
                      "flex items-center justify-center rounded-md p-2 text-xs font-medium text-white transition-transform hover:scale-105",
                      onCellClick && "cursor-pointer",
                      !onCellClick && "cursor-default",
                    )}
                    style={{ backgroundColor: bg }}
                    title={cell?.label ?? `${row} / ${col}: ${value}%`}
                    onClick={() => {
                      if (onCellClick && cell) {
                        onCellClick(cell);
                      }
                    }}
                    aria-label={
                      cell?.label ?? `${row} ${col} ${value} pourcent`
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  },
);

HeatmapGrid.displayName = "HeatmapGrid";

export { HeatmapGrid, getCellColor };
