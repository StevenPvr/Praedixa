import { describe, expect, it } from "vitest";

import type {
  DecisionAuditEntryInput,
  DecisionAuditSubject,
} from "@praedixa/shared-types/domain";
import {
  appendDecisionAuditEntry,
  assertDecisionAuditIntegrity,
  createDecisionAuditEntry,
  filterDecisionAuditByScope,
  filterDecisionAuditBySubject,
  findIncoherentTerminalDecisionAuditEvent,
  listDecisionAuditIntegrityIssues,
} from "../services/decision-audit.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";

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
        contractVersion: 1,
      };
    case "approval":
      return {
        subjectType,
        approvalId: "22222222-2222-4222-8222-222222222222",
        contractId: "coverage-core",
        contractVersion: 1,
      };
    case "action":
      return {
        subjectType,
        actionId: "33333333-3333-4333-8333-333333333333",
        contractId: "coverage-core",
        contractVersion: 1,
      };
    case "ledger":
      return {
        subjectType,
        ledgerId: "44444444-4444-4444-8444-444444444444",
        revision: 1,
        contractId: "coverage-core",
        contractVersion: 1,
      };
  }
}

function buildEntryInput(
  overrides: Partial<DecisionAuditEntryInput> & {
    eventType: DecisionAuditEntryInput["eventType"];
    subject: DecisionAuditEntryInput["subject"];
  },
): DecisionAuditEntryInput {
  const { eventType, subject, ...restOverrides } = overrides;
  return {
    entryId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    eventType,
    actor: {
      actorType: "user",
      actorId: USER_ID,
      actorRole: "org_admin",
    },
    subject,
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
    correlationIds: {
      requestId: "req-001",
      traceId: "trace-001",
      correlationId: "55555555-5555-4555-8555-555555555555",
      causationId: "66666666-6666-4666-8666-666666666666",
      idempotencyKey: "idem-001",
    },
    payloadRef: {
      reference: "blob://decision-audit/coverage-core-v1",
      canonicalization: "json-c14n/v1",
      hashAlgorithm: "sha256",
      digest: buildDigest("c"),
      byteLength: 256,
    },
    occurredAt: "2026-03-13T10:00:00.000Z",
    appendedAt: "2026-03-13T10:00:01.000Z",
    ...restOverrides,
  };
}

describe("decision-audit service", () => {
  it("appends immutably and builds a deterministic hash chain", () => {
    const firstInput = buildEntryInput({
      eventType: "contract.published",
      subject: buildSubject("contract"),
    });
    const firstEntries = appendDecisionAuditEntry([], firstInput);
    const secondEntries = appendDecisionAuditEntry(
      firstEntries,
      buildEntryInput({
        entryId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        eventType: "action.dispatched",
        subject: buildSubject("action"),
        occurredAt: "2026-03-13T10:02:00.000Z",
        appendedAt: "2026-03-13T10:02:01.000Z",
      }),
    );

    expect(firstEntries).toHaveLength(1);
    expect(secondEntries).toHaveLength(2);
    expect(firstEntries).not.toBe(secondEntries);
    expect(firstEntries[0]!.chain.sequence).toBe(1);
    expect(secondEntries[1]!.chain.sequence).toBe(2);
    expect(secondEntries[1]!.chain.previousEntryHash).toBe(
      firstEntries[0]!.chain.entryHash,
    );
  });

  it("filters audit entries by subject and scope", () => {
    const entries = appendDecisionAuditEntry(
      appendDecisionAuditEntry(
        [],
        buildEntryInput({
          eventType: "contract.published",
          subject: buildSubject("contract"),
        }),
      ),
      buildEntryInput({
        entryId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        eventType: "ledger.recalculated",
        subject: buildSubject("ledger"),
        scope: {
          entityType: "site",
          selector: {
            mode: "ids",
            ids: ["site-paris"],
          },
          horizonId: "j14",
        },
        occurredAt: "2026-03-13T10:05:00.000Z",
        appendedAt: "2026-03-13T10:05:01.000Z",
      }),
    );

    expect(
      filterDecisionAuditBySubject(entries, {
        subjectType: "contract",
        contractId: "coverage-core",
      }),
    ).toHaveLength(1);
    expect(
      filterDecisionAuditByScope(entries, {
        entityType: "site",
        selectorMode: "ids",
        selectorIds: ["site-paris"],
        horizonId: "j14",
      }),
    ).toHaveLength(1);
  });

  it("fails closed when event outcome does not match the event contract", () => {
    expect(() =>
      appendDecisionAuditEntry(
        [],
        buildEntryInput({
          eventType: "approval.rejected",
          subject: buildSubject("approval"),
          outcome: "succeeded",
        }),
      ),
    ).toThrow(/requires outcome rejected/i);
  });

  it("detects incoherent terminal events on the same subject stream", () => {
    const granted = createDecisionAuditEntry(
      buildEntryInput({
        eventType: "approval.granted",
        subject: buildSubject("approval"),
      }),
    );
    const rejected = createDecisionAuditEntry(
      buildEntryInput({
        entryId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        eventType: "approval.rejected",
        subject: buildSubject("approval"),
        outcome: "rejected",
        occurredAt: "2026-03-13T10:03:00.000Z",
        appendedAt: "2026-03-13T10:03:01.000Z",
      }),
      granted,
    );
    const issues = listDecisionAuditIntegrityIssues([granted, rejected]);

    expect(
      findIncoherentTerminalDecisionAuditEvent([granted, rejected]),
    ).toMatchObject({
      code: "INCOHERENT_TERMINAL_EVENT",
      entryId: rejected.entryId,
    });
    expect(
      issues.some((issue) => issue.code === "INCOHERENT_TERMINAL_EVENT"),
    ).toBe(true);
    expect(() => assertDecisionAuditIntegrity([granted, rejected])).toThrow(
      /incoherent/i,
    );
  });
});
