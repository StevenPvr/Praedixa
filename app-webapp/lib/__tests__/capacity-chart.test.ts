import { describe, expect, it } from "vitest";
import { buildCapacitySeries } from "../capacity-chart";

const formatDate = (iso: string) => iso;

describe("buildCapacitySeries", () => {
  it("maps explicit capacity series as-is", () => {
    const out = buildCapacitySeries(
      [
        {
          forecastDate: "2026-02-10",
          capacityPlannedCurrent: 100,
          capacityPlannedPredicted: 112.995,
          capacityOptimalPredicted: 120,
        },
      ],
      formatDate,
    );

    expect(out[0]["Capacite prevue actuelle"]).toBe(100);
    expect(out[0]["Capacite optimale predite"]).toBe(120);
    expect(out[0]["Capacite prevue predite"]).toBe(113);
  });

  it("keeps each line independent", () => {
    const out = buildCapacitySeries(
      [
        {
          forecastDate: "2026-02-11",
          capacityPlannedCurrent: 95,
          capacityPlannedPredicted: 112,
          capacityOptimalPredicted: 128,
        },
      ],
      formatDate,
    );

    expect(out[0]["Capacite prevue actuelle"]).toBe(95);
    expect(out[0]["Capacite prevue predite"]).toBe(112);
    expect(out[0]["Capacite optimale predite"]).toBe(128);
  });

  it("limits to last 7 days when maxDays=7", () => {
    const input = Array.from({ length: 10 }).map((_, i) => ({
      forecastDate: `2026-02-${String(i + 1).padStart(2, "0")}`,
      capacityPlannedCurrent: i + 1,
      capacityPlannedPredicted: i + 11,
      capacityOptimalPredicted: i + 21,
    }));

    const out = buildCapacitySeries(input, formatDate, { maxDays: 7 });
    expect(out).toHaveLength(7);
    expect(out[0].isoDate).toBe("2026-02-04");
    expect(out[6].isoDate).toBe("2026-02-10");
  });
});
