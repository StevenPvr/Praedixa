"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { AreaChart } from "@tremor/react";
import { Inbox } from "lucide-react";
import type { ProofPack } from "@praedixa/shared-types";
import { SkeletonChart } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";
import { ChartErrorBoundary } from "@/components/chart-error-boundary";
import { LIVE_DATA_POLL_INTERVAL_MS } from "@/lib/chat-config";

interface MonthlyScenario {
  mois: string;
  "Sans intervention": number;
  "Realite observee": number;
  "Praedixa 100%": number;
}

function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

function aggregateByMonth(packs: ProofPack[]): MonthlyScenario[] {
  const grouped = new Map<
    string,
    { bau: number; reel: number; opt: number; sortKey: string }
  >();

  for (const pack of packs) {
    const key = formatMonth(pack.month);
    const existing = grouped.get(key) ?? {
      bau: 0,
      reel: 0,
      opt: 0,
      sortKey: pack.month,
    };
    existing.bau += pack.coutBauEur;
    existing.reel += pack.coutReelEur;
    existing.opt += pack.cout100Eur;
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
    .map(([mois, values]) => ({
      mois,
      "Sans intervention": Math.round(values.bau),
      "Realite observee": Math.round(values.reel),
      "Praedixa 100%": Math.round(values.opt),
    }));
}

const chartValueFormatter = (v: number) => `${v.toLocaleString("fr-FR")} EUR`;

export const ScenarioComparisonChart = memo(function ScenarioComparisonChart() {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const {
    data: proofPacks,
    loading,
    error,
    refetch,
  } = useApiGet<ProofPack[]>("/api/v1/live/proof?page=1&page_size=200", {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });
  const chartData = useMemo(
    () => aggregateByMonth(proofPacks ?? []),
    [proofPacks],
  );
  const selectedScenario = useMemo(() => {
    if (chartData.length === 0) return null;
    return (
      chartData.find((row) => row.mois === selectedMonth) ??
      chartData[chartData.length - 1]
    );
  }, [chartData, selectedMonth]);

  useEffect(() => {
    if (chartData.length === 0) {
      setSelectedMonth(null);
      return;
    }
    if (selectedMonth && chartData.some((row) => row.mois === selectedMonth)) {
      return;
    }
    setSelectedMonth(chartData[chartData.length - 1].mois);
  }, [chartData, selectedMonth]);

  if (loading) {
    return <SkeletonChart />;
  }

  if (error) {
    return <ErrorFallback message={error} onRetry={refetch} />;
  }

  if (!proofPacks || proofPacks.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-5 w-5 text-gray-400" />}
        title="Aucun bilan disponible"
        description="Les comparaisons de scenarios apparaitront ici apres le premier mois d'utilisation."
      />
    );
  }

  return (
    <div data-testid="scenario-comparison-chart">
      <p className="mb-3 text-xs text-gray-500">
        Compare le cout sans intervention, la realite observee et le scenario
        d&apos;application complete des recommandations.
      </p>
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white/70">
        <div className="h-[300px] sm:h-[340px] md:h-[360px]">
          <ChartErrorBoundary>
            <AreaChart
              data={chartData}
              index="mois"
              categories={[
                "Sans intervention",
                "Realite observee",
                "Praedixa 100%",
              ]}
              colors={["red", "amber", "emerald"]}
              valueFormatter={chartValueFormatter}
              showLegend
              showGridLines={false}
              curveType="monotone"
              className="h-full w-full"
            />
          </ChartErrorBoundary>
        </div>
      </div>
      {selectedScenario && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-600">
            Cliquez sur un mois pour afficher le detail des trois trajectoires.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {chartData.map((row) => {
              const active = row.mois === selectedScenario.mois;
              return (
                <button
                  key={row.mois}
                  onClick={() => setSelectedMonth(row.mois)}
                  aria-label={`Voir le detail pour ${row.mois}`}
                  aria-pressed={active}
                  className={`min-h-[36px] rounded-full px-3 py-1 text-xs ${
                    active
                      ? "bg-amber-500 text-white"
                      : "bg-white text-gray-600 hover:bg-amber-50"
                  }`}
                >
                  {row.mois}
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 text-xs text-gray-700 sm:grid-cols-3">
            <div>
              <p className="text-gray-500">Sans intervention</p>
              <p className="font-semibold">
                {selectedScenario["Sans intervention"].toLocaleString("fr-FR")}{" "}
                EUR
              </p>
            </div>
            <div>
              <p className="text-gray-500">Realite observee</p>
              <p className="font-semibold">
                {selectedScenario["Realite observee"].toLocaleString("fr-FR")}{" "}
                EUR
              </p>
            </div>
            <div>
              <p className="text-gray-500">Praedixa 100%</p>
              <p className="font-semibold">
                {selectedScenario["Praedixa 100%"].toLocaleString("fr-FR")} EUR
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ScenarioComparisonChart.displayName = "ScenarioComparisonChart";
