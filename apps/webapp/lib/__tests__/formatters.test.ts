import { describe, it, expect } from "vitest";
import {
  SEVERITY_LABELS,
  HORIZON_LABELS,
  ALERT_STATUS_LABELS,
  formatSeverity,
  formatHorizon,
  formatAlertStatus,
} from "../formatters";

describe("formatters", () => {
  /* --- SEVERITY_LABELS --- */

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

  /* --- HORIZON_LABELS --- */

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

  /* --- ALERT_STATUS_LABELS --- */

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

  /* --- formatSeverity --- */

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

  /* --- formatHorizon --- */

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

  /* --- formatAlertStatus --- */

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
});
