import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  ShiftType,
  CanonicalRecord,
  CanonicalDataSummary,
  CanonicalQualityDashboard,
} from "../domain/canonical";
import type { TenantEntity } from "../utils/common";

describe("ShiftType", () => {
  it("accepts valid shift values", () => {
    assertType<ShiftType>("am");
    assertType<ShiftType>("pm");
  });

  it("is a string subtype", () => {
    expectTypeOf<ShiftType>().toBeString();
  });
});

describe("CanonicalRecord", () => {
  it("extends TenantEntity", () => {
    expectTypeOf<CanonicalRecord>().toMatchTypeOf<TenantEntity>();
  });

  it("has required operational fields", () => {
    expectTypeOf<CanonicalRecord>().toHaveProperty("siteId");
    expectTypeOf<CanonicalRecord>().toHaveProperty("date");
    expectTypeOf<CanonicalRecord>().toHaveProperty("shift");
    expectTypeOf<CanonicalRecord>().toHaveProperty("capacitePlanH");
    expectTypeOf<CanonicalRecord>().toHaveProperty("absH");
    expectTypeOf<CanonicalRecord>().toHaveProperty("hsH");
    expectTypeOf<CanonicalRecord>().toHaveProperty("interimH");
  });

  it("has optional fields", () => {
    expectTypeOf<CanonicalRecord["competence"]>().toEqualTypeOf<
      string | undefined
    >();
    expectTypeOf<CanonicalRecord["chargeUnits"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<CanonicalRecord["realiseH"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<CanonicalRecord["coutInterneEst"]>().toEqualTypeOf<
      number | undefined
    >();
  });

  it("shift field is ShiftType", () => {
    expectTypeOf<CanonicalRecord["shift"]>().toEqualTypeOf<ShiftType>();
  });
});

describe("CanonicalDataSummary", () => {
  it("has all summary fields", () => {
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("totalRecords");
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("coveragePct");
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("sites");
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("dateRange");
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("missingShiftsPct");
    expectTypeOf<CanonicalDataSummary>().toHaveProperty("avgAbsPct");
  });

  it("dateRange is a string array", () => {
    expectTypeOf<CanonicalDataSummary["dateRange"]>().toEqualTypeOf<string[]>();
  });

  it("sites is a number", () => {
    expectTypeOf<CanonicalDataSummary["sites"]>().toEqualTypeOf<number>();
  });
});

describe("CanonicalQualityDashboard", () => {
  it("has the same shape as CanonicalDataSummary", () => {
    expectTypeOf<CanonicalQualityDashboard>().toMatchTypeOf<CanonicalDataSummary>();
  });
});
