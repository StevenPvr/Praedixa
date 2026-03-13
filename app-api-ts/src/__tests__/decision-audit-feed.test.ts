import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  DecisionAuditEntryInput,
  DecisionAuditSubject,
} from "@praedixa/shared-types/domain";
import { createDecisionAuditEntry } from "../services/decision-audit.js";
import {
  type DecisionAuditFeedCursorPayload,
  type DecisionAuditFeedRequest,
  type DecisionAuditFeedResponse,
  buildDecisionAuditFeedChainSummary,
  buildDecisionAuditFeedPageSummary,
  buildDecisionAuditFeedResponse,
  decodeDecisionAuditFeedCursor,
  encodeDecisionAuditFeedCursor,
  filterDecisionAuditFeedEntries,
  resolveDecisionAuditFeedRequest,
  sortDecisionAuditFeedEntries,
} from "../services/decision-audit-feed.js";

const USER_ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const USER_REVIEWER_ID = "77777777-7777-4777-8777-777777777777";

function buildDigest(seed: string): string {
  return seed.repeat(64).slice(0, 64);
}

function buildSubject(
  subjectType: DecisionAuditSubject["subjectType"],
): DecisionAuditSubject {
  switch (subjectType) {
    case "contract":
      return {
        subjectType,
        contractId: "coverage-core",
        contractVersion: 3,
      };
    case "approval":
      return {
        subjectType,
        approvalId: "66666666-6666-4666-8666-666666666666",
        contractId: "coverage-core",
        contractVersion: 3,
      };
    case "action":
      return {
        subjectType,
        actionId: "22222222-2222-4222-8222-222222222222",
        contractId: "coverage-core",
        contractVersion: 3,
      };
    case "ledger":
      return {
        subjectType,
        ledgerId: "55555555-5555-4555-8555-555555555555",
        revision: 2,
        contractId: "coverage-core",
        contractVersion: 3,
      };
  }
}

function buildEntryInput(
  overrides: Partial<DecisionAuditEntryInput> & {
    entryId: DecisionAuditEntryInput["entryId"];
    eventType: DecisionAuditEntryInput["eventType"];
    subject: DecisionAuditEntryInput["subject"];
    occurredAt: DecisionAuditEntryInput["occurredAt"];
    appendedAt: DecisionAuditEntryInput["appendedAt"];
  },
): DecisionAuditEntryInput {
  const { ...restOverrides } = overrides;
  return {
    actor: {
      actorType: "user",
      actorId: USER_ADMIN_ID,
      actorRole: "org_admin",
    },
    scope: {
      entityType: "site",
      selector: {
        mode: "ids",
        ids: ["site-lyon"],
      },
      horizonId: "j7",
      dimensions: {
        country: "fr",
      },
    },
    outcome: "succeeded",
    reason: {
      code: "decision.audit",
    },
    diff: {
      changedFields: [
        {
          fieldPath: "status",
          changeType: "replace",
          beforeDigest: buildDigest("a"),
          afterDigest: buildDigest("b"),
        },
      ],
    },
    payloadRef: {
      reference: "blob://decision-audit/coverage-core-v3",
      canonicalization: "json-c14n/v1",
      hashAlgorithm: "sha256",
      digest: buildDigest("c"),
      byteLength: 256,
    },
    ...restOverrides,
  };
}

function materializeEntries(
  inputs: readonly DecisionAuditEntryInput[],
): readonly ReturnType<typeof createDecisionAuditEntry>[] {
  const entries: ReturnType<typeof createDecisionAuditEntry>[] = [];
  for (const input of inputs) {
    entries.push(createDecisionAuditEntry(input, entries.at(-1)));
  }
  return entries;
}

