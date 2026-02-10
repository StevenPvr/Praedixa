import { describe, it, expect } from "vitest";
import {
  decomposeForecast,
  extractFeatureImportance,
} from "../forecast-decomposition";
import type { DailyForecastData } from "../forecast-decomposition";

/* ─── Helpers ──────────────────────────────────── */

function makeDay(
  forecastDate: string,
  predictedDemand: number,
  overrides: Partial<DailyForecastData> = {},
): DailyForecastData {
  return {
    forecastDate,
    predictedDemand,
    predictedCapacity: overrides.predictedCapacity ?? 100,
    capacityPlannedCurrent: overrides.capacityPlannedCurrent ?? 100,
    capacityPlannedPredicted: overrides.capacityPlannedPredicted ?? 100,
    capacityOptimalPredicted:
      overrides.capacityOptimalPredicted ?? predictedDemand,
    gap: overrides.gap ?? predictedDemand - 100,
    riskScore: overrides.riskScore ?? 0.5,
    confidenceLower: overrides.confidenceLower ?? predictedDemand - 10,
    confidenceUpper: overrides.confidenceUpper ?? predictedDemand + 10,
  };
}

/* ─── decomposeForecast ────────────────────────── */

describe("decomposeForecast", () => {
  it("returns empty arrays for empty input", () => {
    const result = decomposeForecast([]);
    expect(result.trend).toEqual([]);
    expect(result.seasonality).toEqual([]);
    expect(result.residuals).toEqual([]);
    expect(result.confidence).toEqual([]);
  });

  it("handles a single data point without crashing", () => {
    const data = [makeDay("2026-02-09", 120)]; // Monday
    const result = decomposeForecast(data);

    expect(result.trend).toHaveLength(1);
    expect(result.trend[0].value).toBe(120);
    expect(result.seasonality).toHaveLength(7);
    expect(result.residuals).toHaveLength(1);
    expect(result.residuals[0].value).toBe(0);
    expect(result.confidence).toHaveLength(1);
  });

  it("computes correct linear trend on perfectly linear data", () => {
    // 7 days Mon-Sun with demand = 100 + 10*i
    const data = [
      makeDay("2026-02-09", 100), // Mon, i=0
      makeDay("2026-02-10", 110), // Tue, i=1
      makeDay("2026-02-11", 120), // Wed, i=2
      makeDay("2026-02-12", 130), // Thu, i=3
      makeDay("2026-02-13", 140), // Fri, i=4
      makeDay("2026-02-14", 150), // Sat, i=5
      makeDay("2026-02-15", 160), // Sun, i=6
    ];

    const result = decomposeForecast(data);

    // Trend should be 100 + 10*i
    expect(result.trend[0].value).toBeCloseTo(100, 1);
    expect(result.trend[3].value).toBeCloseTo(130, 1);
    expect(result.trend[6].value).toBeCloseTo(160, 1);
  });

  it("computes seasonality means per weekday after detrending", () => {
    // 2 weeks of same pattern: Mon=high, Tue=low, rest=flat
    const data = [
      makeDay("2026-02-09", 120), // Mon week1
      makeDay("2026-02-10", 80), // Tue week1
      makeDay("2026-02-11", 100), // Wed week1
      makeDay("2026-02-12", 100), // Thu week1
      makeDay("2026-02-13", 100), // Fri week1
      makeDay("2026-02-14", 100), // Sat week1
      makeDay("2026-02-15", 100), // Sun week1
      makeDay("2026-02-16", 120), // Mon week2
      makeDay("2026-02-17", 80), // Tue week2
      makeDay("2026-02-18", 100), // Wed week2
      makeDay("2026-02-19", 100), // Thu week2
      makeDay("2026-02-20", 100), // Fri week2
      makeDay("2026-02-21", 100), // Sat week2
      makeDay("2026-02-22", 100), // Sun week2
    ];

    const result = decomposeForecast(data);

    // Monday seasonality should be positive (above trend)
    const mondayEffect = result.seasonality[0]; // index 0 = Lundi
    expect(mondayEffect.day).toBe("Lundi");
    expect(mondayEffect.value).toBeGreaterThan(0);

    // Tuesday seasonality should be negative (below trend)
    const tuesdayEffect = result.seasonality[1]; // index 1 = Mardi
    expect(tuesdayEffect.day).toBe("Mardi");
    expect(tuesdayEffect.value).toBeLessThan(0);
  });

  it("residuals satisfy: demand = trend + seasonality + residual", () => {
    const data = [
      makeDay("2026-02-09", 120),
      makeDay("2026-02-10", 95),
      makeDay("2026-02-11", 130),
      makeDay("2026-02-12", 85),
      makeDay("2026-02-13", 110),
    ];

    const result = decomposeForecast(data);

    for (let i = 0; i < data.length; i++) {
      const dayIndex = (new Date(data[i].forecastDate).getDay() + 6) % 7;
      const reconstructed =
        result.trend[i].value +
        result.seasonality[dayIndex].value +
        result.residuals[i].value;
      expect(reconstructed).toBeCloseTo(data[i].predictedDemand, 1);
    }
  });

  it("confidence values come directly from input data", () => {
    const data = [
      makeDay("2026-02-09", 100, {
        confidenceLower: 85,
        confidenceUpper: 115,
      }),
      makeDay("2026-02-10", 110, {
        confidenceLower: 95,
        confidenceUpper: 125,
      }),
    ];

    const result = decomposeForecast(data);

    expect(result.confidence[0]).toEqual({
      date: "2026-02-09",
      lower: 85,
      upper: 115,
      mid: 100,
    });
    expect(result.confidence[1]).toEqual({
      date: "2026-02-10",
      lower: 95,
      upper: 125,
      mid: 110,
    });
  });

  it("seasonality has 7 entries with correct day labels", () => {
    const data = [makeDay("2026-02-09", 100)];
    const result = decomposeForecast(data);

    expect(result.seasonality).toHaveLength(7);
    const dayNames = result.seasonality.map((s) => s.day);
    expect(dayNames).toEqual([
      "Lundi",
      "Mardi",
      "Mercredi",
      "Jeudi",
      "Vendredi",
      "Samedi",
      "Dimanche",
    ]);
  });

  it("handles constant data (zero slope)", () => {
    const data = [
      makeDay("2026-02-09", 100),
      makeDay("2026-02-10", 100),
      makeDay("2026-02-11", 100),
    ];

    const result = decomposeForecast(data);

    // All trend values should be 100
    for (const t of result.trend) {
      expect(t.value).toBeCloseTo(100, 1);
    }
  });
});

