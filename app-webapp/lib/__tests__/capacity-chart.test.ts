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
});
