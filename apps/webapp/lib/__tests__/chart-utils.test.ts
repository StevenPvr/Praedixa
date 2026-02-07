import { describe, it, expect } from "vitest";
import {
  chartColors,
  getRiskColor,
  getRiskTextClass,
  getRiskBgClass,
} from "../chart-utils";

describe("chartColors", () => {
  it("has all expected color keys", () => {
    expect(Object.keys(chartColors)).toEqual(
      expect.arrayContaining([
        "amber",
        "success",
        "warning",
        "danger",
        "blue",
        "gray",
      ]),
    );
  });

  it("each color has bg, stroke, and fill properties", () => {
    for (const color of Object.values(chartColors)) {
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("stroke");
      expect(color).toHaveProperty("fill");
    }
  });
});

describe("getRiskColor", () => {
  it('returns "success" for score <= 0.3', () => {
    expect(getRiskColor(0)).toBe("success");
    expect(getRiskColor(0.1)).toBe("success");
    expect(getRiskColor(0.3)).toBe("success");
  });

  it('returns "warning" for score 0.3 < x <= 0.6', () => {
    expect(getRiskColor(0.31)).toBe("warning");
    expect(getRiskColor(0.5)).toBe("warning");
    expect(getRiskColor(0.6)).toBe("warning");
  });

  it('returns "danger" for score > 0.6', () => {
    expect(getRiskColor(0.61)).toBe("danger");
    expect(getRiskColor(0.9)).toBe("danger");
    expect(getRiskColor(1)).toBe("danger");
  });
});

describe("getRiskTextClass", () => {
  it("returns success text class for low risk", () => {
    expect(getRiskTextClass(0.2)).toBe("text-success-600");
  });

  it("returns warning text class for medium risk", () => {
    expect(getRiskTextClass(0.5)).toBe("text-warning-600");
  });

  it("returns danger text class for high risk", () => {
    expect(getRiskTextClass(0.8)).toBe("text-danger-600");
  });
});

describe("getRiskBgClass", () => {
  it("returns success bg class for low risk", () => {
    expect(getRiskBgClass(0.2)).toBe("bg-success-50");
  });

  it("returns warning bg class for medium risk", () => {
    expect(getRiskBgClass(0.5)).toBe("bg-warning-50");
  });

  it("returns danger bg class for high risk", () => {
    expect(getRiskBgClass(0.8)).toBe("bg-danger-50");
  });
});
