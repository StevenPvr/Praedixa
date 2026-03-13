import { assertType, describe, expect, it } from "vitest";

import {
  DECISION_CONTRACT_TEMPLATE_PACKS,
  DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION,
  type DecisionContractTemplate,
} from "../domain/decision-contract-template.js";

describe("decision-contract-template domain model", () => {
  it("accepts a versioned template with eligibility and prefilled sections", () => {
    const template: DecisionContractTemplate = {
      kind: "DecisionContractTemplate",
      schemaVersion: DECISION_CONTRACT_TEMPLATE_SCHEMA_VERSION,
      templateId: "coverage.site.standard",
      templateVersion: 2,
      pack: "coverage",
      status: "active",
      name: "Coverage site standard",
      description: "Site-level coverage remediation template.",
      graphRef: {
        graphId: "coverage-site",
        graphVersion: 2,
      },
      eligibility: {
        entityTypes: ["site"],
        selectorModes: ["all", "ids"],
        horizonIds: ["J+3", "J+7", "J+14"],
        requiredSignals: [
          "coverage_gap_h",
          "absence_rate_pct",
          "forecasted_demand_h",
        ],
        requiredActions: ["schedule.adjust", "staffing.request.create"],
        requiredPolicyHooks: ["coverage.minimum_service", "coverage.labor_law"],
        requiredCapabilities: ["forecast_live", "action_dispatch"],
      },
      sections: {
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
            domain: { kind: "number", min: 0, step: 0.5 },
          },
        ],
        hardConstraints: [
          {
            key: "labor_rest",
            expression: "rest_hours >= 11",
          },
        ],
        softConstraints: [
          {
            key: "budget_guardrail",
            expression: "overtime_cost_eur <= overtime_budget_eur",
            weight: 0.5,
          },
        ],
        approvals: [
          {
            ruleId: "ops_manager_review",
            approverRole: "ops_manager",
            minStepOrder: 1,
          },
        ],
        actions: [
          {
            actionType: "schedule.adjust",
            destinationType: "wfm.shift",
            templateId: "wfm.shift.schedule_adjust",
          },
        ],
        policyHooks: ["coverage.minimum_service"],
        roiFormula: {
          currency: "EUR",
          estimatedExpression: "service_gain_eur - labor_delta_eur",
          components: [
            {
              key: "service_gain_eur",
              label: "Service gain",
              kind: "benefit",
              expression: "served_units_delta * margin_per_unit",
            },
          ],
        },
        explanationTemplate: {
          summaryTemplate: "{{top_driver}} under {{binding_constraint}}",
          topDriverKeys: ["coverage_gap_h"],
          bindingConstraintKeys: ["labor_rest"],
        },
      },
      tags: ["coverage", "site", "standard"],
    };

    assertType<DecisionContractTemplate>(template);
    expect(template.templateVersion).toBe(2);
    expect(template.eligibility.requiredSignals).toContain("coverage_gap_h");
    expect(
      template.sections.actions.map((action) => action.actionType),
    ).toEqual(["schedule.adjust"]);
  });

  it("covers the four supported packs without inventing extra packs", () => {
    const packs = new Set([
      "coverage",
      "flow",
      "allocation",
      "core",
    ] satisfies readonly DecisionContractTemplate["pack"][]);

    expect([...packs].sort()).toEqual(
      [...DECISION_CONTRACT_TEMPLATE_PACKS].sort(),
    );
    expect(DECISION_CONTRACT_TEMPLATE_PACKS).toHaveLength(4);
  });
});
