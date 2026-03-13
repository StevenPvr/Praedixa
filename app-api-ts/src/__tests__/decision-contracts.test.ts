import { describe, expect, it } from "vitest";

import {
  assertDecisionContractIntegrity,
  canPublishDecisionContract,
  forkDecisionContractVersion,
  transitionDecisionContract,
} from "../services/decision-contracts.js";

function buildActor(
  reason: string,
  decidedAt = "2026-03-13T09:00:00.000Z",
): {
  userId: string;
  decidedAt: string;
  reason: string;
} {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    decidedAt,
    reason,
  };
}

function buildContract(status = "draft" as const) {
  return {
    kind: "DecisionContract" as const,
    schemaVersion: "1.0.0" as const,
    contractId: "coverage-core",
    contractVersion: 1,
    name: "Coverage core",
    pack: "coverage" as const,
    status,
    graphRef: { graphId: "core-graph", graphVersion: 1 },
    scope: {
      entityType: "site" as const,
      selector: { mode: "ids" as const, ids: ["site-lyon"] },
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
      direction: "maximize" as const,
    },
    decisionVariables: [
      {
        key: "overtime_hours",
        label: "Overtime",
        domain: { kind: "number" as const, min: 0 },
      },
    ],
    hardConstraints: [
      {
        key: "legal_rest",
        expression: "rest >= 11",
        description: "Legal rest",
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
    actions: [{ actionType: "schedule.adjust", destinationType: "wfm.shift" }],
    policyHooks: ["coverage.minimum_service"],
    roiFormula: {
      currency: "EUR",
      estimatedExpression: "recommended - baseline",
      components: [
        {
          key: "labor_delta",
          label: "Labor delta",
          kind: "benefit" as const,
          expression: "recommended - baseline",
        },
      ],
    },
    explanationTemplate: {
      summaryTemplate: "{{top_driver}}",
      topDriverKeys: ["coverage_gap_h"],
      bindingConstraintKeys: ["legal_rest"],
    },
    validation: { status: "passed" as const, issues: [] },
    audit: {
      createdAt: "2026-03-13T08:00:00.000Z",
      updatedAt: "2026-03-13T08:00:00.000Z",
      createdBy: "11111111-1111-1111-1111-111111111111",
      updatedBy: "11111111-1111-1111-1111-111111111111",
      changeReason: "initial_draft",
    },
  };
}

describe("decision-contract services", () => {
  it("rejects invalid lifecycle transitions", () => {
    expect(() =>
      transitionDecisionContract(
        buildContract(),
        "publish",
        buildActor("premature_publish"),
      ),
    ).toThrow(/cannot transition/i);
  });

  it("rejects incomplete contracts", () => {
    const contract = buildContract();
    contract.actions = [];
    expect(() => assertDecisionContractIntegrity(contract)).toThrow(
      /at least one allowed action/i,
    );
  });

  it("records audit metadata on valid transitions", () => {
    const contract = transitionDecisionContract(
      buildContract(),
      "submit_for_testing",
      buildActor("ready_for_test"),
    );

    expect(contract.status).toBe("testing");
    expect(contract.audit.changeReason).toBe("ready_for_test");
    expect(contract.audit.updatedBy).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
  });

  it("requires approved audit metadata before publication", () => {
    const contract = {
      ...buildContract(),
      status: "approved" as const,
      audit: {
        ...buildContract().audit,
        changeReason: "manual_approval",
      },
    };

    expect(canPublishDecisionContract(contract)).toBe(false);
    expect(() =>
      transitionDecisionContract(
        contract,
        "publish",
        buildActor("publish_without_approval_audit"),
      ),
    ).toThrow(/approvedAt cannot be empty/i);
  });

  it("forks a new draft version from the currently published version", () => {
    const current = transitionDecisionContract(
      transitionDecisionContract(
        transitionDecisionContract(
          buildContract(),
          "submit_for_testing",
          buildActor("submit_for_testing", "2026-03-13T09:00:00.000Z"),
        ),
        "approve",
        buildActor("approve", "2026-03-13T10:00:00.000Z"),
      ),
      "publish",
      buildActor("publish", "2026-03-13T11:00:00.000Z"),
    );

    const forked = forkDecisionContractVersion(current, {
      actor: buildActor("rollback_after_issue", "2026-03-14T08:00:00.000Z"),
    });

    expect(forked.status).toBe("draft");
    expect(forked.contractVersion).toBe(2);
    expect(forked.audit.previousVersion).toBe(1);
    expect(forked.audit.rollbackFromVersion).toBe(1);
    expect(forked.audit.createdAt).toBe("2026-03-14T08:00:00.000Z");
    expect(forked.audit.changeReason).toBe("rollback_after_issue");
    expect(forked.validation?.status).toBe("pending");
  });
});
