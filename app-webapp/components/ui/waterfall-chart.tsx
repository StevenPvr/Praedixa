// Waterfall chart for cost analysis (BAU -> adjustments -> final)
import * as React from "react";
import { cn } from "@praedixa/ui";

export interface WaterfallItem {
  label: string;
  value: number;
  type: "positive" | "negative" | "total";
}

export interface WaterfallChartProps extends React.HTMLAttributes<HTMLDivElement> {
  items: WaterfallItem[];
  formatValue?: (value: number) => string;
}

const BAR_HEIGHT = 28;
const ROW_GAP = 8;
const LABEL_WIDTH = 120;
const VALUE_WIDTH = 80;
const CHART_LEFT = LABEL_WIDTH + 8;
const CHART_WIDTH = 300;
const CONNECTOR_STROKE = "var(--chart-grid)";

type ComputedWaterfallItem = WaterfallItem & {
  barStart: number;
  barEnd: number;
};

function buildComputedItems(items: WaterfallItem[]): ComputedWaterfallItem[] {
  let runningTotal = 0;
  return items.map((item) => {
    let barStart: number;
    let barEnd: number;

    if (item.type === "total") {
      barStart = 0;
      barEnd = item.value;
      runningTotal = item.value;
    } else {
      barStart = runningTotal;
      barEnd = runningTotal + item.value;
      runningTotal = barEnd;
    }

    return { ...item, barStart, barEnd };
  });
}

function getChartDomain(items: ComputedWaterfallItem[]) {
  const allValues = items.flatMap((item) => [item.barStart, item.barEnd]);
  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(0, ...allValues);
  return {
    minVal,
    range: maxVal - minVal || 1,
  };
}

function getBarColor(type: WaterfallItem["type"]): string {
  if (type === "positive") return "var(--success)";
  if (type === "negative") return "var(--danger)";
  return "var(--chart-1)";
}

const WaterfallChart = React.forwardRef<HTMLDivElement, WaterfallChartProps>(
  ({ items, formatValue = (v) => String(v), className, ...props }, ref) => {
    if (items.length === 0) {
      return (
        <div
          ref={ref}
          className={cn("text-ink-secondary", className)}
          {...props}
        >
          Aucune donnee
        </div>
      );
    }

    const computed = buildComputedItems(items);
    const { minVal, range } = getChartDomain(computed);
    const totalWidth = CHART_LEFT + CHART_WIDTH + VALUE_WIDTH;
    const totalHeight =
      items.length * (BAR_HEIGHT + ROW_GAP) - ROW_GAP + ROW_GAP;

    function xPos(val: number): number {
      return CHART_LEFT + ((val - minVal) / range) * CHART_WIDTH;
    }

    return (
      <div
        ref={ref}
        className={cn("overflow-auto", className)}
        role="img"
        aria-label="Waterfall chart"
        {...props}
      >
        <svg
          viewBox={`0 0 ${totalWidth} ${totalHeight}`}
          className="w-full"
          preserveAspectRatio="xMinYMin meet"
        >
          {computed.map((item, i) => {
            const y = i * (BAR_HEIGHT + ROW_GAP);
            const x1 = xPos(Math.min(item.barStart, item.barEnd));
            const x2 = xPos(Math.max(item.barStart, item.barEnd));
            const barWidth = Math.max(x2 - x1, 2);

            return (
              <g key={item.label} data-testid={`waterfall-item-${i}`}>
                {/* Label */}
                <text
                  x={LABEL_WIDTH}
                  y={y + BAR_HEIGHT / 2}
                  textAnchor="end"
                  dominantBaseline="central"
                  className="fill-muted text-xs"
                  fontSize="11"
                >
                  {item.label}
                </text>

                {/* Bar */}
                <rect
                  x={x1}
                  y={y + 2}
                  width={barWidth}
                  height={BAR_HEIGHT - 4}
                  rx={4}
                  fill={getBarColor(item.type)}
                  data-testid={`waterfall-bar-${i}`}
                />

                {/* Value */}
                <text
                  x={CHART_LEFT + CHART_WIDTH + 8}
                  y={y + BAR_HEIGHT / 2}
                  textAnchor="start"
                  dominantBaseline="central"
                  className="fill-ink text-xs font-medium"
                  fontSize="11"
                >
                  {formatValue(item.value)}
                </text>

                {/* Connector line to next bar */}
                {i < computed.length - 1 && (
                  <line
                    x1={xPos(item.barEnd)}
                    y1={y + BAR_HEIGHT}
                    x2={xPos(item.barEnd)}
                    y2={y + BAR_HEIGHT + ROW_GAP}
                    stroke={CONNECTOR_STROKE}
                    strokeWidth={1}
                    strokeDasharray="3 2"
                  />
                )}
              </g>
            );
          })}

          {/* Zero line */}
          <line
            x1={xPos(0)}
            y1={0}
            x2={xPos(0)}
            y2={totalHeight}
            stroke="var(--border)"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  },
);

WaterfallChart.displayName = "WaterfallChart";

export { WaterfallChart };
