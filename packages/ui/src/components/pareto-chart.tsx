// Pareto chart (scatter plot with frontier line)
import * as React from "react";
import { cn } from "../utils/cn";

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

const PADDING = { top: 20, right: 30, bottom: 40, left: 50 };
const VIEWBOX_W = 400;
const VIEWBOX_H = 280;
const CHART_W = VIEWBOX_W - PADDING.left - PADDING.right;
const CHART_H = VIEWBOX_H - PADDING.top - PADDING.bottom;

const ParetoChart = React.forwardRef<HTMLDivElement, ParetoChartProps>(
  ({ points, onPointClick, className, ...props }, ref) => {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);

    if (points.length === 0) {
      return (
        <div ref={ref} className={cn("text-gray-400", className)} {...props}>
          Aucune donnee
        </div>
      );
    }

    // Compute scales
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

    // Pareto frontier line (sorted by cost ascending)
    const optimal = points
      .filter((p) => p.isParetoOptimal)
      .sort((a, b) => a.cost - b.cost);

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

    // Grid lines (5 ticks each)
    const xTicks = Array.from({ length: 5 }, (_, i) =>
      Math.round(minCost + (costRange * (i + 1)) / 5),
    );
    const yTicks = Array.from({ length: 5 }, (_, i) =>
      Math.round(minService + (serviceRange * (i + 1)) / 5),
    );

    return (
      <div
        ref={ref}
        className={cn("overflow-auto", className)}
        role="img"
        aria-label="Pareto chart"
        {...props}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full"
          preserveAspectRatio="xMinYMin meet"
        >
          {/* Grid lines */}
          {xTicks.map((tick, i) => (
            <g key={`x-${i}`}>
              <line
                x1={xPos(tick)}
                y1={PADDING.top}
                x2={xPos(tick)}
                y2={PADDING.top + CHART_H}
                stroke="oklch(0.9 0 0)"
                strokeWidth={1}
              />
              <text
                x={xPos(tick)}
                y={PADDING.top + CHART_H + 16}
                textAnchor="middle"
                fontSize="9"
                className="fill-gray-400"
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
                stroke="oklch(0.9 0 0)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={yPos(tick)}
                textAnchor="end"
                dominantBaseline="central"
                fontSize="9"
                className="fill-gray-400"
              >
                {tick}%
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text
            x={PADDING.left + CHART_W / 2}
            y={VIEWBOX_H - 4}
            textAnchor="middle"
            fontSize="10"
            className="fill-gray-500 font-medium"
          >
            Cout
          </text>
          <text
            x={12}
            y={PADDING.top + CHART_H / 2}
            textAnchor="middle"
            fontSize="10"
            className="fill-gray-500 font-medium"
            transform={`rotate(-90, 12, ${PADDING.top + CHART_H / 2})`}
          >
            Service (%)
          </text>

          {/* Frontier line */}
          {frontierPath && (
            <path
              d={frontierPath}
              fill="none"
              stroke="oklch(0.75 0.15 85)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              data-testid="frontier-line"
            />
          )}

          {/* Points */}
          {points.map((point) => {
            const cx = xPos(point.cost);
            const cy = yPos(point.service);
            const isHovered = hoveredId === point.id;
            const radius = point.isRecommended ? 7 : 5;

            return (
              <g
                key={point.id}
                data-testid={`pareto-point-${point.id}`}
                onMouseEnter={() => setHoveredId(point.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onPointClick?.(point)}
                className={cn(onPointClick && "cursor-pointer")}
              >
                {/* Recommended ring */}
                {point.isRecommended && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius + 3}
                    fill="none"
                    stroke="oklch(0.65 0.18 85)"
                    strokeWidth={2}
                  />
                )}

                {/* Point */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={point.isParetoOptimal ? "oklch(0.75 0.15 85)" : "none"}
                  stroke={
                    point.isParetoOptimal
                      ? "oklch(0.75 0.15 85)"
                      : "oklch(0.7 0.02 250)"
                  }
                  strokeWidth={point.isParetoOptimal ? 0 : 1.5}
                />

                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={cx + 10}
                      y={cy - 26}
                      width={Math.max(point.label.length * 6 + 16, 80)}
                      height={36}
                      rx={4}
                      fill="oklch(0.2 0.02 250)"
                      opacity={0.95}
                    />
                    <text
                      x={cx + 18}
                      y={cy - 14}
                      fontSize="9"
                      className="fill-white font-medium"
                    >
                      {point.label}
                    </text>
                    <text x={cx + 18} y={cy + 2} fontSize="8" fill="#ccc">
                      Cout: {point.cost} | Service: {point.service}%
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
