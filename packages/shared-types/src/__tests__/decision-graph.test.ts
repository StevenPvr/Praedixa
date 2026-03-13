import { assertType, describe, expect, expectTypeOf, it } from "vitest";
import type {
  DecisionGraph,
  DecisionGraphChangeAnalysis,
  DecisionGraphLineageQuery,
  DecisionGraphQuery,
} from "../domain/decision-graph.js";

const graph: DecisionGraph = {
  kind: "DecisionGraph",
  schemaVersion: "1.0.0",
  graphId: "coverage-core",
  graphVersion: 2,
  name: "Coverage Core",
  status: "testing",
  canonicalModelVersion: "1.2.0",
  supportedPacks: ["coverage", "core"],
  entities: [
    {
      name: "Site",
      label: "Site",
      grain: "site",
      identifiers: ["site_code"],
      attributes: [
        { key: "region_code", valueType: "string", nullable: false },
      ],
      sourceBindings: [
        {
          sourceSystem: "wms",
          field: "site_code",
        },
      ],
    },
  ],
  relations: [
    {
      name: "site_reference",
      fromEntity: "Site",
      toEntity: "Site",
      relationType: "reference",
      cardinality: "one_to_one",
      joinKeys: [{ fromKey: "site_code", toKey: "site_code" }],
    },
  ],
  metrics: [
    {
      key: "coverage_gap_h",
      label: "Coverage gap",
      grain: "site",
      ownerEntity: "Site",
      valueType: "number",
      expression: "forecast_hours - staffed_hours",
      dependsOn: ["Site.site_code"],
      snapshotPolicy: "recomputable",
      timeHorizonRequired: true,
    },
  ],
  dimensions: [
    {
      key: "site_family",
      label: "Site family",
      valueType: "string",
      allowedValues: ["A", "B"],
    },
  ],
  horizons: [
    {
      horizonId: "J+7",
      label: "J+7",
      startOffsetDays: 0,
      endOffsetDays: 7,
      snapshotMode: "rolling_window",
    },
  ],
  entityResolution: {
    duplicatePolicy: "fail",
    strategies: [
      {
        entity: "Site",
        sourceSystem: "wms",
        matchKeys: ["site_code"],
        confidenceThreshold: 1,
      },
    ],
  },
  compatibility: {
    backwardCompatibleWith: [1],
    breakingChange: false,
  },
  changeImpact: [
    {
      contractId: "coverage-contract",
      minimumContractVersion: 3,
      impactLevel: "medium",
    },
  ],
  audit: {
    createdAt: "2026-03-13T08:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    changeReason: "Initial semantic graph",
  },
};

describe("decision-graph types", () => {
  it("aligns the shared vocabulary with the contract schema", () => {
    expect(graph.relations[0]?.joinKeys[0]).toEqual({
      fromKey: "site_code",
      toKey: "site_code",
    });
    expect(graph.entityResolution.duplicatePolicy).toBe("fail");
    expectTypeOf<DecisionGraph>().toHaveProperty("canonicalModelVersion");
    expectTypeOf<DecisionGraph>().toHaveProperty("changeImpact");
  });

  it("supports stable query and lineage filters", () => {
    assertType<DecisionGraphQuery>({
      entityNames: ["Site"],
      relationTypes: ["reference"],
      horizonIds: ["J+7"],
      includeConnectedRelations: true,
    });
    assertType<DecisionGraphLineageQuery>({
      metricKeys: ["coverage_gap_h"],
      direction: "both",
      maxDepth: 2,
    });
  });

  it("exposes a typed change analysis shape", () => {
    expectTypeOf<DecisionGraphChangeAnalysis>().toHaveProperty("diff");
    expectTypeOf<DecisionGraphChangeAnalysis>().toHaveProperty(
      "highestImpactLevel",
    );
  });
});
