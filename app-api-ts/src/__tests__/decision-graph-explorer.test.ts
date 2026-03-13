import { describe, expect, expectTypeOf, it } from "vitest";
import type { DecisionGraph } from "@praedixa/shared-types/domain";
import type {
  DecisionGraphExplorerRequest as SharedDecisionGraphExplorerRequest,
  DecisionGraphExplorerResponse as SharedDecisionGraphExplorerResponse,
} from "@praedixa/shared-types/api";
import {
  buildDecisionGraphExplorerResponse,
  buildDecisionGraphImpactBadges,
  type DecisionGraphExplorerRequest,
  type DecisionGraphExplorerResponse,
} from "../services/decision-graph-explorer.js";

const baseGraph: DecisionGraph = {
  kind: "DecisionGraph",
  schemaVersion: "1.0.0",
  graphId: "coverage-core",
  graphVersion: 2,
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
    backwardCompatibleWith: [1],
    breakingChange: true,
    changeSummary: "Flow semantics changed",
  },
  changeImpact: [
    {
      contractId: "allocation-contract",
      minimumContractVersion: 1,
      impactLevel: "high",
    },
    {
      contractId: "coverage-contract",
      minimumContractVersion: 2,
      impactLevel: "medium",
    },
  ],
  audit: {
    createdAt: "2026-03-13T08:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    changeReason: "Initial graph foundation",
  },
};

describe("decision-graph explorer service", () => {
  it("keeps service request and response shapes aligned with shared API types", () => {
    expectTypeOf<DecisionGraphExplorerRequest>().toMatchTypeOf<SharedDecisionGraphExplorerRequest>();
    expectTypeOf<DecisionGraphExplorerResponse>().toMatchTypeOf<SharedDecisionGraphExplorerResponse>();
  });

  it("builds stable cards, relation graph summary and lineage sections", () => {
    const response = buildDecisionGraphExplorerResponse(baseGraph, {
      filters: {
        entityNames: ["Site"],
        includeConnectedEntities: true,
        includeConnectedRelations: true,
      },
      lineage: {
        entityNames: ["Site"],
        direction: "downstream",
        maxDepth: 3,
      },
    });

    expect(response.entities.map((entity) => entity.name)).toEqual([
      "Site",
      "Team",
    ]);
    expect(response.entityCards).toEqual([
      {
        entityName: "Site",
        label: "Site",
        grain: "site",
        identifierCount: 1,
        attributeCount: 1,
        sourceBindingCount: 0,
        inboundRelationCount: 0,
        outboundRelationCount: 1,
        ownedMetricCount: 1,
        isSelected: true,
        isInLineage: true,
      },
      {
        entityName: "Team",
        label: "Team",
        grain: "team",
        identifierCount: 1,
        attributeCount: 1,
        sourceBindingCount: 0,
        inboundRelationCount: 1,
        outboundRelationCount: 0,
        ownedMetricCount: 1,
        isSelected: false,
        isInLineage: true,
      },
    ]);
    expect(response.metricCards.map((metric) => metric.metricKey)).toEqual([
      "coverage_gap_h",
      "team_backlog",
    ]);
    expect(response.lineage).toEqual({
      direction: "downstream",
      maxDepth: 3,
      entities: ["Flow", "Site", "Team"],
      metrics: ["coverage_gap_h", "flow_risk", "team_backlog"],
      relations: ["site_owns_team", "team_drives_flow"],
    });
    expect(response.relationGraph).toEqual({
      entityCount: 2,
      relationCount: 1,
      highlightedEntityCount: 2,
      highlightedRelationCount: 1,
      nodes: [
        {
          nodeId: "entity:Site",
          entityName: "Site",
          label: "Site",
          grain: "site",
          inboundRelationCount: 0,
          outboundRelationCount: 1,
          isHighlighted: true,
        },
        {
          nodeId: "entity:Team",
          entityName: "Team",
          label: "Team",
          grain: "team",
          inboundRelationCount: 1,
          outboundRelationCount: 0,
          isHighlighted: true,
        },
      ],
      edges: [
        {
          edgeId: "site_owns_team",
          relationName: "site_owns_team",
          fromNodeId: "entity:Site",
          toNodeId: "entity:Team",
          relationType: "ownership",
          cardinality: "one_to_many",
          isHighlighted: true,
        },
      ],
    });
    expect(response.debug).toEqual({
      activeFilterCount: 6,
      resultEntityCount: 2,
      resultMetricCount: 2,
      resultRelationCount: 1,
      lineageEnabled: true,
      searchApplied: false,
    });
  });

  it("builds deterministic impact badges ordered by severity then contract", () => {
    expect(buildDecisionGraphImpactBadges(baseGraph)).toEqual([
      {
        contractId: "allocation-contract",
        minimumContractVersion: 1,
        impactLevel: "high",
        tone: "danger",
      },
      {
        contractId: "coverage-contract",
        minimumContractVersion: 2,
        impactLevel: "medium",
        tone: "warning",
      },
    ]);
  });

  it("applies search filters after structural query projection", () => {
    const response = buildDecisionGraphExplorerResponse(baseGraph, {
      filters: {
        metricOwnerEntities: ["Team"],
        search: "backlog",
      },
    });

    expect(response.entities).toHaveLength(0);
    expect(response.metrics.map((metric) => metric.key)).toEqual([
      "team_backlog",
    ]);
    expect(response.debug.searchApplied).toBe(true);
  });

  it("fails closed on invalid explorer input", () => {
    expect(() =>
      buildDecisionGraphExplorerResponse(baseGraph, {
        filters: {
          entityNames: ["UnknownEntity"],
        },
      }),
    ).toThrow(/Unknown entity/);

    expect(() =>
      buildDecisionGraphExplorerResponse(baseGraph, {
        filters: {
          search: "   ",
        },
      }),
    ).toThrow(/filters.search cannot be empty/);

    expect(() =>
      buildDecisionGraphExplorerResponse(baseGraph, {
        lineage: {
          direction: "both",
        },
      }),
    ).toThrow(/lineage requires at least one entity or metric seed/);
  });
});
