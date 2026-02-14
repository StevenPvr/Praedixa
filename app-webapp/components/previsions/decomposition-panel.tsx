"use client";

import { memo } from "react";
import { D3AreaChart } from "@/components/charts";
import { D3BarChart } from "@/components/charts";
import { SkeletonChart } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import type { DecompositionResult } from "@/lib/forecast-decomposition";

interface DecompositionPanelProps {
  data: DecompositionResult | null;
  loading: boolean;
}

const chartValueFormatter = (v: number) => v.toFixed(0);

interface SegmentProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

function Segment({ title, subtitle, children }: SegmentProps) {
  return (
    <DetailCard>
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-xs text-ink-secondary">{subtitle}</p>
      </div>
      {children}
    </DetailCard>
  );
}

export const DecompositionPanel = memo(function DecompositionPanel({
  data,
  loading,
}: DecompositionPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} data-testid="skeleton-chart-wrapper">
            <SkeletonChart />
          </div>
        ))}
      </div>
    );
  }

  const isEmpty =
    !data ||
    (data.trend.length === 0 &&
      data.seasonality.length === 0 &&
      data.residuals.length === 0);

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border bg-surface-alt p-12">
        <p className="text-sm text-ink-secondary">
          Lancez une prevision pour visualiser la decomposition du signal.
        </p>
      </div>
    );
  }

  const trendData = data.trend.map((d) => ({
    date: d.date,
    Tendance: d.value,
  }));

  const seasonData = data.seasonality.map((d) => ({
    day: d.day,
    Effet: d.value,
  }));

  const residualData = data.residuals.map((d) => ({
    date: d.date,
    Residus: d.value,
  }));

  const confidenceData = data.confidence.map((d) => ({
    date: d.date,
    Prevision: d.mid,
    "Borne basse": d.lower,
    "Borne haute": d.upper,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Segment
        title="Tendance de fond"
        subtitle="Evolution structurelle des besoins, independamment des variations courtes."
      >
        <div className="h-48 overflow-hidden rounded-xl border border-border bg-surface-alt">
          <D3AreaChart
            data={trendData}
            index="date"
            categories={["Tendance"]}
            colors={["var(--brand)"]}
            valueFormatter={chartValueFormatter}
            curveType="monotone"
            className="h-full"
          />
        </div>
      </Segment>

      <Segment
        title="Rythme hebdomadaire"
        subtitle="Cycles operationnels recurrents qui influencent la charge."
      >
        <div className="h-48 overflow-hidden rounded-xl border border-border bg-surface-alt">
          <D3BarChart
            data={seasonData}
            index="day"
            categories={["Effet"]}
            colors={["var(--brand)"]}
            valueFormatter={chartValueFormatter}
            className="h-full"
          />
        </div>
      </Segment>

      <Segment
        title="Evenements ponctuels"
        subtitle="Anomalies ou signaux exceptionnels qui perturbent la tendance normale."
      >
        <div className="h-48 overflow-hidden rounded-xl border border-border bg-surface-alt">
          <D3AreaChart
            data={residualData}
            index="date"
            categories={["Residus"]}
            colors={["var(--brand)"]}
            valueFormatter={chartValueFormatter}
            curveType="monotone"
            className="h-full"
          />
        </div>
      </Segment>

      <Segment
        title="Fourchette de confiance"
        subtitle="Amplitude d'incertitude autour de la prediction centrale."
      >
        <div className="h-48 overflow-hidden rounded-xl border border-border bg-surface-alt">
          <D3AreaChart
            data={confidenceData}
            index="date"
            categories={["Prevision", "Borne basse", "Borne haute"]}
            colors={[
              "var(--brand)",
              "var(--ink-tertiary)",
              "var(--ink-tertiary)",
            ]}
            valueFormatter={chartValueFormatter}
            showLegend
            curveType="monotone"
            className="h-full"
          />
        </div>
      </Segment>
    </div>
  );
});

DecompositionPanel.displayName = "DecompositionPanel";
