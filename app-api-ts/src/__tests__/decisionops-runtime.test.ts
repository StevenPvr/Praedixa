import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    queryRows: vi.fn(),
  };
});

import type {
  ActionDispatchRecord,
  ApprovalRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import {
  getPersistentActionDispatchDetail,
  getPersistentLedgerDetail,
  initializePersistentDecisionOpsRuntime,
  listPersistentApprovalInbox,
} from "../services/decisionops-runtime.js";
import { queryRows } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const RECOMMENDATION_ID = "22222222-2222-4222-8222-222222222222";

const mockedQueryRows = vi.mocked(queryRows);

function buildFakeClient(query: ReturnType<typeof vi.fn>): PoolClient {
  return { query } as unknown as PoolClient;
}

function buildApprovalRecord(): ApprovalRecord {
  return {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: "33333333-3333-4333-8333-333333333333",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    status: "requested",
    scope: {
      entityType: "site",
      selector: { mode: "ids", ids: ["site-lyon"] },
      horizonId: "j7",
    },
    requestedAt: "2026-03-13T10:00:00.000Z",
    deadlineAt: "2026-03-13T14:00:00.000Z",
    requestedBy: {
      actorType: "user",
      actorId: "44444444-4444-4444-8444-444444444444",
      actorRole: "manager",
    },
    rule: {
      ruleId: "ops_manager_review",
      stepOrder: 1,
      approverRole: "ops_manager",
      deadlineHours: 4,
    },
    policyContext: {
      estimatedCostEur: 480,
      riskScore: 0.76,
      actionTypes: ["schedule.adjust"],
      destinationTypes: ["wfm.shift"],
    },
    separationOfDuties: {
      required: true,
      satisfied: false,
      requesterActorId: "44444444-4444-4444-8444-444444444444",
    },
    history: [],
  };
}

function buildActionDispatchRecord(): ActionDispatchRecord {
  return {
    kind: "ActionDispatch",
    schemaVersion: "1.0.0",
    actionId: "55555555-5555-4555-8555-555555555555",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    approvalId: "33333333-3333-4333-8333-333333333333",
    status: "failed",
    dispatchMode: "live",
    template: {
      templateId: "wfm.shift.schedule_adjust",
      templateVersion: 2,
      actionType: "schedule.adjust",
      destinationType: "wfm.shift",
    },
    destination: {
      system: "ukg",
      targetResourceType: "wfm.shift",
      targetResourceId: "site-lyon",
      sandbox: false,
      capabilities: {
        supportsDryRun: true,
        supportsSandbox: true,
        supportsAcknowledgement: true,
        supportsCancellation: true,
        supportsRetry: true,
        supportsIdempotencyKeys: true,
        supportsHumanFallback: true,
      },
    },
    permissionsContext: {
      allowedByContract: true,
      permissionKeys: ["shift.write"],
    },
    retryPolicy: {
      maxAttempts: 3,
      retryableErrorCodes: ["UKG_TIMEOUT"],
      backoffStrategy: "exponential",
      initialDelayMs: 1000,
      maxDelayMs: 15000,
    },
    idempotencyKey: "coverage-core:222:wfm.shift",
    payloadPreview: { site_code: "site-lyon" },
    attempts: [
      {
        attemptNumber: 1,
        status: "failed",
        dispatchedAt: "2026-03-13T11:00:00.000Z",
        errorCode: "UKG_TIMEOUT",
        errorMessage: "Timeout",
      },
    ],
    fallback: {
      status: "prepared",
      channel: "task_copy",
      preparedAt: "2026-03-13T11:01:00.000Z",
      activatedBy: "system",
      activationReason: "awaiting_retry",
      humanRequired: true,
    },
    createdAt: "2026-03-13T10:59:00.000Z",
    updatedAt: "2026-03-13T11:01:00.000Z",
  };
}

function buildLedgerEntries(): LedgerEntry[] {
  return [
    {
      kind: "LedgerEntry",
      schemaVersion: "1.0.0",
      ledgerId: "66666666-6666-4666-8666-666666666666",
      contractId: "coverage-core",
      contractVersion: 2,
      recommendationId: RECOMMENDATION_ID,
      status: "closed",
      revision: 1,
      scope: {
        entityType: "site",
        selector: { mode: "ids", ids: ["site-lyon"] },
        horizonId: "j7",
      },
      baseline: {
        recordedAt: "2026-03-13T08:00:00.000Z",
        values: { gap_h: 6, predicted_impact_eur: 920 },
      },
      recommended: {
        recordedAt: "2026-03-13T08:05:00.000Z",
        actionSummary: "Shift adjustment",
        values: { chosen_cost_eur: 320, expected_service_pct: 0.95 },
      },
      approvals: [],
      action: {
        actionId: "55555555-5555-4555-8555-555555555555",
        status: "acknowledged",
        destination: "wfm.shift",
      },
      actual: {
        recordedAt: "2026-03-13T18:00:00.000Z",
        values: { chosen_cost_eur: 300, actual_service_pct: 0.96 },
      },
      counterfactual: {
        method: "forecast_baseline_v2",
      },
      roi: {
        currency: "EUR",
        estimatedValue: 600,
        realizedValue: 620,
        validationStatus: "validated",
        components: [
          {
            key: "bau_cost_avoidance_eur",
            label: "BAU cost avoidance",
            kind: "benefit",
            value: 920,
            validationStatus: "validated",
          },
          {
            key: "dispatch_cost_eur",
            label: "Dispatch cost",
            kind: "cost",
            value: 320,
            validationStatus: "validated",
          },
        ],
      },
      explanation: {
        topDrivers: ["gap_h"],
        bindingConstraints: ["approval_required"],
      },
      openedAt: "2026-03-13T08:00:00.000Z",
      closedAt: "2026-03-13T18:00:00.000Z",
    },
    {
      kind: "LedgerEntry",
      schemaVersion: "1.0.0",
      ledgerId: "66666666-6666-4666-8666-666666666666",
      contractId: "coverage-core",
      contractVersion: 2,
      recommendationId: RECOMMENDATION_ID,
      status: "recalculated",
      revision: 2,
      scope: {
        entityType: "site",
        selector: { mode: "ids", ids: ["site-lyon"] },
        horizonId: "j7",
      },
      baseline: {
        recordedAt: "2026-03-13T08:00:00.000Z",
        values: { gap_h: 6, predicted_impact_eur: 920 },
      },
      recommended: {
        recordedAt: "2026-03-13T08:05:00.000Z",
        actionSummary: "Shift adjustment",
        values: { chosen_cost_eur: 320, expected_service_pct: 0.95 },
      },
      approvals: [],
      action: {
        actionId: "55555555-5555-4555-8555-555555555555",
        status: "acknowledged",
        destination: "wfm.shift",
      },
      actual: {
        recordedAt: "2026-03-14T18:00:00.000Z",
        values: { chosen_cost_eur: 280, actual_service_pct: 0.97 },
      },
      counterfactual: {
        method: "forecast_baseline_v2",
      },
      roi: {
        currency: "EUR",
        estimatedValue: 640,
        realizedValue: 660,
        validationStatus: "validated",
        components: [
          {
            key: "bau_cost_avoidance_eur",
            label: "BAU cost avoidance",
            kind: "benefit",
            value: 940,
            validationStatus: "validated",
          },
          {
            key: "dispatch_cost_eur",
            label: "Dispatch cost",
            kind: "cost",
            value: 280,
            validationStatus: "validated",
          },
        ],
      },
      explanation: {
        topDrivers: ["gap_h"],
        bindingConstraints: ["approval_required"],
      },
      openedAt: "2026-03-13T08:00:00.000Z",
      closedAt: "2026-03-14T18:00:00.000Z",
      supersedes: {
        ledgerId: "66666666-6666-4666-8666-666666666666",
        revision: 1,
      },
    },
  ];
}

describe("decisionops runtime persistence", () => {
  beforeEach(() => {
    mockedQueryRows.mockReset();
  });

  it("initializes approval, dispatch and ledger artifacts for a recommendation", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await initializePersistentDecisionOpsRuntime(buildFakeClient(query), {
      organizationId: ORGANIZATION_ID,
      recommendationId: RECOMMENDATION_ID,
      siteId: "site-lyon",
      decisionDate: "2026-03-13",
      requestedAt: "2026-03-13T10:00:00.000Z",
      horizon: "j7",
      gapHours: 6,
      predictedImpactEur: 920,
      chosenOptionId: "77777777-7777-4777-8777-777777777777",
      chosenOptionLabel: "Shift adjustment",
      chosenOptionType: "hs",
      chosenCostEur: 320,
      chosenServicePct: 0.95,
      requestedByActorId: "88888888-8888-4888-8888-888888888888",
      requestedByActorRole: "manager",
      notes: "Escalade terrain",
    });

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0]?.[0]).toContain(
      "INSERT INTO decision_approvals",
    );
    expect(query.mock.calls[1]?.[0]).toContain(
      "INSERT INTO decision_approvals",
    );
    expect(query.mock.calls[2]?.[0]).toContain("INSERT INTO action_dispatches");
    expect(query.mock.calls[3]?.[0]).toContain(
      "INSERT INTO decision_ledger_entries",
    );
  });

  it("builds an approval inbox from persisted approval records", async () => {
    const approval = buildApprovalRecord();
    mockedQueryRows.mockResolvedValueOnce([
      {
        approval_id: approval.approvalId,
        contract_id: approval.contractId,
        contract_version: approval.contractVersion,
        status: approval.status,
        approver_role: approval.rule.approverRole,
        rule_step_order: approval.rule.stepOrder,
        record_json: approval,
      },
    ] as never);

    const response = await listPersistentApprovalInbox({
      organizationId: ORGANIZATION_ID,
    });

    expect(response.summary.total).toBe(1);
    expect(response.items[0]?.approvalId).toBe(approval.approvalId);
    expect(response.items[0]?.approverRole).toBe("ops_manager");
  });

  it("resolves action dispatch detail from persisted dispatch records", async () => {
    const action = buildActionDispatchRecord();
    mockedQueryRows.mockResolvedValueOnce([
      {
        action_id: action.actionId,
        status: action.status,
        dispatch_mode: action.dispatchMode,
        contract_id: action.contractId,
        contract_version: action.contractVersion,
        record_json: action,
      },
    ] as never);

    const detail = await getPersistentActionDispatchDetail({
      organizationId: ORGANIZATION_ID,
      actionId: action.actionId,
    });

    expect(detail.actionId).toBe(action.actionId);
    expect(detail.retryPolicy.eligibility.eligible).toBe(false);
    expect(detail.fallback.status).toBe("prepared");
  });

  it("resolves ledger detail from persisted ledger revisions", async () => {
    const entries = buildLedgerEntries();
    mockedQueryRows.mockResolvedValueOnce(
      entries.map((entry) => ({
        ledger_id: entry.ledgerId,
        revision: entry.revision,
        status: entry.status,
        validation_status: entry.roi.validationStatus,
        contract_id: entry.contractId,
        contract_version: entry.contractVersion,
        record_json: entry,
      })) as never,
    );

    const detail = await getPersistentLedgerDetail({
      organizationId: ORGANIZATION_ID,
      request: {
        ledgerId: entries[0]!.ledgerId,
        revision: 2,
        requiredComponentKeys: ["bau_cost_avoidance_eur", "dispatch_cost_eur"],
      },
    });

    expect(detail.selectedRevision).toBe(2);
    expect(detail.latestRevision).toBe(2);
    expect(detail.roi.realizedValue).toBe(660);
  });
});
