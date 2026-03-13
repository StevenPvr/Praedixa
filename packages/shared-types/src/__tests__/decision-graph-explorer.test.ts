import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionGraphExplorerRequest,
  DecisionGraphExplorerResponse,
} from "../api/decision-graph-explorer.js";

describe("decision-graph explorer API types", () => {
  it("accepts explorer filters and lineage requests", () => {
    assertType<DecisionGraphExplorerRequest>({
      filters: {
        entityNames: ["Site"],
        includeConnectedRelations: true,
      },
      lineage: {
        entityNames: ["Site"],
        direction: "downstream",
        maxDepth: 2,
      },
    });
  });

  it("exposes explorer summaries, cards and impact sections", () => {
    expectTypeOf<DecisionGraphExplorerResponse>().toHaveProperty("summary");
    expectTypeOf<DecisionGraphExplorerResponse>().toHaveProperty("entityCards");
    expectTypeOf<DecisionGraphExplorerResponse>().toHaveProperty(
      "relationGraph",
    );
    expectTypeOf<DecisionGraphExplorerResponse>().toHaveProperty(
      "impactSummary",
    );
  });
});
