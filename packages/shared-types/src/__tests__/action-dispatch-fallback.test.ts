import { describe, expectTypeOf, it } from "vitest";

import type {
  ActionDispatchFallbackRequest,
  ActionDispatchFallbackResponse,
} from "../api/action-dispatch-fallback.js";

describe("action-dispatch-fallback API types", () => {
  it("supports preparing or executing a human fallback", () => {
    expectTypeOf<ActionDispatchFallbackRequest>().toMatchTypeOf<
      | {
          operation: "prepare";
          reasonCode: string;
          comment?: string;
          occurredAt?: string;
          channel: "export" | "link" | "notification" | "task_copy";
          reference?: string;
        }
      | {
          operation: "execute";
          reasonCode: string;
          comment?: string;
          occurredAt?: string;
        }
    >();
  });

  it("returns a persisted fallback outcome", () => {
    expectTypeOf<ActionDispatchFallbackResponse>().toHaveProperty("actionId");
    expectTypeOf<ActionDispatchFallbackResponse>().toHaveProperty(
      "fallbackStatus",
    );
    expectTypeOf<ActionDispatchFallbackResponse>().toHaveProperty(
      "ledgerStatus",
    );
  });
});
