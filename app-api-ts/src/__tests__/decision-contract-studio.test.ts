import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  DecisionContractStudioDetailResponse as SharedDecisionContractStudioDetailResponse,
  DecisionContractStudioListResponse as SharedDecisionContractStudioListResponse,
} from "@praedixa/shared-types/api";
import type { DecisionContract } from "@praedixa/shared-types/domain";

import {
  buildDecisionContractStudioDetailResponse,
  buildDecisionContractStudioForkDraftResponse,
  buildDecisionContractStudioListResponse,
  buildDecisionContractStudioRollbackCandidateResponse,
  type DecisionContractStudioDetailResponse,
  type DecisionContractStudioListResponse,
} from "../services/decision-contract-studio.js";

function buildContract(
  version: number,
  status: DecisionContract["status"],
): DecisionContract {
  const approvedAt =
    status === "approved" || status === "published"
      ? "2026-03-13T10:00:00.000Z"
      : null;
  const approvedBy =
    status === "approved" || status === "published"
      ? "11111111-1111-1111-1111-111111111111"
      : null;
  const publishedAt =
    status === "published" ? "2026-03-13T11:00:00.000Z" : null;
  const publishedBy =
    status === "published" ? "11111111-1111-1111-1111-111111111111" : null;

  return {
    kind: "DecisionContract",
    schemaVersion: "1.0.0",
    contractId: "coverage-core",
    contractVersion: version,
    name: `Coverage core v${version}`,
    pack: "coverage",
    status,
    graphRef: { graphId: "core-graph", graphVersion: version },
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon"] },
      horizonId: "j7",
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
        key: "legal_rest",
        expression: "rest >= 11",
      },
    ],
    softConstraints: [],
    approvals: [
      {
        ruleId: "org-admin-approval",
        approverRole: "org_admin",
        minStepOrder: 1,
      },
    ],
    actions: [
      {
        actionType: "schedule.adjust",
        destinationType: "wfm.shift",
      },
    ],
    policyHooks: ["coverage.minimum_service"],
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
      bindingConstraintKeys: ["legal_rest"],
    },
    validation: {
      status: status === "draft" ? "pending" : "passed",
      issues: [],
      checkedAt: status === "draft" ? null : "2026-03-13T09:30:00.000Z",
    },
    audit: {
      createdAt: "2026-03-13T08:00:00.000Z",
      updatedAt: `2026-03-13T0${8 + version}:00:00.000Z`,
      createdBy: "11111111-1111-1111-1111-111111111111",
      updatedBy: "11111111-1111-1111-1111-111111111111",
      changeReason: `update_v${version}`,
      previousVersion: version > 1 ? version - 1 : null,
      rollbackFromVersion: null,
      approvedAt,
      approvedBy,
      publishedAt,
      publishedBy,
      archivedAt: null,
      archivedBy: null,
    },
  };
}

describe("decision-contract studio service", () => {
  it("keeps list/detail responses aligned with shared API types", () => {
    expectTypeOf<DecisionContractStudioListResponse>().toMatchTypeOf<SharedDecisionContractStudioListResponse>();
    expectTypeOf<DecisionContractStudioDetailResponse>().toMatchTypeOf<SharedDecisionContractStudioDetailResponse>();
  });

  it("builds filtered studio list items with readiness and lineage", () => {
    const response = buildDecisionContractStudioListResponse(
      [
        buildContract(1, "draft"),
        buildContract(2, "approved"),
        buildContract(3, "published"),
      ],
      {
        statuses: ["approved", "published"],
      },
    );

    expect(response.total).toBe(2);
    expect(response.items.map((item) => item.contractVersion)).toEqual([3, 2]);
    expect(response.items[0]?.publishReadiness.isReady).toBe(false);
    expect(response.items[1]?.publishReadiness.isReady).toBe(true);
  });

  it("builds detail change summaries and forked drafts", () => {
    const previous = buildContract(1, "published");
    const current: DecisionContract = {
      ...buildContract(2, "approved"),
      decisionVariables: [
        ...buildContract(2, "approved").decisionVariables,
        {
          key: "temp_staff",
          label: "Temp staff",
          domain: { kind: "integer" as const, min: 0 },
        },
      ],
    };

    const detail = buildDecisionContractStudioDetailResponse(
      current,
      previous,
      [
        {
          auditId: "audit-1",
          action: "decision_contract_transition_approve",
          actorUserId: "11111111-1111-1111-1111-111111111111",
          targetContractVersion: 2,
          reason: "approved_for_publish",
          createdAt: "2026-03-14T07:30:00.000Z",
          metadata: {},
        },
      ],
    );
    expect(detail.changeSummary?.decisionVariables.added).toBe(1);
    expect(detail.history).toHaveLength(1);

    const fork = buildDecisionContractStudioForkDraftResponse(previous, {
      contractId: previous.contractId,
      contractVersion: previous.contractVersion,
      actor: {
        userId: "11111111-1111-1111-1111-111111111111",
        decidedAt: "2026-03-14T08:00:00.000Z",
        reason: "iterate",
      },
      name: "Coverage core v2",
    });
    expect(fork.draftContract.status).toBe("draft");
    expect(fork.draftContract.contractVersion).toBe(2);
    expect(fork.targetContractVersion).toBeUndefined();
  });

  it("builds rollback candidates ordered by nearest prior version", () => {
    const current = buildContract(3, "published");
    const response = buildDecisionContractStudioRollbackCandidateResponse(
      current,
      [buildContract(1, "published"), buildContract(2, "approved"), current],
    );

    expect(
      response.candidates.map((candidate) => candidate.contractVersion),
    ).toEqual([2, 1]);
  });
});
