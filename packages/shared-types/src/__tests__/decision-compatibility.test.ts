import { assertType, describe, expect, expectTypeOf, it } from "vitest";
import type {
  DecisionCompatibilityIssue,
  DecisionCompatibilityIssueCode,
  DecisionCompatibilityRequest,
  DecisionCompatibilityResponse,
} from "../api/decision-compatibility.js";
import type { DecisionContract, DecisionGraph } from "../domain.js";

const contract: DecisionContract = {
  kind: "DecisionContract",
  schemaVersion: "1.0.0",
  contractId: "coverage-contract",
  contractVersion: 2,
  name: "Coverage contract",
  pack: "coverage",
  status: "testing",
  graphRef: {
    graphId: "coverage-graph",
    graphVersion: 2,
  },
  scope: {
    entityType: "site",
    selector: {
      mode: "all",
    },
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
      label: "Overtime",
      domain: { kind: "number", min: 0 },
    },
  ],
  hardConstraints: [
    {
      key: "labor_law",
      expression: "rest_hours >= 11",
    },
  ],
  softConstraints: [],
  approvals: [
    {
      ruleId: "approval-1",
      approverRole: "ops_manager",
      minStepOrder: 1,
      thresholdKey: "service_level_pct",
    },
  ],
  actions: [
    {
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
      templateId: "shift-adjustment",
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
    bindingConstraintKeys: ["labor_law"],
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

describe("decision-compatibility types", () => {
  it("captures request assumptions for contract, graph, version, and events", () => {
    assertType<DecisionCompatibilityRequest>({
      contract,
      graph,
      versionAssumptions: {
        expectedGraphVersion: 2,
        expectedCanonicalModelVersion: "1.2.0",
        allowBackwardCompatibleGraphVersion: true,
      },
      eventAssumptions: {
        requiredSourceSystems: ["wms"],
      },
    });

    expectTypeOf<DecisionCompatibilityRequest>().toHaveProperty(
      "versionAssumptions",
    );
    expectTypeOf<DecisionCompatibilityRequest>().toHaveProperty(
      "eventAssumptions",
    );
  });

  it("exposes structured gaps and warnings in the response shape", () => {
    const response: DecisionCompatibilityResponse = {
      contractId: contract.contractId,
      contractVersion: contract.contractVersion,
      graphId: graph.graphId,
      graphVersion: graph.graphVersion,
      compatible: true,
      blockingIssueCount: 0,
      warningCount: 0,
      contractGraphRefMatches: true,
      versionAssumptionsSatisfied: true,
      eventAssumptionsSatisfied: true,
      unsupportedPacks: [],
      missingInputs: [],
      missingMetrics: [],
      horizonMismatch: false,
      approvalWarnings: [],
      actionWarnings: [],
      issues: [],
    };

    expect(response.compatible).toBe(true);
    expectTypeOf<DecisionCompatibilityResponse>().toHaveProperty("issues");
    expectTypeOf<DecisionCompatibilityResponse>().toHaveProperty(
      "missingMetrics",
    );
  });

  it("keeps issue codes and severities explicit", () => {
    const issue: DecisionCompatibilityIssue = {
      severity: "blocking",
      code: "missing_metric",
      message: "Objective metric service_level_pct is missing from the graph.",
      contractField: "objective.metricKey",
      graphField: "metrics",
      reference: "service_level_pct",
    };

    const issueCode: DecisionCompatibilityIssueCode = issue.code;

    expect(issueCode).toBe("missing_metric");
    expect(issue.severity).toBe("blocking");
  });
});
