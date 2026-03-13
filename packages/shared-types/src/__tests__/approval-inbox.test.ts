import { assertType, describe, expectTypeOf, it } from "vitest";

import type {
  ApprovalInboxActorSummary,
  ApprovalInboxGroup,
  ApprovalInboxItem,
  ApprovalInboxRequest,
  ApprovalInboxResolvedRequest,
  ApprovalInboxResponse,
  ApprovalInboxSummary,
} from "../api/approval-inbox.js";

describe("approval-inbox API types", () => {
  it("accepts rich inbox filters and sorting", () => {
    assertType<ApprovalInboxRequest>({
      filter: {
        approverRoles: ["ops_manager"],
        statuses: ["requested"],
        priorities: ["critical", "high"],
        contractIds: ["coverage-core"],
        contractVersion: 2,
        search: "coverage",
        requiresJustification: true,
        unreadOnly: true,
        urgentOnly: true,
        overdueOnly: false,
      },
      sort: {
        field: "priority",
        direction: "desc",
      },
      groupBy: "approverRole",
      includeResolved: false,
      now: "2026-03-13T12:00:00.000Z",
    });
  });

  it("exposes typed item, summary and grouping surfaces", () => {
    expectTypeOf<ApprovalInboxItem>().toHaveProperty("priority");
    expectTypeOf<ApprovalInboxItem>().toHaveProperty("requiresJustification");
    expectTypeOf<ApprovalInboxItem>().toHaveProperty("riskBadge");
    expectTypeOf<ApprovalInboxItem>().toHaveProperty("costBadge");
    expectTypeOf<ApprovalInboxItem>().toHaveProperty("ageHours");
    expectTypeOf<ApprovalInboxActorSummary>().toHaveProperty("label");
    expectTypeOf<ApprovalInboxSummary>().toHaveProperty("unread");
    expectTypeOf<ApprovalInboxSummary>().toHaveProperty("urgent");
    expectTypeOf<ApprovalInboxGroup>().toHaveProperty("groupBy");
    expectTypeOf<ApprovalInboxResponse>().toHaveProperty("request");
    expectTypeOf<ApprovalInboxResponse>().toHaveProperty("groups");
  });

  it("normalizes resolved request fields without loose shapes", () => {
    expectTypeOf<ApprovalInboxResolvedRequest>().toEqualTypeOf<{
      filter: {
        approverRoles: readonly string[];
        statuses: readonly ApprovalInboxItem["status"][];
        priorities: readonly ApprovalInboxItem["priority"][];
        contractIds: readonly string[];
        contractVersion: number | null;
        search: string | null;
        requiresJustification: boolean | null;
        unreadOnly: boolean;
        urgentOnly: boolean;
        overdueOnly: boolean;
      };
      sort: {
        field:
          | "priority"
          | "requestedAt"
          | "deadlineAt"
          | "riskScore"
          | "estimatedCostEur"
          | "ageHours";
        direction: "asc" | "desc";
      };
      groupBy: "status" | "priority" | "approverRole";
      includeResolved: boolean;
      now: string;
    }>();
  });
});
