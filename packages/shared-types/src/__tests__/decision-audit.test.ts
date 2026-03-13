import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionAuditEntry,
  DecisionAuditEventType,
  DecisionAuditIntegrityIssue,
  DecisionAuditPayloadRef,
  DecisionAuditSubjectFilter,
} from "../domain/decision-audit.js";

describe("decision-audit types", () => {
  it("accepts the minimum DecisionOps audit event vocabulary", () => {
    assertType<DecisionAuditEventType>("contract.published");
    assertType<DecisionAuditEventType>("contract.rolled_back");
    assertType<DecisionAuditEventType>("approval.granted");
    assertType<DecisionAuditEventType>("approval.rejected");
    assertType<DecisionAuditEventType>("action.dispatched");
    assertType<DecisionAuditEventType>("action.failed");
    assertType<DecisionAuditEventType>("action.retried");
    assertType<DecisionAuditEventType>("action.canceled");
    assertType<DecisionAuditEventType>("ledger.recalculated");
    assertType<DecisionAuditEventType>("ledger.validated");
    assertType<DecisionAuditEventType>("ledger.contested");
  });

  it("requires append-only chain, payload ref and strict subject metadata", () => {
    expectTypeOf<DecisionAuditEntry>().toHaveProperty("subject");
    expectTypeOf<DecisionAuditEntry>().toHaveProperty("scope");
    expectTypeOf<DecisionAuditEntry>().toHaveProperty("diff");
    expectTypeOf<DecisionAuditEntry>().toHaveProperty("payloadRef");
    expectTypeOf<DecisionAuditEntry>().toHaveProperty("chain");
  });

  it("models payload refs and filters explicitly", () => {
    expectTypeOf<DecisionAuditPayloadRef>().toHaveProperty("reference");
    expectTypeOf<DecisionAuditPayloadRef>().toHaveProperty("digest");
    expectTypeOf<DecisionAuditSubjectFilter>().toHaveProperty("subjectType");
  });

  it("exposes explicit integrity issue codes", () => {
    expectTypeOf<DecisionAuditIntegrityIssue>().toHaveProperty("code");
    expectTypeOf<DecisionAuditIntegrityIssue>().toHaveProperty("message");
  });
});