const auditEntries = materializeEntries([
  buildEntryInput({
    entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    eventType: "contract.published",
    subject: buildSubject("contract"),
    occurredAt: "2026-03-13T10:00:00.000Z",
    appendedAt: "2026-03-13T10:00:01.000Z",
    correlationIds: {
      requestId: "req-1",
      traceId: "trace-1",
      correlationId: "33333333-3333-4333-8333-333333333333",
      causationId: "44444444-4444-4444-8444-444444444444",
      idempotencyKey: "idem-1",
    },
  }),
  buildEntryInput({
    entryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    eventType: "action.dispatched",
    subject: buildSubject("action"),
    occurredAt: "2026-03-13T10:02:00.000Z",
    appendedAt: "2026-03-13T10:02:01.000Z",
    actor: {
      actorType: "service",
      actorId: "svc-decision-runtime",
      actorRole: "worker",
    },
    correlationIds: {
      requestId: "req-2",
      traceId: "trace-1",
      correlationId: "99999999-9999-4999-8999-999999999999",
      idempotencyKey: "idem-2",
    },
  }),
  buildEntryInput({
    entryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    eventType: "action.failed",
    subject: buildSubject("action"),
    occurredAt: "2026-03-13T10:02:00.000Z",
    appendedAt: "2026-03-13T10:02:02.000Z",
    actor: {
      actorType: "service",
      actorId: "svc-decision-runtime",
      actorRole: "worker",
    },
    outcome: "failed",
    correlationIds: {
      requestId: "req-3",
      traceId: "trace-2",
      correlationId: "99999999-9999-4999-8999-999999999999",
      causationId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      idempotencyKey: "idem-2",
    },
  }),
  buildEntryInput({
    entryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    eventType: "ledger.recalculated",
    subject: buildSubject("ledger"),
    occurredAt: "2026-03-13T10:05:00.000Z",
    appendedAt: "2026-03-13T10:05:01.000Z",
    actor: {
      actorType: "system",
      actorId: "scheduler",
    },
    scope: {
      entityType: "site",
      selector: {
        mode: "ids",
        ids: ["site-paris"],
      },
      horizonId: "j14",
    },
    correlationIds: {
      requestId: "req-4",
    },
  }),
  buildEntryInput({
    entryId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
    eventType: "approval.rejected",
    subject: buildSubject("approval"),
    occurredAt: "2026-03-13T10:06:00.000Z",
    appendedAt: "2026-03-13T10:06:01.000Z",
    actor: {
      actorType: "user",
      actorId: USER_REVIEWER_ID,
      actorRole: "super_admin",
    },
    outcome: "rejected",
    correlationIds: {
      requestId: "req-5",
      traceId: "trace-3",
    },
  }),
]);

