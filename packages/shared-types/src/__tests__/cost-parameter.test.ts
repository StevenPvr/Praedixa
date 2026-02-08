import { describe, it, expectTypeOf } from "vitest";
import type {
  CostParameter,
  ShiftConfig,
  AlertThresholdConfig,
  SiteConfig,
} from "../domain/cost-parameter";
import type { TenantEntity, ISODateString } from "../utils/common";
import type { ShiftType } from "../domain/canonical";

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
    expectTypeOf<CostParameter["siteId"]>().toEqualTypeOf<
      string | undefined
    >();
  });

  it("effectiveFrom is ISODateString", () => {
    expectTypeOf<CostParameter["effectiveFrom"]>().toEqualTypeOf<ISODateString>();
  });

  it("effectiveUntil is optional", () => {
    expectTypeOf<CostParameter["effectiveUntil"]>().toEqualTypeOf<
      ISODateString | undefined
    >();
  });
});

describe("ShiftConfig", () => {
  it("has required fields", () => {
    expectTypeOf<ShiftConfig>().toHaveProperty("shiftType");
    expectTypeOf<ShiftConfig>().toHaveProperty("startTime");
    expectTypeOf<ShiftConfig>().toHaveProperty("endTime");
    expectTypeOf<ShiftConfig>().toHaveProperty("label");
  });

  it("shiftType is ShiftType", () => {
    expectTypeOf<ShiftConfig["shiftType"]>().toEqualTypeOf<ShiftType>();
  });

  it("time fields are strings", () => {
    expectTypeOf<ShiftConfig["startTime"]>().toEqualTypeOf<string>();
    expectTypeOf<ShiftConfig["endTime"]>().toEqualTypeOf<string>();
  });
});

describe("AlertThresholdConfig", () => {
  it("all thresholds are numbers", () => {
    expectTypeOf<AlertThresholdConfig["lowThreshold"]>().toEqualTypeOf<number>();
    expectTypeOf<AlertThresholdConfig["mediumThreshold"]>().toEqualTypeOf<number>();
    expectTypeOf<AlertThresholdConfig["highThreshold"]>().toEqualTypeOf<number>();
    expectTypeOf<AlertThresholdConfig["criticalThreshold"]>().toEqualTypeOf<number>();
    expectTypeOf<AlertThresholdConfig["maxAlertsPerWeek"]>().toEqualTypeOf<number>();
  });
});

describe("SiteConfig", () => {
  it("has all required fields", () => {
    expectTypeOf<SiteConfig>().toHaveProperty("siteId");
    expectTypeOf<SiteConfig>().toHaveProperty("name");
    expectTypeOf<SiteConfig>().toHaveProperty("city");
    expectTypeOf<SiteConfig>().toHaveProperty("capaciteBaseH");
    expectTypeOf<SiteConfig>().toHaveProperty("shifts");
  });

  it("shifts is a ShiftConfig array", () => {
    expectTypeOf<SiteConfig["shifts"]>().toEqualTypeOf<ShiftConfig[]>();
  });

  it("capaciteBaseH is a number", () => {
    expectTypeOf<SiteConfig["capaciteBaseH"]>().toEqualTypeOf<number>();
  });
});
