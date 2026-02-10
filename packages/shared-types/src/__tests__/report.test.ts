import { describe, it, expectTypeOf } from "vitest";
import type {
  WeeklySummary,
  ProofPack,
  ProofPackSummary,
} from "../domain/report";
import type { UUID, ISODateString } from "../utils/common";

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
    expectTypeOf<ProofPackSummary["totalGainNetEur"]>().toEqualTypeOf<number>();
    expectTypeOf<ProofPackSummary["avgAdoptionPct"]>().toEqualTypeOf<
      number | null
    >();
  });

  it("records is ProofPack array", () => {
    expectTypeOf<ProofPackSummary["records"]>().toEqualTypeOf<ProofPack[]>();
  });

  it("has total alert fields", () => {
    expectTypeOf<
      ProofPackSummary["totalAlertesEmises"]
    >().toEqualTypeOf<number>();
    expectTypeOf<
      ProofPackSummary["totalAlertesTraitees"]
    >().toEqualTypeOf<number>();
  });
});
