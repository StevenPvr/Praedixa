import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DecisionContractTemplateInstantiateRequest as SharedDecisionContractTemplateInstantiateRequest,
  DecisionContractTemplateInstantiateResponse as SharedDecisionContractTemplateInstantiateResponse,
  DecisionContractTemplateListResponse as SharedDecisionContractTemplateListResponse,
} from "@praedixa/shared-types/api";

import {
  instantiateDecisionContractTemplate,
  listDecisionContractTemplates,
  materializeDecisionContractTemplate,
  selectDecisionContractTemplate,
  type DecisionContractTemplateInstantiateRequest,
  type DecisionContractTemplateInstantiateResponse,
  type DecisionContractTemplateListResponse,
} from "../services/decision-contract-templates.js";

const ACTOR = {
  userId: "11111111-1111-4111-8111-111111111111",
  decidedAt: "2026-03-13T12:00:00.000Z",
  reason: "bootstrap",
} as const;

describe("decision-contract-templates service", () => {
  it("keeps request and response shapes aligned with shared API types", () => {
    expectTypeOf<DecisionContractTemplateInstantiateRequest>().toMatchTypeOf<SharedDecisionContractTemplateInstantiateRequest>();
    expectTypeOf<DecisionContractTemplateInstantiateResponse>().toMatchTypeOf<SharedDecisionContractTemplateInstantiateResponse>();
    expectTypeOf<DecisionContractTemplateListResponse>().toMatchTypeOf<SharedDecisionContractTemplateListResponse>();
  });

  it("lists active templates by default and filters by pack", () => {
    const response = listDecisionContractTemplates({
      pack: "coverage",
    });

    expect(response.total).toBe(1);
    expect(response.items[0]).toMatchObject({
      templateId: "coverage.site.standard",
      templateVersion: 2,
      pack: "coverage",
      status: "active",
      actionTypes: ["schedule.adjust", "staffing.request.create"],
    });
  });

  it("selects the latest active template and can opt into a deprecated version", () => {
    const active = selectDecisionContractTemplate({
      pack: "coverage",
      templateId: "coverage.site.standard",
    });
    const deprecated = selectDecisionContractTemplate({
      pack: "coverage",
      templateId: "coverage.site.standard",
      templateVersion: 1,
      includeDeprecated: true,
    });

    expect(active.templateVersion).toBe(2);
    expect(active.eligibility.requiredSignals).toContain("forecasted_demand_h");
    expect(deprecated.status).toBe("deprecated");
    expect(
      deprecated.sections.actions.map((action) => action.actionType),
    ).toEqual(["schedule.adjust"]);
  });

  it("fails closed on unknown templates and pack mismatches", () => {
    expect(() =>
      selectDecisionContractTemplate({
        pack: "coverage",
        templateId: "unknown.template",
      }),
    ).toThrow("Unknown DecisionContract template unknown.template.");

    expect(() =>
      selectDecisionContractTemplate({
        pack: "flow",
        templateId: "coverage.site.standard",
      }),
    ).toThrow(
      "DecisionContract template coverage.site.standard is not available for pack flow.",
    );
  });

  it("materializes a draft contract with prefilled sections and scope overrides", () => {
    const contract = materializeDecisionContractTemplate({
      pack: "allocation",
      templateId: "allocation.route.rebalance",
      contractId: "allocation-route-lyon",
      name: "Allocation route Lyon",
      actor: ACTOR,
      scopeOverrides: {
        selector: {
          mode: "ids",
          ids: ["route-lyon"],
        },
      },
      tags: ["allocation", "lyon"],
    });

    expect(contract).toMatchObject({
      contractId: "allocation-route-lyon",
      contractVersion: 1,
      status: "draft",
      pack: "allocation",
      templateRef: {
        templateId: "allocation.route.rebalance",
        templateVersion: 1,
      },
      scope: {
        selector: {
          mode: "ids",
          ids: ["route-lyon"],
        },
      },
      tags: ["allocation", "lyon"],
      validation: {
        status: "pending",
        checkedAt: null,
        issues: [],
      },
    });
    expect(contract.policyHooks).toEqual([
      "allocation.capacity_guardrail",
      "allocation.cost_cap",
    ]);
    expect(contract.actions.map((action) => action.actionType)).toEqual([
      "route.replan",
      "reserve.release",
    ]);
  });

  it("keeps the instantiate response aligned with the materialized draft", () => {
    const response = instantiateDecisionContractTemplate({
      templateId: "core.organization.guardrails",
      contractId: "core-governance",
      name: "Core governance",
      actor: ACTOR,
    });

    expect(response.template).toMatchObject({
      templateId: "core.organization.guardrails",
      templateVersion: 1,
      pack: "core",
    });
    expect(response.contract.templateRef).toEqual({
      templateId: "core.organization.guardrails",
      templateVersion: 1,
    });
    expect(response.contract.audit.changeReason).toBe("bootstrap");
  });
});
