import { assertType, describe, expectTypeOf, it } from "vitest";
import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioDetailRequest,
  DecisionContractStudioDetailResponse,
  DecisionContractStudioForkDraftRequest,
  DecisionContractStudioForkMutationRequest,
  DecisionContractStudioListRequest,
  DecisionContractStudioListResponse,
  DecisionContractStudioRollbackRequest,
  DecisionContractStudioSaveRequest,
  DecisionContractStudioTransitionRequest,
} from "../api/decision-contract-studio.js";
import type { DecisionContract } from "../domain/decision-contract.js";

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

  it("accepts save/create/transition/rollback requests", () => {
    const contract = {
      kind: "DecisionContract",
      schemaVersion: "1.0.0",
      contractId: "coverage-core",
      contractVersion: 2,
      name: "Coverage core v2",
      pack: "coverage",
      status: "draft",
      graphRef: { graphId: "coverage-graph", graphVersion: 2 },
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
          label: "Overtime",
          domain: { kind: "number", min: 0 },
        },
      ],
      hardConstraints: [{ key: "labor_rest", expression: "rest_hours >= 11" }],
      softConstraints: [],
      approvals: [
        {
          ruleId: "ops_review",
          approverRole: "ops_manager",
          minStepOrder: 1,
        },
      ],
      actions: [
        {
          actionType: "schedule.adjust",
          destinationType: "wfm.shift",
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
        status: "pending",
        checkedAt: null,
        issues: [],
      },
      audit: {
        createdBy: "11111111-1111-1111-1111-111111111111",
        createdAt: "2026-03-13T08:00:00.000Z",
        updatedBy: "11111111-1111-1111-1111-111111111111",
        updatedAt: "2026-03-13T08:00:00.000Z",
        changeReason: "Initial draft",
      },
    } satisfies DecisionContract;

    assertType<DecisionContractStudioSaveRequest>({
      contract,
    });
    assertType<DecisionContractStudioCreateRequest>({
      templateId: "coverage.site.standard",
      templateVersion: 2,
      contractId: "coverage-core",
      name: "Coverage core",
      reason: "bootstrap_coverage_contract",
      workspaceId: "11111111-1111-1111-1111-111111111111",
      scopeOverrides: {
        entityType: "site",
        selector: { mode: "ids", ids: ["site-lyon"] },
        horizonId: "J+7",
      },
      tags: ["coverage"],
    });
    assertType<DecisionContractStudioTransitionRequest>({
      transition: "submit_for_testing",
      reason: "ready_for_validation",
    });
    assertType<DecisionContractStudioForkMutationRequest>({
      reason: "iterate_after_publish",
      name: "Coverage core v3",
    });
    assertType<DecisionContractStudioRollbackRequest>({
      targetVersion: 1,
      reason: "rollback_after_regression",
    });
  });

  it("exposes studio list and detail responses", () => {
    expectTypeOf<DecisionContractStudioListResponse>().toHaveProperty("items");
    expectTypeOf<DecisionContractStudioDetailResponse>().toHaveProperty(
      "publishReadiness",
    );
    expectTypeOf<DecisionContractStudioDetailResponse>().toHaveProperty(
      "history",
    );
  });
});
