import { assertType, describe, expectTypeOf, it } from "vitest";
import type { ApprovalRecord, ApprovalStatus } from "../domain/approval.js";

describe("approval types", () => {
  it("mirrors the schema approval statuses", () => {
    assertType<ApprovalStatus>("requested");
    assertType<ApprovalStatus>("granted");
    assertType<ApprovalStatus>("rejected");
    assertType<ApprovalStatus>("expired");
    assertType<ApprovalStatus>("canceled");
  });

  it("keeps separation-of-duties and history explicit", () => {
    expectTypeOf<ApprovalRecord>().toHaveProperty("separationOfDuties");
    expectTypeOf<ApprovalRecord>().toHaveProperty("history");
    expectTypeOf<ApprovalRecord>().toHaveProperty("decision");
  });

  it("requires an actor user id on approval decisions", () => {
    assertType<NonNullable<ApprovalRecord["decision"]>>({
      outcome: "granted",
      actorUserId: "33333333-3333-1333-8333-333333333333",
      actorRole: "org_admin",
      reasonCode: "approved",
      comment: "Validated",
      decidedAt: "2026-03-13T09:00:00.000Z",
    });
  });
});
