import { describe, it, expectTypeOf } from "vitest";
import type {
  OperationalDecision,
  OverrideStatistics,
} from "../domain/operational-decision";
import type { TenantEntity, UUID, ISODateString } from "../utils/common";
import type { ShiftType } from "../domain/canonical";
import type { AlertHorizon } from "../domain/coverage-alert";

describe("OperationalDecision", () => {
  it("extends TenantEntity", () => {
    expectTypeOf<OperationalDecision>().toMatchTypeOf<TenantEntity>();
  });

  it("has all required fields", () => {
    expectTypeOf<OperationalDecision>().toHaveProperty("coverageAlertId");
    expectTypeOf<OperationalDecision>().toHaveProperty("siteId");
    expectTypeOf<OperationalDecision>().toHaveProperty("decisionDate");
    expectTypeOf<OperationalDecision>().toHaveProperty("shift");
    expectTypeOf<OperationalDecision>().toHaveProperty("horizon");
    expectTypeOf<OperationalDecision>().toHaveProperty("gapH");
    expectTypeOf<OperationalDecision>().toHaveProperty("isOverride");
    expectTypeOf<OperationalDecision>().toHaveProperty("decidedBy");
  });

  it("references correct cross-domain types", () => {
    expectTypeOf<OperationalDecision["shift"]>().toEqualTypeOf<ShiftType>();
    expectTypeOf<OperationalDecision["horizon"]>().toEqualTypeOf<AlertHorizon>();
    expectTypeOf<OperationalDecision["decidedBy"]>().toEqualTypeOf<UUID>();
    expectTypeOf<OperationalDecision["decisionDate"]>().toEqualTypeOf<ISODateString>();
  });

  it("has optional option references", () => {
    expectTypeOf<OperationalDecision["recommendedOptionId"]>().toEqualTypeOf<
      UUID | undefined
    >();
    expectTypeOf<OperationalDecision["chosenOptionId"]>().toEqualTypeOf<
      UUID | undefined
    >();
  });

  it("has optional cost/service observations", () => {
    expectTypeOf<OperationalDecision["coutAttenduEur"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<OperationalDecision["serviceAttenduPct"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<OperationalDecision["coutObserveEur"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<OperationalDecision["serviceObservePct"]>().toEqualTypeOf<
      number | undefined
    >();
  });

  it("isOverride is boolean", () => {
    expectTypeOf<OperationalDecision["isOverride"]>().toEqualTypeOf<boolean>();
  });

  it("overrideReason and comment are optional strings", () => {
    expectTypeOf<OperationalDecision["overrideReason"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<OperationalDecision["comment"]>().toEqualTypeOf<
      string | undefined
    >();
  });
});

describe("OverrideStatistics", () => {
  it("has aggregate fields", () => {
    expectTypeOf<OverrideStatistics>().toHaveProperty("totalDecisions");
    expectTypeOf<OverrideStatistics>().toHaveProperty("overrideCount");
    expectTypeOf<OverrideStatistics>().toHaveProperty("overridePct");
    expectTypeOf<OverrideStatistics>().toHaveProperty("topOverrideReasons");
    expectTypeOf<OverrideStatistics>().toHaveProperty("avgCostDelta");
  });

  it("topOverrideReasons is an array of reason/count objects", () => {
    expectTypeOf<
      OverrideStatistics["topOverrideReasons"]
    >().toEqualTypeOf<{ reason: string; count: number }[]>();
  });

  it("numeric fields are numbers", () => {
    expectTypeOf<OverrideStatistics["totalDecisions"]>().toEqualTypeOf<number>();
    expectTypeOf<OverrideStatistics["overrideCount"]>().toEqualTypeOf<number>();
    expectTypeOf<OverrideStatistics["overridePct"]>().toEqualTypeOf<number>();
    expectTypeOf<OverrideStatistics["avgCostDelta"]>().toEqualTypeOf<number>();
  });
});
