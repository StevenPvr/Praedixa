import { describe, expect, it } from "vitest";

import {
  canTransitionApproval,
  listAllowedApprovalTransitions,
  resolveApprovalRule,
  transitionApprovalRecord,
} from "../services/approval-workflow.js";

function buildApprovalRecord() {
  return {
    kind: "Approval" as const,
    schemaVersion: "1.0.0" as const,
    approvalId: "11111111-1111-1111-1111-111111111111",
    contractId: "coverage-core",
    contractVersion: 1,
    recommendationId: "22222222-2222-2222-2222-222222222222",
    status: "requested" as const,
    scope: {
      entityType: "site" as const,
      selector: { mode: "ids" as const, ids: ["site-lyon"] },
      horizonId: "j7",
    },
    requestedAt: "2026-03-13T08:00:00.000Z",
    requestedBy: {
      actorType: "user" as const,
      actorId: "user-requester",
      actorRole: "manager",
    },
    rule: { ruleId: "r1", stepOrder: 1, approverRole: "org_admin" },
    policyContext: {
      estimatedCostEur: 1200,
      riskScore: 0.7,
      actionTypes: ["schedule.adjust"],
    },
    separationOfDuties: {
      required: true,
      satisfied: true,
      requesterActorId: "user-requester",
    },
    history: [],
  };
}

describe("approval workflow", () => {
  it("keeps the schema status vocabulary strict", () => {
    expect(canTransitionApproval("requested", "granted")).toBe(true);
    expect(canTransitionApproval("granted", "requested")).toBe(false);
    expect(listAllowedApprovalTransitions("requested")).toEqual([
      "granted",
      "rejected",
      "expired",
      "canceled",
    ]);
  });

  it("rejects forbidden self-approval when separation of duties is required", () => {
    expect(() =>
      transitionApprovalRecord(buildApprovalRecord(), {
        nextStatus: "granted",
        actorId: "user-requester",
        actorRole: "org_admin",
        occurredAt: "2026-03-13T09:00:00.000Z",
        decision: {
          outcome: "granted",
          actorRole: "org_admin",
          actorUserId: "33333333-3333-3333-3333-333333333333",
          reasonCode: "approved",
          comment: "Looks good",
          decidedAt: "2026-03-13T09:00:00.000Z",
        },
        justificationRequired: true,
      }),
    ).toThrow(/self-approval/i);
  });

  it("rejects missing justification for terminal decisions", () => {
    expect(() =>
      transitionApprovalRecord(buildApprovalRecord(), {
        nextStatus: "granted",
        actorId: "user-approver",
        actorRole: "org_admin",
        occurredAt: "2026-03-13T09:00:00.000Z",
        decision: {
          outcome: "granted",
          actorRole: "org_admin",
          actorUserId: "33333333-3333-3333-3333-333333333333",
          reasonCode: "approved",
          decidedAt: "2026-03-13T09:00:00.000Z",
        },
        justificationRequired: true,
      }),
    ).toThrow(/require justification comments/i);
  });

  it("rejects invalid status transitions", () => {
    expect(() =>
      transitionApprovalRecord(buildApprovalRecord(), {
        nextStatus: "requested",
        actorId: "user-approver",
        actorRole: "org_admin",
        occurredAt: "2026-03-13T09:00:00.000Z",
      }),
    ).toThrow(/invalid approval transition/i);
  });

  it("resolves the first matching approval rule from the matrix", () => {
    const rule = resolveApprovalRule(
      [
        {
          ruleId: "high-risk",
          approverRole: "risk_admin",
          minRiskScore: 0.8,
          stepOrder: 2,
        },
        {
          ruleId: "default",
          approverRole: "org_admin",
          minEstimatedCostEur: 1000,
          stepOrder: 1,
          requireJustification: true,
        },
      ],
      buildApprovalRecord().policyContext,
    );

    expect(rule.ruleId).toBe("default");
  });

  it("does not mutate the original record when appending approval history", () => {
    const record = buildApprovalRecord();
    const next = transitionApprovalRecord(record, {
      nextStatus: "granted",
      actorId: "user-approver",
      actorRole: "org_admin",
      occurredAt: "2026-03-13T09:00:00.000Z",
      decision: {
        outcome: "granted",
        actorRole: "org_admin",
        actorUserId: "33333333-3333-3333-3333-333333333333",
        reasonCode: "approved",
        comment: "Validated with controls",
        decidedAt: "2026-03-13T09:00:00.000Z",
      },
      justificationRequired: true,
    });

    expect(record.history).toEqual([]);
    expect(record.status).toBe("requested");
    expect(next.history).toHaveLength(1);
    expect(next.history[0]).toMatchObject({
      fromStatus: "requested",
      toStatus: "granted",
      actorId: "user-approver",
    });
    expect(next.separationOfDuties).toMatchObject({
      required: true,
      requesterActorId: "user-requester",
      approverActorId: "user-approver",
      satisfied: true,
    });
  });

  it("rejects mismatched terminal outcomes", () => {
    expect(() =>
      transitionApprovalRecord(buildApprovalRecord(), {
        nextStatus: "granted",
        actorId: "user-approver",
        actorRole: "org_admin",
        occurredAt: "2026-03-13T09:00:00.000Z",
        decision: {
          outcome: "rejected",
          actorRole: "org_admin",
          actorUserId: "33333333-3333-3333-3333-333333333333",
          reasonCode: "approved",
          comment: "Looks good",
          decidedAt: "2026-03-13T09:00:00.000Z",
        },
        justificationRequired: true,
      }),
    ).toThrow(/does not match granted/i);
  });
});
