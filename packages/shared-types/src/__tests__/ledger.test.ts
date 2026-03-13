import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  LedgerCounterfactual,
  LedgerEntry,
  LedgerStatus,
  LedgerValidationStatus,
} from "../domain/ledger.js";

describe("ledger types", () => {
  it("accepts the ledger lifecycle vocabulary", () => {
    assertType<LedgerStatus>("open");
    assertType<LedgerStatus>("measuring");
    assertType<LedgerStatus>("closed");
    assertType<LedgerStatus>("recalculated");
    assertType<LedgerStatus>("disputed");
  });

  it("keeps ledger validation vocabulary explicit", () => {
    assertType<LedgerValidationStatus>("estimated");
    assertType<LedgerValidationStatus>("validated");
    assertType<LedgerValidationStatus>("contested");
  });

  it("keeps baseline, recommended, actual, counterfactual and roi explicit", () => {
    expectTypeOf<LedgerEntry>().toHaveProperty("baseline");
    expectTypeOf<LedgerEntry>().toHaveProperty("recommended");
    expectTypeOf<LedgerEntry>().toHaveProperty("actual");
    expectTypeOf<LedgerEntry>().toHaveProperty("counterfactual");
    expectTypeOf<LedgerEntry>().toHaveProperty("roi");
  });

  it("tracks supersession lineage and counterfactual metadata", () => {
    expectTypeOf<LedgerEntry>().toHaveProperty("supersedes");
    expectTypeOf<LedgerEntry["roi"]>().toHaveProperty("validationStatus");
    expectTypeOf<LedgerCounterfactual>().toHaveProperty("methodVersion");
    expectTypeOf<LedgerCounterfactual>().toHaveProperty("inputs");
  });
});
