import { describe, expect, expectTypeOf, it } from "vitest";

import type { ApprovalRecord } from "@praedixa/shared-types/domain";
import type {
  ApprovalInboxRequest as SharedApprovalInboxRequest,
  ApprovalInboxResponse as SharedApprovalInboxResponse,
} from "@praedixa/shared-types/api";

import {
  buildApprovalInboxItem,
  buildApprovalInboxResponse,
  groupApprovalInboxItems,
  normalizeApprovalInboxRequest,
  summarizeApprovalInbox,
  type ApprovalInboxRequest,
  type ApprovalInboxResponse,
} from "../services/approval-inbox.js";

const records: ApprovalRecord[] = [
  {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: "11111111-1111-4111-8111-111111111111",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: "21111111-1111-4111-8111-111111111111",
    scenarioRunId: "31111111-1111-4111-8111-111111111111",
    status: "requested",
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon", "site-lille"] },
      horizonId: "J+7",
    },
    requestedAt: "2026-03-13T08:00:00.000Z",
    deadlineAt: "2026-03-13T10:00:00.000Z",
    requestedBy: {
      actorType: "user",
      actorId: "41111111-1111-4111-8111-111111111111",
      actorRole: "planner",
    },
    rule: {
      ruleId: "ops-review",
      stepOrder: 1,
      approverRole: "ops_manager",
      deadlineHours: 4,
    },
    policyContext: {
      estimatedCostEur: 3_800,
      riskScore: 0.92,
      actionTypes: ["schedule.adjust"],
      destinationTypes: ["wfm.shift"],
    },
    separationOfDuties: {
      required: true,
      satisfied: false,
      requesterActorId: "41111111-1111-4111-8111-111111111111",
    },
    history: [],
  },
  {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: "12222222-2222-4222-8222-222222222222",
    contractId: "cash-guard",
    contractVersion: 1,
    recommendationId: "22222222-2222-4222-8222-222222222222",
    status: "requested",
    scope: {
      entityType: "team",
      selector: { mode: "all" },
      horizonId: "J+3",
    },
    requestedAt: "2026-03-13T09:00:00.000Z",
    deadlineAt: "2026-03-13T22:30:00.000Z",
    requestedBy: {
      actorType: "service",
      actorId: "decision-runtime",
      actorRole: "orchestrator",
    },
    rule: {
      ruleId: "finance-review",
      stepOrder: 2,
      approverRole: "finance_manager",
      deadlineHours: 12,
    },
    policyContext: {
      estimatedCostEur: 650,
      riskScore: 0.58,
      actionTypes: ["budget.reserve"],
      destinationTypes: ["erp.sap"],
    },
    separationOfDuties: {
      required: false,
      satisfied: true,
    },
    history: [],
  },
  {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: "13333333-3333-4333-8333-333333333333",
    contractId: "flow-core",
    contractVersion: 1,
    recommendationId: "23333333-3333-4333-8333-333333333333",
    status: "granted",
    scope: {
      entityType: "flow",
      selector: { mode: "query", query: "priority = 'high'" },
      horizonId: "J+1",
    },
    requestedAt: "2026-03-12T12:00:00.000Z",
    requestedBy: {
      actorType: "service",
      actorId: "scheduler",
      actorRole: "worker",
    },
    rule: {
      ruleId: "flow-review",
      stepOrder: 1,
      approverRole: "ops_manager",
    },
    policyContext: {
      estimatedCostEur: 150,
      riskScore: 0.2,
      actionTypes: ["ticket.create"],
      destinationTypes: ["ticketing.jira"],
    },
    decision: {
      outcome: "granted",
      actorUserId: "43333333-3333-4333-8333-333333333333",
      actorRole: "ops_manager",
      reasonCode: "within_policy",
      comment: "Validated",
      decidedAt: "2026-03-12T13:00:00.000Z",
    },
    separationOfDuties: {
      required: false,
      satisfied: true,
      approverActorId: "43333333-3333-4333-8333-333333333333",
    },
    history: [
      {
        fromStatus: "requested",
        toStatus: "granted",
        actorId: "43333333-3333-4333-8333-333333333333",
        actorRole: "ops_manager",
        occurredAt: "2026-03-12T13:00:00.000Z",
        reasonCode: "within_policy",
        comment: "Validated",
      },
    ],
  },
];

