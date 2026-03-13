import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  ActionDispatchDetailDedupeStatus,
  ActionDispatchDetailPayloadRefSource,
  ActionDispatchDetailRequest,
  ActionDispatchDetailResponse,
  ActionDispatchDetailRetryBlocker,
  ActionDispatchDetailTerminalReasonCode,
  ActionDispatchDetailTimelineKind,
} from "../api/action-dispatch-detail.js";

describe("action-dispatch-detail API types", () => {
  it("accepts detail requests scoped by action identifier", () => {
    assertType<ActionDispatchDetailRequest>({
      actionId: "11111111-1111-1111-1111-111111111111",
      includePayloadRefs: true,
    });
  });

  it("keeps helper vocabularies explicit", () => {
    assertType<ActionDispatchDetailDedupeStatus>("unique");
    assertType<ActionDispatchDetailDedupeStatus>("replayed");
    assertType<ActionDispatchDetailDedupeStatus>("collision");

    assertType<ActionDispatchDetailRetryBlocker>("status_not_failed");
    assertType<ActionDispatchDetailRetryBlocker>("fallback_active");

    assertType<ActionDispatchDetailTerminalReasonCode>("acknowledged");
    assertType<ActionDispatchDetailTerminalReasonCode>("retry_exhausted");

    assertType<ActionDispatchDetailTimelineKind>("created");
    assertType<ActionDispatchDetailTimelineKind>("fallback_executed");

    assertType<ActionDispatchDetailPayloadRefSource>("payloadPreview");
    assertType<ActionDispatchDetailPayloadRefSource>("payloadFinal");
  });

  it("exposes detail facets needed by a dispatch drill-down", () => {
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("destination");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("idempotency");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("attempts");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("retryPolicy");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("fallback");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty(
      "terminalReason",
    );
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("timeline");
    expectTypeOf<ActionDispatchDetailResponse>().toHaveProperty("payloadRefs");
  });
});
