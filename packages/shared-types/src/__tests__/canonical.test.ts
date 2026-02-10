import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  ShiftType,
  CanonicalRecord,
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

describe("CanonicalQualityDashboard", () => {
  it("has all dashboard fields", () => {
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty("totalRecords");
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty("coveragePct");
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty("sites");
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty("dateRange");
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty(
      "missingShiftsPct",
    );
    expectTypeOf<CanonicalQualityDashboard>().toHaveProperty("avgAbsPct");
  });
});
