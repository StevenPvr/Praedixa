"use client";

import { BarChart } from "@tremor/react";
import { SkeletonChart } from "@praedixa/ui";

interface DailyForecastData {
  riskScore: number;
  departmentId: string | null;
}

interface RiskDistributionChartProps {
  dailyData: DailyForecastData[] | null;
  loading: boolean;
}

function classifyRisk(score: number): "low" | "medium" | "high" {
  if (score <= 0.3) return "low";
  if (score <= 0.6) return "medium";
  return "high";
}

export function RiskDistributionChart({
  dailyData,
  loading,
}: RiskDistributionChartProps) {
  if (loading) {
    return <SkeletonChart />;
  }

  if (!dailyData || dailyData.length === 0) {
    return null;
  }

  // Aggregate risk distribution by department
  const deptMap = new Map<
    string,
    { low: number; medium: number; high: number }
  >();

  for (const d of dailyData) {
    const key = d.departmentId ?? "Global";
    const entry = deptMap.get(key) ?? { low: 0, medium: 0, high: 0 };
    entry[classifyRisk(d.riskScore)] += 1;
    deptMap.set(key, entry);
  }

  const chartData = Array.from(deptMap.entries()).map(
    ([dept, { low, medium, high }]) => ({
      Departement: dept === "Global" ? "Global" : `Dept. ${dept.slice(0, 8)}`,
      Faible: low,
      Moyen: medium,
      Eleve: high,
    }),
  );

  return (
    <section aria-label="Distribution du risque">
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <h2 className="text-base font-semibold text-charcoal">
          Distribution du risque par departement
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Nombre de jours par niveau de risque
        </p>
        <div className="mt-4 overflow-x-auto" style={{ minHeight: "280px" }}>
          <BarChart
            data={chartData}
            index="Departement"
            categories={["Faible", "Moyen", "Eleve"]}
            colors={["emerald", "amber", "rose"]}
            stack
            showLegend
            showGridLines={false}
            valueFormatter={(v: number) => `${v}j`}
            className="h-72 min-w-[320px]"
          />
        </div>
      </div>
    </section>
  );
}
