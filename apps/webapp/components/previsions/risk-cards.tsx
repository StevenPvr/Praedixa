"use client";

import Link from "next/link";
import { SkeletonCard } from "@praedixa/ui";

interface DailyForecastData {
  forecastDate: string;
  dimension: string;
  predictedDemand: number;
  predictedCapacity: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
  departmentId: string | null;
}

interface RiskCardsProps {
  dailyData: DailyForecastData[] | null;
  loading: boolean;
  dimension: "human" | "merchandise";
}

interface DeptRisk {
  departmentId: string;
  avgRisk: number;
  maxRisk: number;
  days: number;
}

function riskColor(score: number): string {
  if (score <= 0.3) return "border-success-500 bg-success-50";
  if (score <= 0.6) return "border-warning-500 bg-warning-50";
  return "border-danger-500 bg-danger-50";
}

function riskLabel(score: number): string {
  if (score <= 0.3) return "Faible";
  if (score <= 0.6) return "Moyen";
  return "Eleve";
}

function riskTextColor(score: number): string {
  if (score <= 0.3) return "text-success-700";
  if (score <= 0.6) return "text-warning-700";
  return "text-danger-700";
}

export function RiskCards({ dailyData, loading, dimension }: RiskCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (!dailyData || dailyData.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-card border border-dashed border-gray-300 p-8">
        <p className="text-sm text-gray-400">
          Aucune donnee de risque disponible
        </p>
      </div>
    );
  }

  // Aggregate risk by department
  const deptMap = new Map<
    string,
    { totalRisk: number; maxRisk: number; count: number }
  >();
  for (const d of dailyData) {
    const key = d.departmentId ?? "global";
    const entry = deptMap.get(key) ?? { totalRisk: 0, maxRisk: 0, count: 0 };
    entry.totalRisk += d.riskScore;
    entry.maxRisk = Math.max(entry.maxRisk, d.riskScore);
    entry.count += 1;
    deptMap.set(key, entry);
  }

  const deptRisks: DeptRisk[] = Array.from(deptMap.entries())
    .map(([departmentId, { totalRisk, maxRisk, count }]) => ({
      departmentId,
      avgRisk: totalRisk / count,
      maxRisk,
      days: count,
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk);

  const dimLabel = dimension === "human" ? "humaine" : "marchandise";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {deptRisks.map((dept) => (
        <Link
          key={dept.departmentId}
          href={`/previsions/${dimLabel}`}
          className={`block rounded-card border-l-4 bg-card p-4 shadow-card transition-shadow hover:shadow-card-hover ${riskColor(dept.avgRisk)}`}
        >
          <p className="text-sm font-medium text-charcoal">
            {dept.departmentId === "global"
              ? "Tous departements"
              : `Dept. ${dept.departmentId.slice(0, 8)}`}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`font-serif text-2xl font-semibold ${riskTextColor(dept.avgRisk)}`}
            >
              {(dept.avgRisk * 100).toFixed(0)}
            </span>
            <span className="text-sm text-gray-500">/ 100</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span
              className={`text-xs font-medium ${riskTextColor(dept.avgRisk)}`}
            >
              Risque {riskLabel(dept.avgRisk)}
            </span>
            <span className="text-xs text-gray-400">{dept.days}j</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
