// Build UX-friendly capacity series from forecast rows (real or mock).

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
): Array<{
  date: string;
  isoDate: string;
  "Capacite prevue actuelle": number;
  "Capacite prevue predite": number;
  "Capacite optimale predite": number;
}> {
  const sorted = [...data].sort((a, b) =>
    a.forecastDate.localeCompare(b.forecastDate),
  );
  const maxDays = options?.maxDays;
  const visible = maxDays && maxDays > 0 ? sorted.slice(-maxDays) : sorted;

  return visible.map((d) => ({
    date: formatDate(d.forecastDate),
    isoDate: d.forecastDate,
    "Capacite prevue actuelle": round2(d.capacityPlannedCurrent),
    "Capacite prevue predite": round2(d.capacityPlannedPredicted),
    "Capacite optimale predite": round2(d.capacityOptimalPredicted),
  }));
}
