import type {
  WeeklySummary,
  ProofPack,
  CoverageAlert,
} from "@praedixa/shared-types";
import type { WaterfallItem } from "@/components/ui/waterfall-chart";

export function getISOWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}

export function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 4);
  return d.toISOString().slice(0, 10);
}

export function buildWeeklySummaries(
  alertsData: CoverageAlert[],
): WeeklySummary[] {
  if (!alertsData || alertsData.length === 0) return [];

  const grouped = new Map<string, CoverageAlert[]>();
  for (const alert of alertsData) {
    const weekStart = getISOWeekStart(alert.alertDate);
    if (!grouped.has(weekStart)) grouped.set(weekStart, []);
    grouped.get(weekStart)!.push(alert);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([weekStart, weekAlerts]) => ({
      weekStart,
      weekEnd: getWeekEnd(weekStart),
      totalAlerts: weekAlerts.length,
      alertsResolved: weekAlerts.filter((a) => a.status === "resolved").length,
      alertsPending: weekAlerts.filter((a) => a.status !== "resolved").length,
      totalCostEur: Math.round(
        weekAlerts.reduce((s, a) => s + (a.gapH ?? 0) * 40, 0),
      ),
      avgServicePct:
        weekAlerts.length > 0
          ? Math.round(
              (weekAlerts.reduce(
                (s, a) => s + (1 - (a.pRupture ?? 0)) * 100,
                0,
              ) /
                weekAlerts.length) *
                10,
            ) / 10
          : 0,
      topSites: [],
    }));
}

export function buildWaterfallFromProofs(
  proofsData: ProofPack[],
): WaterfallItem[] {
  if (!proofsData || proofsData.length === 0) return [];

  const totalBau = proofsData.reduce((s, p) => s + p.coutBauEur, 0);
  const totalReel = proofsData.reduce((s, p) => s + p.coutReelEur, 0);
  const totalGain = proofsData.reduce((s, p) => s + p.gainNetEur, 0);
  const total100 = proofsData.reduce((s, p) => s + p.cout100Eur, 0);

  const items: WaterfallItem[] = [
    { label: "Sans intervention", value: totalBau, type: "total" },
  ];

  const interimSaving = total100 - totalBau;
  if (interimSaving !== 0) {
    items.push({
      label: "Gain par reajustement",
      value: interimSaving,
      type: interimSaving < 0 ? "negative" : "positive",
    });
  }

  if (totalGain !== 0) {
    items.push({
      label: "Economies nettes",
      value: -totalGain,
      type: totalGain > 0 ? "negative" : "positive",
    });
  }

  items.push({ label: "Cout final", value: totalReel, type: "total" });

  return items;
}

export interface ForecastRunSummary {
  id: string;
  modelType: string;
  horizonDays: number;
  status: string;
  accuracyScore: number | null;
  startedAt: string | null;
  completedAt: string | null;
}

export function toPercent(value: number): number {
  return value <= 1 ? value * 100 : value;
}
