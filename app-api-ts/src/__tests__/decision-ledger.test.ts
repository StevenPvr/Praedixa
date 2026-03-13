import { describe, expect, it } from "vitest";

import type {
  LedgerEntry,
  LedgerMetricSnapshot,
  LedgerRoi,
  LedgerValidationStatus,
} from "@praedixa/shared-types/domain";

import {
  calculateLedgerPercentage,
  calculateLedgerRoi,
  clampLedgerRatio,
  closeLedgerEntry,
  recalculateLedgerEntry,
  setLedgerValidationStatus,
} from "../services/decision-ledger.js";

function buildActual(values: Record<string, number>): LedgerMetricSnapshot {
  return {
    recordedAt: "2026-03-15T08:00:00.000Z",
    values,
  };
}

function buildRoi(validationStatus: LedgerValidationStatus): LedgerRoi {
  return calculateLedgerRoi(
    "EUR",
    [
      {
        key: "labor_saved",
        label: "Labor saved",
        kind: "benefit",
        value: 300,
        validationStatus,
      },
      {
        key: "dispatch_cost",
        label: "Dispatch cost",
        kind: "cost",
        value: 50,
        validationStatus,
      },
    ],
    validationStatus,
  );
}

function buildLedgerEntry(status: LedgerEntry["status"] = "open"): LedgerEntry {
  return {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: "11111111-1111-1111-8111-111111111111",
    contractId: "coverage-core",
    contractVersion: 1,
    recommendationId: "22222222-2222-1222-8222-222222222222",
    status,
    revision: 1,
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon"] },
      horizonId: "j7",
    },
    baseline: {
      recordedAt: "2026-03-13T08:00:00.000Z",
      values: { cost_eur: 1000 },
    },
    recommended: {
      recordedAt: "2026-03-13T08:00:00.000Z",
      actionSummary: "Adjust schedule",
      values: { cost_eur: 850 },
    },
    approvals: [],
    action: {
      actionId: "33333333-3333-1333-8333-333333333333",
      status: "acknowledged",
      destination: "ukg",
    },
    counterfactual: {
      method: "matched_cohort",
      methodVersion: "1.2.0",
      inputs: ["coverage_gap_h", "dispatch_cost"],
    },
    roi: calculateLedgerRoi("EUR", [], "estimated"),
    explanation: {
      topDrivers: ["coverage_gap_h"],
      bindingConstraints: ["legal_rest"],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
  };
}

describe("decision ledger", () => {
  it("rejects recalculation before a ledger is closed", () => {
    expect(() =>
      recalculateLedgerEntry(
        buildLedgerEntry(),
        buildActual({ cost_eur: 780 }),
        "2026-03-15T08:00:00.000Z",
        buildRoi("validated"),
      ),
    ).toThrow(/closed ledger entries/i);
  });

  it("keeps percentages bounded and deterministic", () => {
    expect(clampLedgerRatio(1.8)).toBe(1);
    expect(clampLedgerRatio(-0.2)).toBe(0);
    expect(calculateLedgerPercentage(250, 100)).toBe(1);
    expect(calculateLedgerPercentage(-5, 100)).toBe(0);
    expect(calculateLedgerPercentage(25, 0)).toBe(0);
  });

  it("computes signed ROI and only realizes validated totals", () => {
    const estimated = buildRoi("estimated");
    const validated = buildRoi("validated");

    expect(estimated.estimatedValue).toBe(250);
    expect(estimated.realizedValue).toBeUndefined();
    expect(validated.estimatedValue).toBe(250);
    expect(validated.realizedValue).toBe(250);
    expect(validated.components.map((component) => component.key)).toEqual([
      "dispatch_cost",
      "labor_saved",
    ]);
  });

  it("tracks validation status changes explicitly", () => {
    const validated = setLedgerValidationStatus(
      buildLedgerEntry("closed"),
      "validated",
      "2026-03-16T08:00:00.000Z",
      "44444444-4444-1444-8444-444444444444",
    );

    expect(validated.roi.validationStatus).toBe("validated");
    expect(validated.roi.validatedAt).toBe("2026-03-16T08:00:00.000Z");
    expect(validated.roi.validatedBy).toBe(
      "44444444-4444-1444-8444-444444444444",
    );
    expect(validated.roi.realizedValue).toBe(0);

    const contested = setLedgerValidationStatus(
      validated,
      "contested",
      "2026-03-17T08:00:00.000Z",
    );
    expect(contested.roi.validationStatus).toBe("contested");
    expect(contested.roi.validatedAt).toBe("2026-03-16T08:00:00.000Z");
    expect(contested.roi.validatedBy).toBe(
      "44444444-4444-1444-8444-444444444444",
    );

    const estimated = setLedgerValidationStatus(
      contested,
      "estimated",
      "2026-03-18T08:00:00.000Z",
    );
    expect(estimated.roi.validationStatus).toBe("estimated");
    expect(estimated.roi.realizedValue).toBeUndefined();
    expect(estimated.roi.validatedAt).toBeUndefined();
    expect(estimated.roi.validatedBy).toBeUndefined();
  });

  it("recalculates with revision supersession lineage", () => {
    const closed = closeLedgerEntry(
      buildLedgerEntry(),
      buildActual({ cost_eur: 800 }),
      "2026-03-14T08:00:00.000Z",
      buildRoi("estimated"),
    );

    const firstRecalculation = recalculateLedgerEntry(
      closed,
      buildActual({ cost_eur: 780 }),
      "2026-03-15T08:00:00.000Z",
      buildRoi("validated"),
    );

    expect(firstRecalculation.status).toBe("recalculated");
    expect(firstRecalculation.revision).toBe(2);
    expect(firstRecalculation.supersedes).toEqual({
      ledgerId: closed.ledgerId,
      revision: 1,
    });

    const secondRecalculation = recalculateLedgerEntry(
      firstRecalculation,
      buildActual({ cost_eur: 760 }),
      "2026-03-16T08:00:00.000Z",
      buildRoi("validated"),
    );

    expect(secondRecalculation.revision).toBe(3);
    expect(secondRecalculation.supersedes).toEqual({
      ledgerId: firstRecalculation.ledgerId,
      revision: 2,
    });
    expect(secondRecalculation.closedAt).toBe("2026-03-16T08:00:00.000Z");
    expect(firstRecalculation.supersedes).toEqual({
      ledgerId: closed.ledgerId,
      revision: 1,
    });
  });
});
