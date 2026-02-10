"use client";

import { AreaChart, BarChart } from "@tremor/react";
import { SkeletonChart } from "@praedixa/ui";
import { DetailCard } from "@/components/ui/detail-card";
import type { DecompositionResult } from "@/lib/forecast-decomposition";

interface DecompositionPanelProps {
  data: DecompositionResult | null;
  loading: boolean;
}

const chartValueFormatter = (v: number) => v.toFixed(0);

export function DecompositionPanel({ data, loading }: DecompositionPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-card p-12">
        <p className="text-sm text-gray-400">
          Lancez une prevision pour voir la decomposition
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* 1. Trend */}
      <DetailCard>
        <h3 className="text-sm font-semibold text-charcoal">
          Tendance de fond
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          L&apos;evolution generale de vos besoins, independamment des
          fluctuations
        </p>
        <div className="h-48 overflow-hidden rounded-lg border border-gray-100 bg-white/70">
          <AreaChart
            data={trendData}
            index="date"
            categories={["Tendance"]}
            colors={["amber"]}
            valueFormatter={chartValueFormatter}
            showLegend={false}
            showGridLines={false}
            curveType="monotone"
            className="h-full"
          />
        </div>
      </DetailCard>

      {/* 2. Seasonality */}
      <DetailCard>
        <h3 className="text-sm font-semibold text-charcoal">
          Rythme hebdomadaire
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Certains jours sont systematiquement plus charges
        </p>
        <div className="h-48 overflow-hidden rounded-lg border border-gray-100 bg-white/70">
          <BarChart
            data={seasonData}
            index="day"
            categories={["Effet"]}
            colors={["amber"]}
            valueFormatter={chartValueFormatter}
            showLegend={false}
            showGridLines={false}
            className="h-full"
          />
        </div>
      </DetailCard>

      {/* 3. Residuals */}
      <DetailCard>
        <h3 className="text-sm font-semibold text-charcoal">
          Evenements ponctuels
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Ce qui reste apres la tendance et le rythme. Les pics = imprevus
        </p>
        <div className="h-48 overflow-hidden rounded-lg border border-gray-100 bg-white/70">
          <AreaChart
            data={residualData}
            index="date"
            categories={["Residus"]}
            colors={["amber"]}
            valueFormatter={chartValueFormatter}
            showLegend={false}
            showGridLines={false}
            curveType="monotone"
            className="h-full"
          />
        </div>
      </DetailCard>

      {/* 4. Confidence band */}
      <DetailCard>
        <h3 className="text-sm font-semibold text-charcoal">
          Fourchette de confiance
        </h3>
        <p className="mb-3 text-xs text-gray-500">
          Plus la zone est etroite, plus la prevision est fiable
        </p>
        <div className="h-48 overflow-hidden rounded-lg border border-gray-100 bg-white/70">
          <AreaChart
            data={confidenceData}
            index="date"
            categories={["Prevision", "Borne basse", "Borne haute"]}
            colors={["amber", "gray", "gray"]}
            valueFormatter={chartValueFormatter}
            showLegend={false}
            showGridLines={false}
            curveType="monotone"
            className="h-full"
          />
        </div>
      </DetailCard>
    </div>
  );
}
