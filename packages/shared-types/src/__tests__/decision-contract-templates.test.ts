import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionContractTemplateInstantiateRequest,
  DecisionContractTemplateInstantiateResponse,
  DecisionContractTemplateListRequest,
  DecisionContractTemplateListResponse,
} from "../api/decision-contract-templates.js";
import type { DecisionContract } from "../domain/decision-contract.js";

describe("decision-contract-templates API types", () => {
  it("accepts list and instantiate requests", () => {
    assertType<DecisionContractTemplateListRequest>({
      pack: "coverage",
      includeDeprecated: false,
      search: "site",
      tags: ["coverage"],
    });

    assertType<DecisionContractTemplateInstantiateRequest>({
      templateId: "coverage.site.standard",
      templateVersion: 2,
      contractId: "coverage-lyon",
      name: "Coverage Lyon",
      actor: {
        userId: "11111111-1111-4111-8111-111111111111",
        decidedAt: "2026-03-13T12:00:00.000Z",
        reason: "bootstrap",
      },
      scopeOverrides: {
        entityType: "site",
        selector: {
          mode: "ids",
          ids: ["site-lyon"],
        },
      },
    });
  });

  it("keeps responses anchored to concrete contract payloads", () => {
    expectTypeOf<DecisionContractTemplateListResponse>().toHaveProperty(
      "items",
    );
    expectTypeOf<
      DecisionContractTemplateInstantiateResponse["contract"]
    >().toEqualTypeOf<DecisionContract>();
  });
});
