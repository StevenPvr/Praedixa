"use client";

import { AreaChart } from "@tremor/react";
import { Inbox } from "lucide-react";
import type { ProofPack } from "@praedixa/shared-types";
import { SkeletonChart } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-fallback";
import { EmptyState } from "@/components/empty-state";

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

export function ScenarioComparisonChart() {
  const {
    data: proofPacks,
    loading,
    error,
    refetch,
  } = useApiGet<ProofPack[]>("/api/v1/proof");

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

  const chartData = aggregateByMonth(proofPacks);

  return (
    <div data-testid="scenario-comparison-chart">
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white/70">
        <div className="h-[300px] sm:h-[340px] md:h-[360px]">
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
        </div>
      </div>
    </div>
  );
}
