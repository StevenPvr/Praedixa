// Waterfall chart for cost analysis (BAU -> adjustments -> final)
import * as React from "react";
import { cn } from "../utils/cn";

export interface WaterfallItem {
  label: string;
  value: number;
  type: "positive" | "negative" | "total";
}

export interface WaterfallChartProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: WaterfallItem[];
  formatValue?: (value: number) => string;
}

const BAR_HEIGHT = 28;
const ROW_GAP = 8;
const LABEL_WIDTH = 120;
const VALUE_WIDTH = 80;
const CHART_LEFT = LABEL_WIDTH + 8;
const CONNECTOR_STROKE = "oklch(0.7 0.01 250)";

const WaterfallChart = React.forwardRef<HTMLDivElement, WaterfallChartProps>(
  ({ items, formatValue = (v) => String(v), className, ...props }, ref) => {
    if (items.length === 0) {
      return (
        <div ref={ref} className={cn("text-gray-400", className)} {...props}>
          Aucune donnee
        </div>
      );
    }

    // Compute running positions
    let runningTotal = 0;
    const computed = items.map((item) => {
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

    // Determine scale
    const allValues = computed.flatMap((c) => [c.barStart, c.barEnd]);
    const minVal = Math.min(0, ...allValues);
    const maxVal = Math.max(0, ...allValues);
    const range = maxVal - minVal || 1;

    const chartWidth = 300;
    const totalWidth = CHART_LEFT + chartWidth + VALUE_WIDTH;
    const totalHeight =
      items.length * (BAR_HEIGHT + ROW_GAP) - ROW_GAP + ROW_GAP;

    function xPos(val: number): number {
      return CHART_LEFT + ((val - minVal) / range) * chartWidth;
    }

    function barColor(type: "positive" | "negative" | "total"): string {
      if (type === "positive") return "oklch(0.72 0.17 145)";
      if (type === "negative") return "oklch(0.60 0.20 25)";
      return "oklch(0.65 0.05 250)";
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
                  className="fill-gray-600 text-xs"
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
                  fill={barColor(item.type)}
                  data-testid={`waterfall-bar-${i}`}
                />

                {/* Value */}
                <text
                  x={CHART_LEFT + chartWidth + 8}
                  y={y + BAR_HEIGHT / 2}
                  textAnchor="start"
                  dominantBaseline="central"
                  className="fill-charcoal text-xs font-medium"
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
            stroke="oklch(0.8 0 0)"
            strokeWidth={1}
          />
        </svg>
      </div>
    );
  },
);

WaterfallChart.displayName = "WaterfallChart";

export { WaterfallChart };
