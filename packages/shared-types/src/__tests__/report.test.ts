import { describe, it, expectTypeOf } from "vitest";
import type {
  WeeklySummary,
  ForecastAccuracyPoint,
  CostAnalysis,
  WaterfallComponent,
  ProofPack,
  ProofPackSummary,
} from "../domain/report";
import type { UUID, ISODateString } from "../utils/common";
import type { AlertHorizon } from "../domain/coverage-alert";

describe("WeeklySummary", () => {
  it("has date range fields", () => {
    expectTypeOf<WeeklySummary["weekStart"]>().toEqualTypeOf<ISODateString>();
    expectTypeOf<WeeklySummary["weekEnd"]>().toEqualTypeOf<ISODateString>();
  });

  it("has alert counts", () => {
    expectTypeOf<WeeklySummary["totalAlerts"]>().toEqualTypeOf<number>();
    expectTypeOf<WeeklySummary["alertsResolved"]>().toEqualTypeOf<number>();
    expectTypeOf<WeeklySummary["alertsPending"]>().toEqualTypeOf<number>();
  });

  it("topSites is an array of site summaries", () => {
    expectTypeOf<WeeklySummary["topSites"]>().toEqualTypeOf<
      { siteId: string; alertCount: number; costEur: number }[]
    >();
  });
});

describe("ForecastAccuracyPoint", () => {
  it("has all required fields", () => {
    expectTypeOf<ForecastAccuracyPoint>().toHaveProperty("date");
    expectTypeOf<ForecastAccuracyPoint>().toHaveProperty("predicted");
    expectTypeOf<ForecastAccuracyPoint>().toHaveProperty("actual");
    expectTypeOf<ForecastAccuracyPoint>().toHaveProperty("error");
    expectTypeOf<ForecastAccuracyPoint>().toHaveProperty("horizon");
  });

  it("horizon is AlertHorizon", () => {
    expectTypeOf<ForecastAccuracyPoint["horizon"]>().toEqualTypeOf<AlertHorizon>();
  });

  it("numeric fields are numbers", () => {
    expectTypeOf<ForecastAccuracyPoint["predicted"]>().toEqualTypeOf<number>();
    expectTypeOf<ForecastAccuracyPoint["actual"]>().toEqualTypeOf<number>();
    expectTypeOf<ForecastAccuracyPoint["error"]>().toEqualTypeOf<number>();
  });
});

describe("WaterfallComponent", () => {
  it("has label, value, and type", () => {
    expectTypeOf<WaterfallComponent>().toHaveProperty("label");
    expectTypeOf<WaterfallComponent>().toHaveProperty("value");
    expectTypeOf<WaterfallComponent>().toHaveProperty("type");
  });

  it("type is a waterfall bar type", () => {
    expectTypeOf<WaterfallComponent["type"]>().toEqualTypeOf<
      "positive" | "negative" | "total"
    >();
  });
});

describe("CostAnalysis", () => {
  it("has period with from/to", () => {
    expectTypeOf<CostAnalysis["period"]>().toEqualTypeOf<{
      from: ISODateString;
      to: ISODateString;
    }>();
  });

  it("has all cost fields", () => {
    expectTypeOf<CostAnalysis["totalBauEur"]>().toEqualTypeOf<number>();
    expectTypeOf<CostAnalysis["total100Eur"]>().toEqualTypeOf<number>();
    expectTypeOf<CostAnalysis["totalReelEur"]>().toEqualTypeOf<number>();
    expectTypeOf<CostAnalysis["gainNetEur"]>().toEqualTypeOf<number>();
  });

  it("breakdown is WaterfallComponent array", () => {
    expectTypeOf<CostAnalysis["breakdown"]>().toEqualTypeOf<
      WaterfallComponent[]
    >();
  });
});

describe("ProofPack", () => {
  it("has required fields", () => {
    expectTypeOf<ProofPack["id"]>().toEqualTypeOf<UUID>();
    expectTypeOf<ProofPack["siteId"]>().toEqualTypeOf<string>();
    expectTypeOf<ProofPack["month"]>().toEqualTypeOf<ISODateString>();
    expectTypeOf<ProofPack["coutBauEur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPack["cout100Eur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPack["coutReelEur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPack["gainNetEur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPack["alertesEmises"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPack["alertesTraitees"]>().toEqualTypeOf<number>();
  });

  it("has optional service/adoption fields", () => {
    expectTypeOf<ProofPack["serviceBauPct"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ProofPack["serviceReelPct"]>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<ProofPack["adoptionPct"]>().toEqualTypeOf<
      number | undefined
    >();
  });
});

describe("ProofPackSummary", () => {
  it("has aggregate fields", () => {
    expectTypeOf<ProofPackSummary["totalGainEur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPackSummary["avgAdoptionPct"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPackSummary["avgServiceImprovementPct"]>().toEqualTypeOf<number>();
  });

  it("siteSummaries is ProofPack array", () => {
    expectTypeOf<ProofPackSummary["siteSummaries"]>().toEqualTypeOf<
      ProofPack[]
    >();
  });

  it("period has from/to", () => {
    expectTypeOf<ProofPackSummary["period"]>().toEqualTypeOf<{
      from: ISODateString;
      to: ISODateString;
    }>();
  });
});
