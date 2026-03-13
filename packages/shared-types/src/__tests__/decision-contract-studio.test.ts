import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionContractStudioDetailRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftRequest,
  DecisionContractStudioListRequest,
  DecisionContractStudioListResponse,
} from "../api/decision-contract-studio.js";

describe("decision-contract studio API types", () => {
  it("accepts list/detail/fork requests", () => {
    assertType<DecisionContractStudioListRequest>({
      pack: "coverage",
      statuses: ["draft", "approved"],
      search: "coverage",
    });
    assertType<DecisionContractStudioDetailRequest>({
      contractId: "coverage-core",
      contractVersion: 2,
      compareToVersion: 1,
    });
    assertType<DecisionContractStudioForkDraftRequest>({
      contractId: "coverage-core",
      contractVersion: 2,
      actor: {
        userId: "11111111-1111-1111-1111-111111111111",
        decidedAt: "2026-03-13T09:00:00.000Z",
        reason: "iterate",
      },
    });
  });

  it("exposes studio list and detail responses", () => {
    expectTypeOf<DecisionContractStudioListResponse>().toHaveProperty("items");
    expectTypeOf<DecisionContractStudioDetailResponse>().toHaveProperty(
      "publishReadiness",
    );
  });
});
