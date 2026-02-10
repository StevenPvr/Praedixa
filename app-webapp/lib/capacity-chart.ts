// Build UX-friendly capacity series from forecast rows (real or mock).

export interface CapacityDailyForecast {
  forecastDate: string;
  capacityOptimalPredicted: number;
  capacityPlannedPredicted: number;
  capacityPlannedCurrent: number;
}

function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function buildCapacitySeries(
  data: CapacityDailyForecast[],
  formatDate: (isoDate: string) => string,
): Array<{
  date: string;
  "Capacite prevue actuelle": number;
  "Capacite prevue predite": number;
  "Capacite optimale predite": number;
}> {
  return data.map((d) => ({
    date: formatDate(d.forecastDate),
    "Capacite prevue actuelle": round2(d.capacityPlannedCurrent),
    "Capacite prevue predite": round2(d.capacityPlannedPredicted),
    "Capacite optimale predite": round2(d.capacityOptimalPredicted),
  }));
}
