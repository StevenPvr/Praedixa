import * as React from "react";
import { cn } from "@praedixa/ui";

export interface ParetoPoint {
  id: string;
  label: string;
  cost: number;
  service: number;
  isParetoOptimal: boolean;
  isRecommended: boolean;
}

export interface ParetoChartProps extends React.HTMLAttributes<HTMLDivElement> {
  points: ParetoPoint[];
  onPointClick?: (point: ParetoPoint) => void;
}

const PADDING = { top: 20, right: 24, bottom: 40, left: 54 };
const VIEWBOX_W = 420;
const VIEWBOX_H = 290;
const CHART_W = VIEWBOX_W - PADDING.left - PADDING.right;
const CHART_H = VIEWBOX_H - PADDING.top - PADDING.bottom;

const ParetoChart = React.forwardRef<HTMLDivElement, ParetoChartProps>(
  ({ points, onPointClick, className, ...props }, ref) => {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const [focusedId, setFocusedId] = React.useState<string | null>(null);

    if (points.length === 0) {
      return (
        <div
          ref={ref}
          className={cn(
            "rounded-2xl border border-dashed border-border bg-surface-alt p-8 text-center text-sm text-ink-secondary",
            className,
          )}
          {...props}
        >
          Aucune donnee exploitable pour la frontiere Pareto.
        </div>
      );
    }

    const costs = points.map((p) => p.cost);
    const services = points.map((p) => p.service);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const costRange = maxCost - minCost || 1;
    const minService = Math.min(...services);
    const maxService = Math.max(...services);
    const serviceRange = maxService - minService || 1;

    function xPos(cost: number): number {
      return PADDING.left + ((cost - minCost) / costRange) * CHART_W;
    }

    function yPos(service: number): number {
      return (
        PADDING.top +
        CHART_H -
        ((service - minService) / serviceRange) * CHART_H
      );
    }

    const optimal = points
      .filter((p) => p.isParetoOptimal)
      .toSorted((a, b) => a.cost - b.cost);

    const frontierPath =
      optimal.length > 1
        ? optimal
            .map((p, i) =>
              i === 0
                ? `M ${xPos(p.cost)} ${yPos(p.service)}`
                : `L ${xPos(p.cost)} ${yPos(p.service)}`,
            )
            .join(" ")
        : "";

    const xTicks = Array.from({ length: 4 }, (_, i) =>
      Math.round(minCost + (costRange * (i + 1)) / 4),
    );
    const yTicks = Array.from({ length: 4 }, (_, i) =>
      Math.round(minService + (serviceRange * (i + 1)) / 4),
    );

    return (
      <div
        ref={ref}
        className={cn(
          "overflow-auto rounded-2xl border border-border bg-surface p-3",
          className,
        )}
        role="img"
        aria-label="Carte Pareto cout versus service"
        {...props}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full"
          preserveAspectRatio="xMinYMin meet"
        >
          <defs>
            <linearGradient id="pareto-area-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.15} />
              <stop
                offset="100%"
                stopColor="var(--chart-2)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          {xTicks.map((tick, i) => (
            <g key={`x-${i}`}>
              <line
                x1={xPos(tick)}
                y1={PADDING.top}
                x2={xPos(tick)}
                y2={PADDING.top + CHART_H}
                stroke="var(--chart-grid)"
                strokeDasharray="4 6"
              />
              <text
                x={xPos(tick)}
                y={PADDING.top + CHART_H + 18}
                textAnchor="middle"
                fontSize="9"
                fill="var(--chart-axis)"
              >
                {tick}
              </text>
            </g>
          ))}

          {yTicks.map((tick, i) => (
            <g key={`y-${i}`}>
              <line
                x1={PADDING.left}
                y1={yPos(tick)}
                x2={PADDING.left + CHART_W}
                y2={yPos(tick)}
                stroke="var(--chart-grid)"
                strokeDasharray="4 6"
              />
              <text
                x={PADDING.left - 8}
                y={yPos(tick)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize="9"
                fill="var(--chart-axis)"
              >
                {tick}%
              </text>
            </g>
          ))}

          <text
            x={PADDING.left + CHART_W / 2}
            y={VIEWBOX_H - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--chart-axis)"
            fontWeight={600}
          >
            Cout total estime
          </text>
          <text
            x={15}
            y={PADDING.top + CHART_H / 2}
            textAnchor="middle"
            fontSize="10"
            fill="var(--chart-axis)"
            fontWeight={600}
            transform={`rotate(-90, 15, ${PADDING.top + CHART_H / 2})`}
          >
            Niveau de service (%)
          </text>

          {frontierPath && optimal.length > 1 && (
            <>
              <path
                d={`${frontierPath} L ${xPos(optimal[optimal.length - 1].cost)} ${PADDING.top + CHART_H} L ${xPos(optimal[0].cost)} ${PADDING.top + CHART_H} Z`}
                fill="url(#pareto-area-grad)"
                data-testid="frontier-area"
              />
              <path
                d={frontierPath}
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth={2}
                strokeDasharray="6 4"
                data-testid="frontier-line"
              />
            </>
          )}
          {frontierPath && optimal.length <= 1 && (
            <path
              d={frontierPath}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="6 4"
              data-testid="frontier-line"
            />
          )}

          {points.map((point) => {
            const cx = xPos(point.cost);
            const cy = yPos(point.service);
            const isHovered = hoveredId === point.id;
            const isFocused = focusedId === point.id;
            const radius = point.isRecommended ? 7 : 5;
            const tooltipWidth = Math.max(point.label.length * 6 + 34, 130);

            return (
              <g
                key={point.id}
                data-testid={`pareto-point-${point.id}`}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onPointClick?.(point)}
                onFocus={() => setFocusedId(point.id)}
                onBlur={() => setFocusedId(null)}
                onKeyDown={(event) => {
                  if (!onPointClick) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onPointClick(point);
                  }
                }}
                tabIndex={onPointClick ? 0 : -1}
                role={onPointClick ? "button" : undefined}
                aria-label={`Option ${point.label}: cout ${point.cost.toFixed(0)} EUR, service ${point.service.toFixed(1)} pourcent`}
                className={cn(onPointClick && "cursor-pointer")}
              >
                {isFocused && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 7}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
                {point.isRecommended && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 4}
                    fill="none"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                  />
                )}

                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={
                    point.isParetoOptimal ? "var(--chart-1)" : "var(--card-bg)"
                  }
                  stroke={
                    point.isParetoOptimal
                      ? "var(--chart-1)"
                      : "var(--chart-axis)"
                  }
                  strokeWidth={2}
                />

                {(isHovered || isFocused) && (
                  <g>
                    <rect
                      x={cx + 10}
                      y={cy - 34}
                      width={tooltipWidth}
                      height={44}
                      rx={8}
                      fill="var(--card-bg)"
                      stroke="var(--border)"
                      strokeWidth={1}
                      opacity={0.97}
                    />
                    <text
                      x={cx + 18}
                      y={cy - 16}
                      fontSize="9"
                      fill="var(--ink)"
                      fontWeight={600}
                    >
                      {point.label}
                    </text>
                    <text
                      x={cx + 18}
                      y={cy - 2}
                      fontSize="8"
                      fill="var(--ink-secondary)"
                    >
                      Cout: {point.cost.toFixed(0)} EUR
                    </text>
                    <text
                      x={cx + 18}
                      y={cy + 10}
                      fontSize="8"
                      fill="var(--ink-secondary)"
                    >
                      Service: {point.service.toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  },
);

ParetoChart.displayName = "ParetoChart";

export { ParetoChart };
