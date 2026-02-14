import { describe, it, expect } from "vitest";
import {
  SEVERITY_LABELS,
  HORIZON_LABELS,
  ALERT_STATUS_LABELS,
  formatDateShort,
  formatDateFull,
  formatDateOrDash,
  formatSeverity,
  formatHorizon,
  formatAlertStatus,
  formatCurrency,
  formatPercent,
  formatPercentFromDecimal,
  getSeverityBadgeVariant,
} from "../formatters";

describe("formatters", () => {
  describe("SEVERITY_LABELS", () => {
    it("maps critical to Critique", () => {
      expect(SEVERITY_LABELS["critical"]).toBe("Critique");
    });

    it("maps high to Elevee", () => {
      expect(SEVERITY_LABELS["high"]).toBe("Elevee");
    });

    it("maps medium to Moderee", () => {
      expect(SEVERITY_LABELS["medium"]).toBe("Moderee");
    });

    it("maps low to Faible", () => {
      expect(SEVERITY_LABELS["low"]).toBe("Faible");
    });
  });

  describe("HORIZON_LABELS", () => {
    it("maps j3 to A 3 jours", () => {
      expect(HORIZON_LABELS["j3"]).toBe("A 3 jours");
    });

    it("maps j7 to A 7 jours", () => {
      expect(HORIZON_LABELS["j7"]).toBe("A 7 jours");
    });

    it("maps j14 to A 14 jours", () => {
      expect(HORIZON_LABELS["j14"]).toBe("A 14 jours");
    });
  });

  describe("formatDateShort", () => {
    it("formats ISO date as short French", () => {
      expect(formatDateShort("2026-02-09")).toMatch(/\d+\s+\w+/);
    });
  });

  describe("formatDateFull", () => {
    it("formats ISO date as full French", () => {
      expect(formatDateFull("2026-02-09")).toContain("2026");
      expect(formatDateFull("2026-02-09")).toMatch(/\d+/);
    });
  });

  describe("formatDateOrDash", () => {
    it("returns formatted date for non-null value", () => {
      expect(formatDateOrDash("2026-02-09")).toContain("2026");
      expect(formatDateOrDash("2026-02-09")).toMatch(/\d+/);
    });
    it("returns dash for null or empty", () => {
      expect(formatDateOrDash(null)).toBe("-");
      expect(formatDateOrDash("")).toBe("-");
    });
  });

  describe("ALERT_STATUS_LABELS", () => {
    it("maps open to En cours", () => {
      expect(ALERT_STATUS_LABELS["open"]).toBe("En cours");
    });

    it("maps acknowledged to Prise en compte", () => {
      expect(ALERT_STATUS_LABELS["acknowledged"]).toBe("Prise en compte");
    });

    it("maps resolved to Resolue", () => {
      expect(ALERT_STATUS_LABELS["resolved"]).toBe("Resolue");
    });
  });

  describe("formatSeverity", () => {
    it("translates known severity values", () => {
      expect(formatSeverity("critical")).toBe("Critique");
      expect(formatSeverity("high")).toBe("Elevee");
      expect(formatSeverity("medium")).toBe("Moderee");
      expect(formatSeverity("low")).toBe("Faible");
    });

    it("returns the original value for unknown severities", () => {
      expect(formatSeverity("unknown")).toBe("unknown");
      expect(formatSeverity("")).toBe("");
    });
  });

  describe("formatHorizon", () => {
    it("translates known horizon values", () => {
      expect(formatHorizon("j3")).toBe("A 3 jours");
      expect(formatHorizon("j7")).toBe("A 7 jours");
      expect(formatHorizon("j14")).toBe("A 14 jours");
    });

    it("returns the original value for unknown horizons", () => {
      expect(formatHorizon("j30")).toBe("j30");
      expect(formatHorizon("")).toBe("");
    });
  });

  describe("formatAlertStatus", () => {
    it("translates known status values", () => {
      expect(formatAlertStatus("open")).toBe("En cours");
      expect(formatAlertStatus("acknowledged")).toBe("Prise en compte");
      expect(formatAlertStatus("resolved")).toBe("Resolue");
    });

    it("returns the original value for unknown statuses", () => {
      expect(formatAlertStatus("pending")).toBe("pending");
      expect(formatAlertStatus("")).toBe("");
    });
  });

  describe("formatCurrency", () => {
    it("formats numbers as EUR", () => {
      expect(formatCurrency(1234)).toContain("234");
      expect(formatCurrency(1234)).toMatch(/ EUR$/);
      expect(formatCurrency(0)).toBe("0 EUR");
    });
  });

  describe("formatPercent", () => {
    it("formats numbers as percentage", () => {
      expect(formatPercent(95.5)).toBe("95.5%");
    });
    it("returns -- for null/undefined/NaN", () => {
      expect(formatPercent(null)).toBe("--");
      expect(formatPercent(undefined)).toBe("--");
      expect(formatPercent(Number.NaN)).toBe("--");
    });
  });

  describe("formatPercentFromDecimal", () => {
    it("converts 0-1 to percentage", () => {
      expect(formatPercentFromDecimal(0.85)).toBe("85%");
    });
    it("returns -- for undefined", () => {
      expect(formatPercentFromDecimal(undefined)).toBe("--");
    });
  });

  describe("getSeverityBadgeVariant", () => {
    it("returns destructive for critical and high", () => {
      expect(getSeverityBadgeVariant("critical")).toBe("destructive");
      expect(getSeverityBadgeVariant("high")).toBe("destructive");
    });
    it("returns default for medium", () => {
      expect(getSeverityBadgeVariant("medium")).toBe("default");
    });
    it("returns secondary for low", () => {
      expect(getSeverityBadgeVariant("low")).toBe("secondary");
    });
    it("returns default for unknown", () => {
      expect(getSeverityBadgeVariant("unknown")).toBe("default");
    });
  });
});
