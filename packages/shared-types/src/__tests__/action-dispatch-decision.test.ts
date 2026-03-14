import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  ActionDispatchDecisionRequest,
  ActionDispatchDecisionResponse,
} from "../api/action-dispatch-decision.js";

describe("action-dispatch-decision API types", () => {
  it("accepts persisted dispatch lifecycle decisions", () => {
    assertType<ActionDispatchDecisionRequest>({
      outcome: "failed",
      reasonCode: "connector_timeout",
      comment: "UKG timeout after two retries.",
      errorCode: "UKG_TIMEOUT",
      errorMessage: "Timeout upstream.",
      occurredAt: "2026-03-14T10:00:00.000Z",
      latencyMs: 4200,
    });
  });

  it("returns synchronized action and ledger statuses", () => {
    expectTypeOf<ActionDispatchDecisionResponse>().toHaveProperty(
      "actionStatus",
    );
    expectTypeOf<ActionDispatchDecisionResponse>().toHaveProperty(
      "ledgerStatus",
    );
    expectTypeOf<ActionDispatchDecisionResponse>().toHaveProperty(
      "retryEligible",
    );
  });
});
