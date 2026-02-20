"use client";

import { useMemo } from "react";
import { addDays, format, startOfToday } from "date-fns";
import { fr } from "date-fns/locale";
import type { CoverageAlert } from "@praedixa/shared-types";
import { ChartInsight } from "./chart-insight";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ForecastTimelineChartProps {
  alerts: CoverageAlert[];
}

interface SeriesPoint {
  date: string;
  capacity: number;
  demand: number;
}

function buildSeries(alerts: CoverageAlert[]): SeriesPoint[] {
  const today = startOfToday();

  return Array.from({ length: 14 }).map((_, index) => {
    const day = addDays(today, index);
    const isoDate = format(day, "yyyy-MM-dd");
    const dayAlerts = alerts.filter((alert) => alert.alertDate === isoDate);
    const accumulatedGap = dayAlerts.reduce(
      (acc, alert) => acc + alert.gapH,
      0,
    );

    const capacity = 92 + Math.sin(index / 2.6) * 6;
    const demand = 84 + Math.cos(index / 2.8) * 7 + accumulatedGap * 0.75;

    return {
      date: format(day, "dd MMM", { locale: fr }),
      capacity: Number(capacity.toFixed(1)),
      demand: Number(demand.toFixed(1)),
    };
  });
}

function linePath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
}

export function ForecastTimelineChart({ alerts }: ForecastTimelineChartProps) {
  const data = useMemo(() => buildSeries(alerts), [alerts]);

  const criticalDays = data.filter(
    (point) => point.demand > point.capacity,
  ).length;
  const maxGap = Math.max(
    ...data.map((point) => point.demand - point.capacity),
  );

  const insight =
    criticalDays === 0
      ? "Le plan de charge reste sous le plafond capacitaire sur les 14 prochains jours."
      : `${criticalDays} jour(s) depassent la capacite prevue. Deficit maximal estime: ${maxGap.toFixed(1)} heures.`;

  const chartWidth = 700;
  const chartHeight = 260;
  const paddingX = 36;
  const paddingTop = 20;
  const paddingBottom = 28;

  const maxValue = Math.max(
    ...data.map((point) => Math.max(point.capacity, point.demand)),
    100,
  );
  const minValue = Math.min(
    ...data.map((point) => Math.min(point.capacity, point.demand)),
    60,
  );
  const scaleX = (index: number) =>
    paddingX + (index * (chartWidth - paddingX * 2)) / (data.length - 1);
  const scaleY = (value: number) =>
    paddingTop +
    ((maxValue - value) / (maxValue - minValue || 1)) *
      (chartHeight - paddingTop - paddingBottom);

  const capacityPoints = data.map((point, index) => ({
    x: scaleX(index),
    y: scaleY(point.capacity),
  }));
  const demandPoints = data.map((point, index) => ({
    x: scaleX(index),
    y: scaleY(point.demand),
  }));

  const demandArea = [
    ...demandPoints,
    {
      x: demandPoints[demandPoints.length - 1]?.x ?? chartWidth - paddingX,
      y: chartHeight - paddingBottom,
    },
    { x: demandPoints[0]?.x ?? paddingX, y: chartHeight - paddingBottom },
  ];

  return (
    <Card className="h-full" variant="elevated" noPadding>
      <CardHeader>
        <CardTitle>Pression capacitaire a 14 jours</CardTitle>
        <p className="mt-1 text-sm text-ink-secondary">
          Lecture executive des ecarts entre demande previsionnelle et capacite
          disponible.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <ChartInsight
          insight={insight}
          trend={criticalDays > 0 ? "negative" : "positive"}
        />

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-[290px] min-w-[680px] w-full"
            role="img"
            aria-label="Courbe capacite versus demande"
          >
            {Array.from({ length: 4 }).map((_, idx) => {
              const y =
                paddingTop +
                (idx * (chartHeight - paddingTop - paddingBottom)) / 3;
              return (
                <line
                  key={idx}
                  x1={paddingX}
                  y1={y}
                  x2={chartWidth - paddingX}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 6"
                />
              );
            })}

            <path
              d={`${linePath(demandArea)} Z`}
              fill="var(--chart-1)"
              opacity={0.18}
              stroke="none"
              className="animate-chart-fade-in"
            />

            <path
              d={linePath(capacityPoints)}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={0}
              className="animate-draw"
            />
            <path
              d={linePath(demandPoints)}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={0}
              className="animate-draw"
              style={{ animationDelay: "0.2s" }}
            />

            {demandPoints.map((point, idx) => (
              <circle
                key={`demand-${idx}`}
                cx={point.x}
                cy={point.y}
                r="3"
                fill="var(--card-bg)"
                stroke="var(--chart-1)"
                strokeWidth="2"
                className="animate-chart-fade-in"
                style={{ animationDelay: `${0.6 + idx * 0.03}s` }}
              />
            ))}

            {data.map((point, idx) => (
              <text
                key={`label-${idx}`}
                x={scaleX(idx)}
                y={chartHeight - 8}
                textAnchor="middle"
                fill="var(--chart-axis)"
                fontSize="10"
              >
                {point.date}
              </text>
            ))}
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-ink-secondary">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--chart-2)]" />
            Capacite disponible
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--chart-1)]" />
            Demande previsionnelle
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
