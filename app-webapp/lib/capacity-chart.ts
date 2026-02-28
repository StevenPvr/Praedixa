// Build UX-friendly capacity series from forecast rows (real or mock).

export const CAPACITY_CHART_CATEGORIES = [
  "Capacite prevue actuelle",
  "Capacite prevue predite",
  "Capacite optimale predite",
] as const;
type CapacityChartCategory = (typeof CAPACITY_CHART_CATEGORIES)[number];
export type CapacitySeriesPoint = {
  date: string;
  isoDate: string;
} & Record<CapacityChartCategory, number>;

export interface CapacityDailyForecast {
  forecastDate: string;
  capacityOptimalPredicted: number;
  capacityPlannedPredicted: number;
  capacityPlannedCurrent: number;
}

interface CapacitySeriesOptions {
  maxDays?: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function buildCapacitySeries(
  data: CapacityDailyForecast[],
  formatDate: (isoDate: string) => string,
  options?: CapacitySeriesOptions,
): CapacitySeriesPoint[] {
  const sorted = [...data].toSorted((a, b) =>
    a.forecastDate.localeCompare(b.forecastDate),
  );
  const maxDays = options?.maxDays;
  const visible = maxDays && maxDays > 0 ? sorted.slice(-maxDays) : sorted;

  return visible.map((d) => ({
    date: formatDate(d.forecastDate),
    isoDate: d.forecastDate,
    [CAPACITY_CHART_CATEGORIES[0]]: round2(d.capacityPlannedCurrent),
    [CAPACITY_CHART_CATEGORIES[1]]: round2(d.capacityPlannedPredicted),
    [CAPACITY_CHART_CATEGORIES[2]]: round2(d.capacityOptimalPredicted),
  }));
}
