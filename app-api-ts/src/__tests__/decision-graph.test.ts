import { describe, expect, it } from "vitest";
import type { DecisionGraph } from "@praedixa/shared-types/domain";

import {
  assertDecisionGraphIntegrity,
  canTransitionDecisionGraph,
  computeDecisionGraphChangeImpact,
  getDecisionGraphLineage,
  queryDecisionGraph,
} from "../services/decision-graph.js";

const baseGraph: DecisionGraph = {
  kind: "DecisionGraph",
  schemaVersion: "1.0.0",
  graphId: "coverage-core",
  graphVersion: 1,
  name: "Coverage core",
  status: "testing",
  canonicalModelVersion: "1.0.0",
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
    },
    {
      name: "Team",
      label: "Team",
      grain: "team",
      identifiers: ["team_code"],
      attributes: [{ key: "site_code", valueType: "string", nullable: false }],
    },
    {
      name: "Flow",
      label: "Flow",
      grain: "flow",
      identifiers: ["flow_id"],
      attributes: [{ key: "team_code", valueType: "string", nullable: false }],
    },
  ],
  relations: [
    {
      name: "site_owns_team",
      fromEntity: "Site",
      toEntity: "Team",
      relationType: "ownership",
      cardinality: "one_to_many",
      joinKeys: [{ fromKey: "site_code", toKey: "site_code" }],
    },
    {
      name: "team_drives_flow",
      fromEntity: "Team",
      toEntity: "Flow",
      relationType: "dependency",
      cardinality: "one_to_many",
      joinKeys: [{ fromKey: "team_code", toKey: "team_code" }],
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
    {
      key: "team_backlog",
      label: "Team backlog",
      grain: "team",
      ownerEntity: "Team",
      valueType: "integer",
      expression: "sum(open_orders)",
      dependsOn: ["Team.site_code", "coverage_gap_h"],
      snapshotPolicy: "materialized",
      timeHorizonRequired: true,
    },
    {
      key: "flow_risk",
      label: "Flow risk",
      grain: "flow",
      ownerEntity: "Flow",
      valueType: "boolean",
      expression: "team_backlog > 0",
      dependsOn: ["Flow.team_code", "team_backlog"],
      snapshotPolicy: "event_sourced",
      timeHorizonRequired: false,
    },
  ],
  dimensions: [
    {
      key: "region_code",
      label: "Region",
      valueType: "string",
      allowedValues: ["north", "south"],
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
      {
        entity: "Team",
        sourceSystem: "wms",
        matchKeys: ["team_code", "site_code"],
        confidenceThreshold: 0.8,
      },
    ],
  },
  compatibility: {
    backwardCompatibleWith: [],
    breakingChange: false,
  },
  changeImpact: [
    {
      contractId: "coverage-contract",
      minimumContractVersion: 2,
      impactLevel: "low",
    },
    {
      contractId: "allocation-contract",
      minimumContractVersion: 1,
      impactLevel: "high",
    },
  ],
  audit: {
    createdAt: "2026-03-13T08:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    changeReason: "Initial graph foundation",
  },
};

describe("decision-graph services", () => {
  it("keeps the graph lifecycle strict", () => {
    expect(canTransitionDecisionGraph("draft", "testing")).toBe(true);
    expect(canTransitionDecisionGraph("draft", "published")).toBe(false);
  });

  it("queries a connected subgraph without UI coupling", () => {
    const result = queryDecisionGraph(baseGraph, {
      entityNames: ["Site"],
      includeConnectedEntities: true,
      includeConnectedRelations: true,
      horizonIds: ["J+7"],
    });

    expect(result.entities.map((entity) => entity.name)).toEqual([
      "Site",
      "Team",
    ]);
    expect(result.relations.map((relation) => relation.name)).toEqual([
      "site_owns_team",
    ]);
    expect(result.metrics.map((metric) => metric.key)).toEqual([
      "coverage_gap_h",
      "team_backlog",
    ]);
    expect(result.horizons).toHaveLength(1);
  });

  it("returns stable lineage for impact analysis", () => {
    const lineage = getDecisionGraphLineage(baseGraph, {
      entityNames: ["Site"],
      direction: "downstream",
      maxDepth: 4,
    });

    expect(lineage.entities.map((entity) => entity.name)).toEqual([
      "Site",
      "Team",
      "Flow",
    ]);
    expect(lineage.metrics.map((metric) => metric.key)).toEqual([
      "coverage_gap_h",
      "team_backlog",
      "flow_risk",
    ]);
    expect(lineage.relations.map((relation) => relation.name)).toEqual([
      "site_owns_team",
      "team_drives_flow",
    ]);
  });

  it("computes version change impact from graph diffs and contract impacts", () => {
    const nextGraph: DecisionGraph = {
      ...baseGraph,
      graphVersion: 2,
      compatibility: {
        backwardCompatibleWith: [1],
        breakingChange: true,
        changeSummary: "Flow risk semantics changed",
      },
      metrics: baseGraph.metrics.map((metric) =>
        metric.key === "flow_risk"
          ? { ...metric, expression: "team_backlog >= 5" }
          : metric,
      ),
      relations: [
        ...baseGraph.relations,
        {
          name: "site_references_flow",
          fromEntity: "Site",
          toEntity: "Flow",
          relationType: "reference",
          cardinality: "one_to_many",
          joinKeys: [{ fromKey: "site_code", toKey: "team_code" }],
        },
      ],
    };

    const impact = computeDecisionGraphChangeImpact(baseGraph, nextGraph);

    expect(impact.diff.modifiedMetrics).toEqual(["flow_risk"]);
    expect(impact.diff.addedRelations).toEqual(["site_references_flow"]);
    expect(impact.impactedEntities).toEqual(["Flow", "Site", "Team"]);
    expect(impact.impactedMetrics).toEqual([
      "coverage_gap_h",
      "flow_risk",
      "team_backlog",
    ]);
    expect(impact.impactedRelations).toEqual([
      "site_owns_team",
      "site_references_flow",
      "team_drives_flow",
    ]);
    expect(impact.contractImpacts).toEqual(baseGraph.changeImpact);
    expect(impact.highestImpactLevel).toBe("high");
  });

  it("fails fast on invalid relation references", () => {
    const invalidGraph: DecisionGraph = {
      ...baseGraph,
      relations: [
        {
          name: "broken_relation",
          fromEntity: "Site",
          toEntity: "UnknownEntity",
          relationType: "dependency",
          cardinality: "one_to_many",
          joinKeys: [{ fromKey: "site_code", toKey: "unknown_code" }],
        },
      ],
    };

    expect(() => assertDecisionGraphIntegrity(invalidGraph)).toThrow(
      "Relation broken_relation references unknown toEntity UnknownEntity",
    );
  });

  it("fails fast on metric owner entity mismatches", () => {
    const siteMetric = baseGraph.metrics.find(
      (metric) => metric.key === "coverage_gap_h",
    );
    if (!siteMetric) {
      throw new Error("coverage_gap_h metric fixture is required");
    }

    const invalidGraph: DecisionGraph = {
      ...baseGraph,
      metrics: [{ ...siteMetric, ownerEntity: "Team" }],
    };

    expect(() => assertDecisionGraphIntegrity(invalidGraph)).toThrow(
      "Metric coverage_gap_h grain site does not match owner entity Team",
    );
  });
});
