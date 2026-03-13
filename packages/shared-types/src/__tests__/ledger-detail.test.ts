import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  LedgerDetailRequest,
  LedgerDetailResponse,
} from "../api/ledger-detail.js";

describe("ledger-detail API types", () => {
  it("accepts revision-aware ledger detail requests", () => {
    assertType<LedgerDetailRequest>({
      ledgerId: "11111111-1111-1111-1111-111111111111",
      revision: 2,
      requiredComponentKeys: ["labor_delta"],
      exportFormats: ["csv", "json"],
    });
  });

  it("exposes revision lineage and finance validation in responses", () => {
    expectTypeOf<LedgerDetailResponse>().toHaveProperty("revisionLineage");
    expectTypeOf<LedgerDetailResponse>().toHaveProperty("validationBanner");
    expectTypeOf<LedgerDetailResponse>().toHaveProperty("exportReadiness");
  });
});
