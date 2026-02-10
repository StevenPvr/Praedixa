import { describe, it, expect } from "vitest";
import type { CoverageAlert } from "@praedixa/shared-types";
import {
  simulateCostCI,
  simulateServiceCI,
  formatCostRange,
  getOptionLabel,
  OPTION_TYPE_LABELS,
  sortAlertsBySeverity,
} from "../scenario-utils";

describe("simulateCostCI", () => {
  it("returns 0.8x lower and 1.2x upper", () => {
    const ci = simulateCostCI(1000);
    expect(ci.lower).toBe(800);
    expect(ci.upper).toBe(1200);
    expect(ci.mid).toBe(1000);
  });

  it("handles zero cost", () => {
    const ci = simulateCostCI(0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0);
    expect(ci.mid).toBe(0);
  });

  it("handles decimal cost", () => {
    const ci = simulateCostCI(100.5);
    expect(ci.lower).toBeCloseTo(80.4);
    expect(ci.upper).toBeCloseTo(120.6);
    expect(ci.mid).toBe(100.5);
  });
});

describe("simulateServiceCI", () => {
  it("returns service - 5 and service + 3", () => {
    const ci = simulateServiceCI(50);
    expect(ci.lower).toBe(45);
    expect(ci.upper).toBe(53);
    expect(ci.mid).toBe(50);
  });

  it("clamps lower to 0", () => {
    const ci = simulateServiceCI(3);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(6);
  });

  it("clamps upper to 100", () => {
    const ci = simulateServiceCI(99);
    expect(ci.lower).toBe(94);
    expect(ci.upper).toBe(100);
  });

  it("handles zero service", () => {
    const ci = simulateServiceCI(0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(3);
    expect(ci.mid).toBe(0);
  });

  it("handles 100 service", () => {
    const ci = simulateServiceCI(100);
    expect(ci.lower).toBe(95);
    expect(ci.upper).toBe(100);
    expect(ci.mid).toBe(100);
  });
});

describe("formatCostRange", () => {
  it("formats with FR locale", () => {
    const result = formatCostRange({ lower: 800, upper: 1200, mid: 1000 });
    // toLocaleString("fr-FR") uses non-breaking space for thousands
    expect(result).toContain("1");
    expect(result).toContain("000 EUR");
    expect(result).toContain("800");
    expect(result).toContain("200");
  });

  it("rounds values", () => {
    const result = formatCostRange({ lower: 80.4, upper: 120.6, mid: 100.5 });
    expect(result).toContain("101 EUR");
    expect(result).toContain("80");
    expect(result).toContain("121");
  });

  it("handles zero values", () => {
    const result = formatCostRange({ lower: 0, upper: 0, mid: 0 });
    expect(result).toBe("0 EUR (0 — 0 EUR)");
  });
});

describe("getOptionLabel", () => {
  it("returns label for all known types", () => {
    for (const [key, label] of Object.entries(OPTION_TYPE_LABELS)) {
      expect(getOptionLabel(key)).toBe(label);
    }
  });

  it("returns raw type for unknown type", () => {
    expect(getOptionLabel("unknown_type")).toBe("unknown_type");
  });

  it("returns empty string for empty input", () => {
    expect(getOptionLabel("")).toBe("");
  });
});

describe("sortAlertsBySeverity", () => {
  const makeAlert = (
    severity: string,
    gapH: number,
    id: string,
  ): CoverageAlert =>
    ({
      id,
      severity,
      gapH,
      siteId: "s1",
      alertDate: "2026-01-01",
      shift: "AM",
      pRupture: 0.5,
      status: "open",
      driversJson: [],
      horizon: "j7",
    }) as CoverageAlert;

  it("sorts critical first, then high, medium, low", () => {
    const alerts = [
      makeAlert("low", 1, "a1"),
      makeAlert("critical", 2, "a2"),
      makeAlert("medium", 3, "a3"),
      makeAlert("high", 4, "a4"),
    ];
    const sorted = sortAlertsBySeverity(alerts);
    expect(sorted.map((a) => a.severity)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ]);
  });

  it("sorts by gapH descending within same severity", () => {
    const alerts = [
      makeAlert("high", 2, "a1"),
      makeAlert("high", 8, "a2"),
      makeAlert("high", 5, "a3"),
    ];
    const sorted = sortAlertsBySeverity(alerts);
    expect(sorted.map((a) => a.gapH)).toEqual([8, 5, 2]);
  });

  it("does not mutate original array", () => {
    const alerts = [makeAlert("low", 1, "a1"), makeAlert("critical", 2, "a2")];
    const copy = [...alerts];
    sortAlertsBySeverity(alerts);
    expect(alerts).toEqual(copy);
  });

  it("handles empty array", () => {
    expect(sortAlertsBySeverity([])).toEqual([]);
  });

  it("handles unknown severity (placed last)", () => {
    const alerts = [
      makeAlert("unknown" as "low", 5, "a1"),
      makeAlert("low", 3, "a2"),
    ];
    const sorted = sortAlertsBySeverity(alerts);
    expect(sorted[0].id).toBe("a2");
    expect(sorted[1].id).toBe("a1");
  });

  it("sorts unknown severities by gapH when severities tie", () => {
    const alerts = [
      makeAlert("unknown" as "low", 1, "a1"),
      makeAlert("unknown" as "low", 9, "a2"),
    ];
    const sorted = sortAlertsBySeverity(alerts);
    expect(sorted.map((a) => a.id)).toEqual(["a2", "a1"]);
  });
});