/* ─── extractFeatureImportance ─────────────────── */

describe("extractFeatureImportance", () => {
  it("returns empty array for empty alerts", () => {
    expect(extractFeatureImportance([])).toEqual([]);
  });

  it("returns empty array when all driversJson are empty", () => {
    const alerts = [{ driversJson: [] }, { driversJson: [] }];
    expect(extractFeatureImportance(alerts)).toEqual([]);
  });

  it("counts driver frequencies correctly", () => {
    const alerts = [
      { driversJson: ["absences_prevues", "pic_activite"] },
      { driversJson: ["absences_prevues", "formation"] },
      { driversJson: ["absences_prevues"] },
    ];

    const result = extractFeatureImportance(alerts);

    // absences_prevues: 3/5 = 60%, pic_activite: 1/5 = 20%, formation: 1/5 = 20%
    expect(result[0].label).toBe("Absences prevues");
    expect(result[0].value).toBe(60);

    expect(result).toHaveLength(3);
  });

  it("sorts by frequency descending", () => {
    const alerts = [
      { driversJson: ["formation", "turnover"] },
      { driversJson: ["formation", "turnover"] },
      { driversJson: ["formation"] },
    ];

    const result = extractFeatureImportance(alerts);

    expect(result[0].label).toBe("Formation programmee");
    expect(result[1].label).toBe("Turnover eleve");
    expect(result[0].value).toBeGreaterThan(result[1].value);
  });

  it("maps known drivers to nooby-friendly labels", () => {
    const alerts = [
      {
        driversJson: [
          "absences_prevues",
          "sous_effectif_chronique",
          "pic_activite",
          "conges_simultanes",
          "formation",
          "turnover",
        ],
      },
    ];

    const result = extractFeatureImportance(alerts);
    const labels = result.map((r) => r.label);

    expect(labels).toContain("Absences prevues");
    expect(labels).toContain("Sous-effectif recurrent");
    expect(labels).toContain("Pic d'activite");
    expect(labels).toContain("Conges simultanes");
    expect(labels).toContain("Formation programmee");
    expect(labels).toContain("Turnover eleve");
  });

  it("capitalizes unknown drivers", () => {
    const alerts = [{ driversJson: ["custom_driver"] }];
    const result = extractFeatureImportance(alerts);

    expect(result[0].label).toBe("Custom_driver");
  });

  it("normalizes values to percentages summing to ~100", () => {
    const alerts = [
      { driversJson: ["absences_prevues", "formation"] },
      { driversJson: ["absences_prevues"] },
    ];

    const result = extractFeatureImportance(alerts);
    const totalPct = result.reduce((sum, r) => sum + r.value, 0);

    // Should be close to 100 (rounding may cause slight deviation)
    expect(totalPct).toBeCloseTo(100, 0);
  });
});
