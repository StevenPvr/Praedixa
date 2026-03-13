import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DecisionCompatibilityRequest as SharedDecisionCompatibilityRequest,
  DecisionCompatibilityResponse as SharedDecisionCompatibilityResponse,
} from "@praedixa/shared-types/api";
import type {
  DecisionContract,
  DecisionGraph,
} from "@praedixa/shared-types/domain";

import {
  evaluateDecisionCompatibility,
  type DecisionCompatibilityRequest,
  type DecisionCompatibilityResponse,
} from "../services/decision-compatibility.js";

const contract: DecisionContract = {
  kind: "DecisionContract",
  schemaVersion: "1.0.0",
  contractId: "coverage-core",
  contractVersion: 2,
  name: "Coverage core",
  pack: "coverage",
  status: "testing",
  graphRef: {
    graphId: "coverage-graph",
    graphVersion: 2,
  },
  scope: {
    entityType: "site",
    selector: { mode: "all" },
    horizonId: "J+7",
  },
  inputs: [
    {
      key: "coverage_gap_h",
      entity: "Site",
      attribute: "coverage_gap_h",
      required: true,
    },
  ],
  objective: {
    metricKey: "service_level_pct",
    direction: "maximize",
  },
  decisionVariables: [
    {
      key: "overtime_hours",
      label: "Overtime hours",
      domain: { kind: "number", min: 0 },
    },
  ],
  hardConstraints: [
    {
      key: "labor_rest",
      expression: "rest_hours >= 11",
    },
  ],
  softConstraints: [],
  approvals: [
    {
      ruleId: "ops_review",
      approverRole: "ops_manager",
      minStepOrder: 1,
      thresholdKey: "service_level_pct",
    },
  ],
  actions: [
    {
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      templateId: "wfm.shift.schedule_adjust",
    },
  ],
  policyHooks: [],
  roiFormula: {
    currency: "EUR",
    estimatedExpression: "recommended - baseline",
    components: [
      {
        key: "labor_delta",
        label: "Labor delta",
        kind: "benefit",
        expression: "recommended - baseline",
      },
    ],
  },
  explanationTemplate: {
    summaryTemplate: "{{top_driver}}",
    topDriverKeys: ["coverage_gap_h"],
    bindingConstraintKeys: ["labor_rest"],
  },
  validation: {
    status: "passed",
    checkedAt: "2026-03-13T09:00:00.000Z",
    issues: [],
  },
  audit: {
    createdBy: "11111111-1111-4111-8111-111111111111",
    createdAt: "2026-03-13T08:00:00.000Z",
    updatedBy: "11111111-1111-4111-8111-111111111111",
    updatedAt: "2026-03-13T08:30:00.000Z",
    changeReason: "Initial contract",
    previousVersion: 1,
  },
};

const graph: DecisionGraph = {
  kind: "DecisionGraph",
  schemaVersion: "1.0.0",
  graphId: "coverage-graph",
  graphVersion: 2,
  name: "Coverage graph",
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
        {
          key: "coverage_gap_h",
          valueType: "number",
          nullable: false,
        },
      ],
      sourceBindings: [
        {
          sourceSystem: "wms",
          field: "coverage_gap_h",
        },
      ],
    },
  ],
  relations: [],
  metrics: [
    {
      key: "service_level_pct",
      label: "Service level",
      grain: "site",
      ownerEntity: "Site",
      valueType: "number",
      expression: "served / planned",
      dependsOn: ["Site.coverage_gap_h"],
      snapshotPolicy: "recomputable",
      timeHorizonRequired: true,
    },
  ],
  dimensions: [],
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
  audit: {
    createdAt: "2026-03-13T08:00:00.000Z",
    createdBy: "11111111-1111-4111-8111-111111111111",
    changeReason: "Initial graph",
  },
};

describe("decision-compatibility service", () => {
  it("keeps request and response shapes aligned with shared API types", () => {
    expectTypeOf<DecisionCompatibilityRequest>().toMatchTypeOf<SharedDecisionCompatibilityRequest>();
    expectTypeOf<DecisionCompatibilityResponse>().toMatchTypeOf<SharedDecisionCompatibilityResponse>();
  });

  it("marks a compatible contract as green", () => {
    const response = evaluateDecisionCompatibility({
      contract,
      graph,
      versionAssumptions: {
        expectedGraphVersion: 2,
        expectedCanonicalModelVersion: "1.2.0",
      },
      eventAssumptions: {
        requiredSourceSystems: ["wms"],
      },
    });

    expect(response.compatible).toBe(true);
    expect(response.blockingIssueCount).toBe(0);
    expect(response.warningCount).toBe(0);
  });

  it("fails closed when the graph no longer satisfies the contract", () => {
    const response = evaluateDecisionCompatibility({
      contract: {
        ...contract,
        actions: [
          {
            actionType: "schedule.adjust",
            destinationType: "wfm.shift",
          },
        ],
        scope: {
          ...contract.scope,
          horizonId: "J+14",
        },
      },
      graph: {
        ...graph,
        graphVersion: 3,
        compatibility: {
          ...graph.compatibility,
          breakingChange: true,
        },
      },
      versionAssumptions: {
        expectedGraphVersion: 2,
      },
    });

    expect(response.compatible).toBe(false);
    expect(response.blockingIssueCount).toBeGreaterThan(0);
    expect(response.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "graph_version_mismatch",
        "graph_version_assumption_mismatch",
        "missing_horizon",
        "action_template_warning",
      ]),
    );
  });
});
