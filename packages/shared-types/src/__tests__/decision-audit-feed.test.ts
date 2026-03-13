import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionAuditFeedCursorPayload,
  DecisionAuditFeedRequest,
  DecisionAuditFeedResponse,
} from "../api/decision-audit-feed.js";

describe("decision-audit-feed API types", () => {
  it("accepts filterable request payloads with cursor-safe pagination", () => {
    assertType<DecisionAuditFeedRequest>({
      filter: {
        time: {
          occurredFrom: "2026-03-13T09:00:00.000Z",
          occurredTo: "2026-03-13T11:00:00.000Z",
        },
        actor: {
          actorTypes: ["user", "service"],
          actorIds: [
            "11111111-1111-4111-8111-111111111111",
            "svc-decision-runtime",
          ],
          actorRoles: ["org_admin", "worker"],
        },
        subject: {
          subjectType: "action",
          contractId: "coverage-core",
          contractVersion: 3,
          actionId: "22222222-2222-4222-8222-222222222222",
        },
        scope: {
          entityType: "site",
          horizonId: "j7",
          selectorMode: "ids",
          selectorIds: ["site-lyon"],
          dimensions: {
            country: "fr",
          },
        },
        eventTypes: ["action.dispatched", "action.failed"],
        outcomes: ["succeeded", "failed"],
        correlation: {
          requestIds: ["req-1"],
          traceIds: ["trace-1"],
          correlationIds: ["33333333-3333-4333-8333-333333333333"],
          causationIds: ["44444444-4444-4444-8444-444444444444"],
          idempotencyKeys: ["idem-1"],
        },
      },
      sort: {
        field: "occurredAt",
        direction: "desc",
      },
      page: {
        limit: 25,
        cursor: "opaque-cursor",
      },
    });
  });

  it("exposes page, cursor, correlation and chain summaries", () => {
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("request");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("page");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("entries");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("pageSummary");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("chainSummary");
  });

  it("models opaque cursor payload internals explicitly", () => {
    expectTypeOf<DecisionAuditFeedCursorPayload>().toHaveProperty(
      "requestFingerprint",
    );
    expectTypeOf<DecisionAuditFeedCursorPayload>().toHaveProperty("sort");
    expectTypeOf<DecisionAuditFeedCursorPayload>().toHaveProperty("last");
  });
});
