import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  AlertHorizon,
  CoverageAlertSeverity,
  CoverageAlertStatus,
  CoverageAlert,
} from "../domain/coverage-alert";
import type { TenantEntity, ISODateTimeString } from "../utils/common";
import type { ShiftType } from "../domain/canonical";

describe("AlertHorizon", () => {
  it("accepts legacy horizon values", () => {
    assertType<AlertHorizon>("j3");
    assertType<AlertHorizon>("j7");
    assertType<AlertHorizon>("j14");
  });

  it("accepts custom admin-defined horizon identifiers", () => {
    assertType<AlertHorizon>("h_custom_j21");
  });

  it("is a string subtype", () => {
    expectTypeOf<AlertHorizon>().toBeString();
  });
});

describe("CoverageAlertSeverity", () => {
  it("accepts valid severity values", () => {
    assertType<CoverageAlertSeverity>("low");
    assertType<CoverageAlertSeverity>("medium");
    assertType<CoverageAlertSeverity>("high");
    assertType<CoverageAlertSeverity>("critical");
  });
});

describe("CoverageAlertStatus", () => {
  it("accepts valid status values", () => {
    assertType<CoverageAlertStatus>("open");
    assertType<CoverageAlertStatus>("acknowledged");
    assertType<CoverageAlertStatus>("resolved");
    assertType<CoverageAlertStatus>("expired");
  });
});

describe("CoverageAlert", () => {
  it("extends TenantEntity", () => {
    expectTypeOf<CoverageAlert>().toMatchTypeOf<TenantEntity>();
  });

  it("has required alert fields", () => {
    expectTypeOf<CoverageAlert>().toHaveProperty("siteId");
    expectTypeOf<CoverageAlert>().toHaveProperty("alertDate");
    expectTypeOf<CoverageAlert>().toHaveProperty("shift");
    expectTypeOf<CoverageAlert>().toHaveProperty("horizon");
    expectTypeOf<CoverageAlert>().toHaveProperty("pRupture");
    expectTypeOf<CoverageAlert>().toHaveProperty("gapH");
    expectTypeOf<CoverageAlert>().toHaveProperty("severity");
    expectTypeOf<CoverageAlert>().toHaveProperty("status");
    expectTypeOf<CoverageAlert>().toHaveProperty("driversJson");
  });

  it("shift is ShiftType", () => {
    expectTypeOf<CoverageAlert["shift"]>().toEqualTypeOf<ShiftType>();
  });

  it("horizon is AlertHorizon", () => {
    expectTypeOf<CoverageAlert["horizon"]>().toEqualTypeOf<AlertHorizon>();
  });

  it("driversJson is string array", () => {
    expectTypeOf<CoverageAlert["driversJson"]>().toEqualTypeOf<string[]>();
  });

  it("has optional timestamp fields", () => {
    expectTypeOf<CoverageAlert["acknowledgedAt"]>().toEqualTypeOf<
      ISODateTimeString | undefined
    >();
    expectTypeOf<CoverageAlert["resolvedAt"]>().toEqualTypeOf<
      ISODateTimeString | undefined
    >();
    expectTypeOf<CoverageAlert["impactEur"]>().toEqualTypeOf<
      number | undefined
    >();
  });
});
