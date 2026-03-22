/**
 * Client-side SARIMAX-style forecast decomposition.
 * Splits predicted demand into trend, weekly seasonality, and residuals.
 */

export interface DailyForecastData {
  forecastDate: string;
  predictedDemand: number;
  predictedCapacity: number;
  capacityPlannedCurrent: number;
  capacityPlannedPredicted: number;
  capacityOptimalPredicted: number;
  gap: number;
  riskScore: number;
  confidenceLower: number;
  confidenceUpper: number;
}

export interface DecompositionResult {
  trend: { date: string; value: number }[];
  seasonality: { day: string; value: number }[];
  residuals: { date: string; value: number }[];
  confidence: { date: string; lower: number; upper: number; mid: number }[];
}

const DAY_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];

/**
 * Convert JS getDay() (0=Sunday) to ISO weekday index (0=Monday).
 */
function toIsoWeekday(jsDay: number): number {
  return (jsDay + 6) % 7;
}

/**
 * Simple least-squares linear regression: y = intercept + slope * x.
 * Returns { slope, intercept }. If n < 2, slope = 0 and intercept = mean.
 */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
} {
  const n = values.length;
  /* c8 ignore next 1 -- decomposeForecast short-circuits empty arrays */
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const value = values[i] ?? 0;
    sumX += i;
    sumY += value;
    sumXY += i * value;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  /* c8 ignore next 1 -- mathematically unreachable for n >= 2 with sequential x */
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

export function decomposeForecast(
  data: DailyForecastData[],
): DecompositionResult {
  if (data.length === 0) {
    return { trend: [], seasonality: [], residuals: [], confidence: [] };
  }

  const demands = data.map((d) => d.predictedDemand);
  const { slope, intercept } = linearRegression(demands);

  // Compute trend values
  const trendValues = data.map((_, i) => intercept + slope * i);

  // Compute day-of-week indices
  const dayIndices = data.map((d) =>
    toIsoWeekday(new Date(d.forecastDate).getDay()),
  );

  // Compute seasonality: mean of (demand - trend) per weekday
  const daySums: number[] = Array(7).fill(0);
  const dayCounts: number[] = Array(7).fill(0);

  for (let i = 0; i < data.length; i++) {
    const dayIndex = dayIndices[i];
    if (dayIndex === undefined) {
      continue;
    }

    const detrended = (demands[i] ?? 0) - (trendValues[i] ?? 0);
    daySums[dayIndex] = (daySums[dayIndex] ?? 0) + detrended;
    dayCounts[dayIndex] = (dayCounts[dayIndex] ?? 0) + 1;
  }

  const seasonalValues: number[] = Array(7).fill(0);
  for (let d = 0; d < 7; d++) {
    const dayCount = dayCounts[d] ?? 0;
    const daySum = daySums[d] ?? 0;
    seasonalValues[d] = dayCount > 0 ? daySum / dayCount : 0;
  }

  return {
    trend: data.map((d, i) => ({
      date: d.forecastDate,
      value: Math.round((trendValues[i] ?? 0) * 100) / 100,
    })),
    seasonality: DAY_LABELS.map((label, i) => ({
      day: label,
      value: Math.round((seasonalValues[i] ?? 0) * 100) / 100,
    })),
    residuals: data.map((d, i) => {
      const dayIndex = dayIndices[i];
      const seasonalValue =
        dayIndex === undefined ? 0 : (seasonalValues[dayIndex] ?? 0);

      return {
        date: d.forecastDate,
        value:
          Math.round(
            ((demands[i] ?? 0) - (trendValues[i] ?? 0) - seasonalValue) * 100,
          ) / 100,
      };
    }),
    confidence: data.map((d) => ({
      date: d.forecastDate,
      lower: d.confidenceLower,
      upper: d.confidenceUpper,
      mid: d.predictedDemand,
    })),
  };
}

const DRIVER_LABELS: Record<string, string> = {
  absences_prevues: "Absences prevues",
  sous_effectif_chronique: "Sous-effectif recurrent",
  pic_activite: "Pic d'activite",
  conges_simultanes: "Conges simultanes",
  formation: "Formation programmee",
  turnover: "Turnover eleve",
};

function friendlyLabel(driver: string): string {
  return (
    DRIVER_LABELS[driver] ?? driver.charAt(0).toUpperCase() + driver.slice(1)
  );
}

export function extractFeatureImportance(
  alerts: { driversJson: string[] }[],
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  let total = 0;

  for (const alert of alerts) {
    for (const driver of alert.driversJson) {
      counts.set(driver, (counts.get(driver) ?? 0) + 1);
      total++;
    }
  }

  if (total === 0) return [];

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([driver, count]) => ({
      label: friendlyLabel(driver),
      value: Math.round((count / total) * 100 * 100) / 100,
    }));
}
