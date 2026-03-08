import { describe, it, expectTypeOf, assertType } from "vitest";
import type {
  DecisionHorizonConfig,
  DecisionEngineConfigPayload,
  RecommendationPolicyByHorizon,
  RecommendationOptionCatalogRule,
  DecisionEngineConfigVersion,
  ResolvedDecisionEngineConfig,
} from "../domain/decision-config";

describe("decision-config types", () => {
  it("accepts horizon config shape", () => {
    assertType<DecisionHorizonConfig>({
      id: "j7",
      label: "J+7",
      days: 7,
      rank: 2,
      active: true,
      isDefault: true,
    });
  });

  it("accepts option catalog rule shape", () => {
    assertType<RecommendationOptionCatalogRule>({
      optionType: "hs",
      enabled: true,
      label: "Heures sup ciblees",
      maxCoveredHours: 6,
    });
  });

  it("accepts policy by horizon shape", () => {
    assertType<RecommendationPolicyByHorizon>({
      horizonId: "j7",
      weights: {
        cost: 0.25,
        service: 0.4,
        risk: 0.2,
        feasibility: 0.15,
      },
      constraints: {
        minServicePct: 92,
        maxRiskScore: 0.55,
      },
      tieBreakers: ["service_desc", "cost_asc"],
    });
  });

  it("contains payload and version wrappers", () => {
    expectTypeOf<DecisionEngineConfigPayload>().toHaveProperty("horizons");
    expectTypeOf<DecisionEngineConfigPayload>().toHaveProperty("optionCatalog");
    expectTypeOf<DecisionEngineConfigPayload>().toHaveProperty("policiesByHorizon");

    expectTypeOf<DecisionEngineConfigVersion>().toHaveProperty("payload");
    expectTypeOf<ResolvedDecisionEngineConfig>().toHaveProperty("versionId");
  });
});