describe("approval-inbox service", () => {
  it("keeps request and response shapes aligned with the shared API contract", () => {
    expectTypeOf<ApprovalInboxRequest>().toMatchTypeOf<SharedApprovalInboxRequest>();
    expectTypeOf<ApprovalInboxResponse>().toMatchTypeOf<SharedApprovalInboxResponse>();
  });

  it("builds a prioritized unresolved inbox with unread and urgent summary", () => {
    const response = buildApprovalInboxResponse(records, {
      now: "2026-03-13T12:00:00.000Z",
    });

    expect(response.request.filter.search).toBeNull();
    expect(response.items).toHaveLength(2);
    expect(response.items.map((item) => item.approvalId)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "12222222-2222-4222-8222-222222222222",
    ]);
    expect(response.items[0]).toMatchObject({
      priority: "critical",
      isOverdue: true,
      isUrgent: true,
      isUnread: true,
      requiresJustification: true,
      ageHours: 4,
    });
    expect(response.items[0]?.riskBadge).toMatchObject({
      label: "Critical risk",
      tone: "danger",
    });
    expect(response.items[1]).toMatchObject({
      priority: "medium",
      isOverdue: false,
      isUrgent: false,
      isUnread: true,
      requiresJustification: false,
      ageHours: 3,
    });
    expect(response.summary).toEqual({
      total: 2,
      unread: 2,
      urgent: 1,
      overdue: 1,
      requiresJustification: 1,
      statuses: {
        requested: 2,
        granted: 0,
        rejected: 0,
        expired: 0,
        canceled: 0,
      },
      priorities: {
        low: 0,
        medium: 1,
        high: 0,
        critical: 1,
      },
      roles: [
        {
          approverRole: "finance_manager",
          total: 1,
          unread: 1,
          urgent: 0,
        },
        {
          approverRole: "ops_manager",
          total: 1,
          unread: 1,
          urgent: 1,
        },
      ],
    });
  });

  it("filters, groups and includes resolved approvals when explicitly requested", () => {
    const response = buildApprovalInboxResponse(records, {
      includeResolved: true,
      groupBy: "approverRole",
      sort: {
        field: "requestedAt",
        direction: "asc",
      },
      filter: {
        approverRoles: ["ops_manager"],
        priorities: ["critical", "low"],
      },
      now: "2026-03-13T12:00:00.000Z",
    });

    expect(response.items.map((item) => item.approvalId)).toEqual([
      "13333333-3333-4333-8333-333333333333",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(response.groups).toEqual([
      {
        groupBy: "approverRole",
        groupKey: "ops_manager",
        groupLabel: "ops_manager",
        total: 2,
        unread: 1,
        urgent: 1,
        items: response.items,
      },
    ]);
  });

  it("exposes reusable item, grouping and summary helpers", () => {
    const now = "2026-03-13T12:00:00.000Z";
    const items = records.map((record) => buildApprovalInboxItem(record, now));
    const summary = summarizeApprovalInbox(items);
    const groups = groupApprovalInboxItems(items, "priority");

    expect(summary.total).toBe(3);
    expect(groups.map((group) => group.groupKey)).toEqual([
      "critical",
      "medium",
      "low",
    ]);
  });

  it("fails closed on incoherent requests", () => {
    expect(() =>
      normalizeApprovalInboxRequest({
        filter: {
          search: "   ",
        },
      }),
    ).toThrow("filter.search cannot be blank");

    expect(() =>
      normalizeApprovalInboxRequest({
        filter: {
          approverRoles: ["ops_manager", "ops_manager"],
        },
      }),
    ).toThrow("filter.approverRoles cannot contain duplicate values");

    expect(() =>
      normalizeApprovalInboxRequest({
        filter: {
          overdueOnly: true,
          statuses: ["granted"],
        },
      }),
    ).toThrow("filter.overdueOnly requires requested approvals");
  });
});
