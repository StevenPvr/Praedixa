import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  LedgerDecisionRequest,
  LedgerDecisionResponse,
} from "../api/ledger-decision.js";

describe("ledger-decision API types", () => {
  it("accepts close and recalculation payloads with explicit actuals and ROI", () => {
    assertType<LedgerDecisionRequest>({
      operation: "close",
      reasonCode: "period_complete",
      comment: "Month-end finance close.",
      actual: {
        recordedAt: "2026-03-31T18:00:00.000Z",
        values: {
          actual_service_pct: 0.97,
          dispatch_cost_eur: 320,
        },
      },
      roi: {
        validationStatus: "estimated",
        components: [
          {
            key: "bau_cost_avoidance_eur",
            label: "BAU cost avoidance",
            kind: "benefit",
            value: 920,
            validationStatus: "estimated",
          },
        ],
      },
    });
  });

  it("accepts validation-only updates", () => {
    assertType<LedgerDecisionRequest>({
      operation: "validate",
      reasonCode: "finance_review_complete",
      validationStatus: "validated",
    });
  });

  it("returns revision-aware ledger write results", () => {
    expectTypeOf<LedgerDecisionResponse>().toHaveProperty("selectedRevision");
    expectTypeOf<LedgerDecisionResponse>().toHaveProperty("exportReadyFormats");
  });
});