describe("decision-audit-feed service", () => {
  it("exposes the strict request, cursor and response shapes", () => {
    expectTypeOf<DecisionAuditFeedRequest>().toHaveProperty("filter");
    expectTypeOf<DecisionAuditFeedRequest>().toHaveProperty("sort");
    expectTypeOf<DecisionAuditFeedCursorPayload>().toHaveProperty("last");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("entries");
    expectTypeOf<DecisionAuditFeedResponse>().toHaveProperty("chainSummary");
  });

  it("filters by actor, subject, event, outcome, correlation and time", () => {
    const filtered = filterDecisionAuditFeedEntries(auditEntries, {
      filter: {
        time: {
          occurredFrom: "2026-03-13T10:01:00.000Z",
          occurredTo: "2026-03-13T10:03:00.000Z",
        },
        actor: {
          actorTypes: ["service"],
          actorIds: ["svc-decision-runtime"],
          actorRoles: ["worker"],
        },
        subject: {
          subjectType: "action",
          contractId: "coverage-core",
          actionId: "22222222-2222-4222-8222-222222222222",
        },
        eventTypes: ["action.failed"],
        outcomes: ["failed"],
        correlation: {
          traceIds: ["trace-2"],
          idempotencyKeys: ["idem-2"],
        },
      },
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.entryId).toBe("cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  });

  it("sorts deterministically and paginates with a request-bound cursor", () => {
    const firstPage = buildDecisionAuditFeedResponse(auditEntries, {
      sort: {
        field: "occurredAt",
        direction: "desc",
      },
      page: {
        limit: 2,
      },
    });

    expect(firstPage.entries.map((entry) => entry.entryId)).toEqual([
      "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    ]);
    expect(firstPage.page.hasMore).toBe(true);
    expect(firstPage.page.nextCursor).toBeTruthy();

    const secondPage = buildDecisionAuditFeedResponse(auditEntries, {
      sort: {
        field: "occurredAt",
        direction: "desc",
      },
      page: {
        limit: 2,
        cursor: firstPage.page.nextCursor ?? undefined,
      },
    });

    expect(secondPage.entries.map((entry) => entry.entryId)).toEqual([
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    ]);
    expect(secondPage.page.hasMore).toBe(true);
    expect(secondPage.page.nextCursor).toBeTruthy();
  });

  it("builds page and chain summaries from the returned page", () => {
    const response = buildDecisionAuditFeedResponse(auditEntries, {
      filter: {
        eventTypes: ["contract.published", "ledger.recalculated"],
      },
      sort: {
        field: "sequence",
        direction: "asc",
      },
      page: {
        limit: 10,
      },
    });

    expect(response.page).toEqual({
      matched: 2,
      returned: 2,
      limit: 10,
      hasMore: false,
      nextCursor: null,
    });
    expect(response.pageSummary.eventTypeCounts).toEqual({
      "contract.published": 1,
      "ledger.recalculated": 1,
    });
    expect(response.pageSummary.outcomeCounts).toEqual({
      succeeded: 2,
    });
    expect(response.pageSummary.actorTypeCounts).toEqual({
      system: 1,
      user: 1,
    });
    expect(response.chainSummary.isContinuous).toBe(false);
    expect(response.chainSummary.gapCount).toBe(1);
    expect(response.chainSummary.gaps[0]).toMatchObject({
      reason: "sequence_gap",
      previousSequence: 1,
      nextSequence: 4,
    });
  });

  it("fails closed on invalid filters and malformed cursors", () => {
    expect(() =>
      resolveDecisionAuditFeedRequest({
        filter: {
          time: {
            occurredFrom: "2026-03-13T11:00:00.000Z",
            occurredTo: "2026-03-13T10:00:00.000Z",
          },
        },
      }),
    ).toThrow(/occurredFrom cannot be later/i);

    expect(() =>
      buildDecisionAuditFeedResponse(auditEntries, {
        page: {
          limit: 10,
          cursor: "not-a-cursor",
        },
      }),
    ).toThrow(/invalid decision audit feed cursor/i);
  });

  it("rejects a cursor reused with a different filter fingerprint", () => {
    const resolved = resolveDecisionAuditFeedRequest({
      sort: {
        field: "occurredAt",
        direction: "desc",
      },
      page: {
        limit: 2,
      },
    });
    const sorted = sortDecisionAuditFeedEntries(
      filterDecisionAuditFeedEntries(auditEntries, resolved),
      resolved.sort,
    );
    const cursor = encodeDecisionAuditFeedCursor(resolved, sorted[1]!);

    expect(() =>
      buildDecisionAuditFeedResponse(auditEntries, {
        filter: {
          outcomes: ["failed"],
        },
        sort: {
          field: "occurredAt",
          direction: "desc",
        },
        page: {
          limit: 2,
          cursor,
        },
      }),
    ).toThrow(/does not match the current request/i);
  });

  it("exposes the cursor, page summary and chain summary helpers directly", () => {
    const resolved = resolveDecisionAuditFeedRequest({
      sort: {
        field: "sequence",
        direction: "asc",
      },
      page: {
        limit: 3,
      },
    });
    const sorted = sortDecisionAuditFeedEntries(auditEntries, resolved.sort);
    const cursor = encodeDecisionAuditFeedCursor(resolved, sorted[2]!);
    const decoded = decodeDecisionAuditFeedCursor(cursor);

    expect(decoded.last.sequence).toBe(3);
    expect(buildDecisionAuditFeedPageSummary(sorted.slice(0, 2))).toMatchObject(
      {
        eventTypeCounts: {
          "contract.published": 1,
          "action.dispatched": 1,
        },
      },
    );
    expect(
      buildDecisionAuditFeedChainSummary(sorted.slice(0, 3)),
    ).toMatchObject({
      isContinuous: true,
      gapCount: 0,
    });
  });
});
