import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  ActionDispatchAttemptStatus,
  ActionDispatchMode,
  ActionDispatchRecord,
  ActionDispatchRetryPolicy,
  ActionDispatchStatus,
  ActionDestinationCapabilities,
  ActionFallbackStatus,
} from "../domain/action-dispatch.js";
import type { ISODateTimeString, UUID } from "../utils/common.js";

describe("ActionDispatchStatus", () => {
  it("matches the dispatch lifecycle vocabulary", () => {
    assertType<ActionDispatchStatus>("dry_run");
    assertType<ActionDispatchStatus>("pending");
    assertType<ActionDispatchStatus>("dispatched");
    assertType<ActionDispatchStatus>("acknowledged");
    assertType<ActionDispatchStatus>("failed");
    assertType<ActionDispatchStatus>("retried");
    assertType<ActionDispatchStatus>("canceled");
  });
});

describe("ActionDispatchMode", () => {
  it("keeps dispatch modes explicit", () => {
    assertType<ActionDispatchMode>("dry_run");
    assertType<ActionDispatchMode>("live");
    assertType<ActionDispatchMode>("sandbox");
  });
});

describe("ActionDispatchAttemptStatus", () => {
  it("keeps attempt-level outcomes explicit", () => {
    assertType<ActionDispatchAttemptStatus>("dispatched");
    assertType<ActionDispatchAttemptStatus>("acknowledged");
    assertType<ActionDispatchAttemptStatus>("failed");
    assertType<ActionDispatchAttemptStatus>("retried");
    assertType<ActionDispatchAttemptStatus>("canceled");
  });
});

describe("ActionFallbackStatus", () => {
  it("tracks fallback handling state", () => {
    assertType<ActionFallbackStatus>("not_needed");
    assertType<ActionFallbackStatus>("prepared");
    assertType<ActionFallbackStatus>("executed");
    assertType<ActionFallbackStatus>("dismissed");
  });
});

describe("ActionDispatchRecord", () => {
  it("keeps identifiers and attempt history typed", () => {
    expectTypeOf<ActionDispatchRecord["actionId"]>().toEqualTypeOf<UUID>();
    expectTypeOf<
      ActionDispatchRecord["createdAt"]
    >().toEqualTypeOf<ISODateTimeString>();
    expectTypeOf<ActionDispatchRecord>().toHaveProperty("attempts");
    expectTypeOf<ActionDispatchRecord>().toHaveProperty("permissionsContext");
    expectTypeOf<ActionDispatchRecord>().toHaveProperty("idempotencyKey");
    expectTypeOf<ActionDispatchRecord>().toHaveProperty("retryPolicy");
    expectTypeOf<
      ActionDispatchRecord["destination"]["capabilities"]
    >().toEqualTypeOf<ActionDestinationCapabilities>();
    expectTypeOf<
      ActionDispatchRecord["retryPolicy"]
    >().toEqualTypeOf<ActionDispatchRetryPolicy>();
  });
});
