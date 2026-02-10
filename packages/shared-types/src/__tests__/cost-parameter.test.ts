import { describe, it, expectTypeOf } from "vitest";
import type { CostParameter } from "../domain/cost-parameter";
import type { TenantEntity, ISODateString } from "../utils/common";

describe("CostParameter", () => {
  it("extends TenantEntity", () => {
    expectTypeOf<CostParameter>().toMatchTypeOf<TenantEntity>();
  });

  it("has all cost fields as numbers", () => {
    expectTypeOf<CostParameter["cInt"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["majHs"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["cInterim"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["premiumUrgence"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["cBacklog"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["capHsShift"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["capInterimSite"]>().toEqualTypeOf<number>();
    expectTypeOf<CostParameter["leadTimeJours"]>().toEqualTypeOf<number>();
  });

  it("version is a number", () => {
    expectTypeOf<CostParameter["version"]>().toEqualTypeOf<number>();
  });

  it("siteId is optional", () => {
    expectTypeOf<CostParameter["siteId"]>().toEqualTypeOf<string | undefined>();
  });

  it("effectiveFrom is ISODateString", () => {
    expectTypeOf<
      CostParameter["effectiveFrom"]
    >().toEqualTypeOf<ISODateString>();
  });

  it("effectiveUntil is optional", () => {
    expectTypeOf<CostParameter["effectiveUntil"]>().toEqualTypeOf<
      ISODateString | undefined
    >();
  });
});
