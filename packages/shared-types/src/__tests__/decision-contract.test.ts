import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionContractActor,
  DecisionContractAudit,
  DecisionContract,
  DecisionContractStatus,
  DecisionContractTransition,
} from "../domain/decision-contract.js";

describe("decision-contract types", () => {
  it("accepts the contract lifecycle vocabulary", () => {
    assertType<DecisionContractStatus>("draft");
    assertType<DecisionContractStatus>("testing");
    assertType<DecisionContractStatus>("approved");
    assertType<DecisionContractStatus>("published");
    assertType<DecisionContractStatus>("archived");
  });

  it("accepts the contract transition vocabulary", () => {
    assertType<DecisionContractTransition>("submit_for_testing");
    assertType<DecisionContractTransition>("approve");
    assertType<DecisionContractTransition>("publish");
    assertType<DecisionContractTransition>("archive");
    assertType<DecisionContractTransition>("reopen_draft");
  });

  it("requires graph, scope, actions and audit metadata", () => {
    expectTypeOf<DecisionContract>().toHaveProperty("graphRef");
    expectTypeOf<DecisionContract>().toHaveProperty("scope");
    expectTypeOf<DecisionContract>().toHaveProperty("actions");
    expectTypeOf<DecisionContract>().toHaveProperty("audit");
  });

  it("models actor, reason and rollback lineage metadata explicitly", () => {
    expectTypeOf<DecisionContractActor>().toHaveProperty("userId");
    expectTypeOf<DecisionContractActor>().toHaveProperty("decidedAt");
    expectTypeOf<DecisionContractActor>().toHaveProperty("reason");
    expectTypeOf<DecisionContractAudit>().toHaveProperty("changeReason");
    expectTypeOf<DecisionContractAudit>().toHaveProperty("previousVersion");
    expectTypeOf<DecisionContractAudit>().toHaveProperty("rollbackFromVersion");
  });
});
