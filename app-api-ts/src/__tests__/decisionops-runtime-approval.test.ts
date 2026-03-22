import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/persistence.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../services/persistence.js")>();
  return {
    ...actual,
    withTransaction: vi.fn(),
  };
});

import type {
  ActionDispatchRecord,
  ApprovalRecord,
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import { decidePersistentApproval } from "../services/decisionops-runtime-approval.js";
import { withTransaction } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const RECOMMENDATION_ID = "22222222-2222-4222-8222-222222222222";
const APPROVAL_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_APPROVAL_ID = "77777777-7777-4777-8777-777777777777";
const ACTOR_USER_ID = "99999999-9999-4999-8999-999999999999";

const mockedWithTransaction = vi.mocked(withTransaction);

function buildApprovalRecord(
  overrides: Partial<ApprovalRecord> = {},
): ApprovalRecord {
  return {
    kind: "Approval",
    schemaVersion: "1.0.0",
    approvalId: APPROVAL_ID,
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
      riskScore: 0.35,
      actionTypes: ["schedule.adjust"],
      destinationTypes: ["wfm.shift"],
    },
    separationOfDuties: {
      required: false,
      satisfied: true,
      requesterActorId: "44444444-4444-4444-8444-444444444444",
    },
    history: [],
    ...overrides,
  };
}

function buildPendingActionRecord(): ActionDispatchRecord {
  return {
    kind: "ActionDispatch",
    schemaVersion: "1.0.0",
    actionId: "55555555-5555-4555-8555-555555555555",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    approvalId: APPROVAL_ID,
    status: "pending",
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
    attempts: [],
    createdAt: "2026-03-13T10:59:00.000Z",
    updatedAt: "2026-03-13T10:59:00.000Z",
  };
}

function buildOpenLedgerEntry(): LedgerEntry {
  return {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: "66666666-6666-4666-8666-666666666666",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    status: "open",
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
      status: "pending",
      destination: "wfm.shift",
    },
    counterfactual: {
      method: "forecast_baseline_v2",
    },
    roi: {
      currency: "EUR",
      estimatedValue: 600,
      validationStatus: "estimated",
      components: [
        {
          key: "bau_cost_avoidance_eur",
          label: "BAU cost avoidance",
          kind: "benefit",
          value: 920,
          validationStatus: "estimated",
        },
        {
          key: "dispatch_cost_eur",
          label: "Dispatch cost",
          kind: "cost",
          value: 320,
          validationStatus: "estimated",
        },
      ],
    },
    explanation: {
      topDrivers: ["gap_h"],
      bindingConstraints: ["approval_required", "dispatch_pending"],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
  };
}

function buildApprovalRow(record: ApprovalRecord) {
  return {
    approval_id: record.approvalId,
    contract_id: record.contractId,
    contract_version: record.contractVersion,
    status: record.status,
    approver_role: record.rule.approverRole,
    rule_step_order: record.rule.stepOrder,
    record_json: record,
  };
}

function buildActionRow(record: ActionDispatchRecord) {
  return {
    action_id: record.actionId,
    status: record.status,
    dispatch_mode: record.dispatchMode,
    contract_id: record.contractId,
    contract_version: record.contractVersion,
    record_json: record,
  };
}

function buildLedgerRow(record: LedgerEntry) {
  return {
    ledger_id: record.ledgerId,
    revision: record.revision,
    status: record.status,
    validation_status: record.roi.validationStatus,
    contract_id: record.contractId,
    contract_version: record.contractVersion,
    record_json: record,
  };
}

function createClientWithResponses(
  responses: Array<{ rows?: unknown[] }>,
): PoolClient {
  return {
    query: vi.fn().mockImplementation(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("unexpected query call");
      }
      return { rows: next.rows ?? [] };
    }),
  } as unknown as PoolClient;
}

describe("decidePersistentApproval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists a granted approval and syncs ledger approval summaries", async () => {
    const approval = buildApprovalRecord();
    const action = buildPendingActionRecord();
    const ledger = buildOpenLedgerEntry();
    const client = createClientWithResponses([
      { rows: [buildApprovalRow(approval)] },
      { rows: [buildApprovalRow(approval)] },
      {},
      { rows: [buildActionRow(action)] },
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentApproval({
      organizationId: ORGANIZATION_ID,
      approvalId: APPROVAL_ID,
      actorUserId: ACTOR_USER_ID,
      actorRole: "super_admin",
      request: {
        outcome: "granted",
        reasonCode: "policy_ok",
        decidedAt: "2026-03-13T12:00:00.000Z",
      },
    });

    expect(result.approval.status).toBe("granted");
    expect(result.approval.decision?.reasonCode).toBe("policy_ok");
    expect(result.allApprovalsGranted).toBe(true);
    expect(result.allApprovalsResolved).toBe(true);
    expect(result.actionStatus).toBe("pending");
    expect(result.ledgerStatus).toBe("open");
  });

  it("rejects an approval, cancels siblings, and cancels the pending action", async () => {
    const first = buildApprovalRecord();
    const second = buildApprovalRecord({
      approvalId: SECOND_APPROVAL_ID,
      rule: {
        ruleId: "finance_review",
        stepOrder: 2,
        approverRole: "finance_manager",
        deadlineHours: 12,
      },
    });
    const action = buildPendingActionRecord();
    const ledger = buildOpenLedgerEntry();
    const client = createClientWithResponses([
      { rows: [buildApprovalRow(first)] },
      { rows: [buildApprovalRow(first), buildApprovalRow(second)] },
      {},
      {},
      { rows: [buildActionRow(action)] },
      {},
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentApproval({
      organizationId: ORGANIZATION_ID,
      approvalId: APPROVAL_ID,
      actorUserId: ACTOR_USER_ID,
      actorRole: "super_admin",
      request: {
        outcome: "rejected",
        reasonCode: "budget_blocked",
        comment: "Rejected by finance policy.",
        decidedAt: "2026-03-13T12:30:00.000Z",
      },
    });

    expect(result.approval.status).toBe("rejected");
    expect(result.approval.decision?.reasonCode).toBe("budget_blocked");
    expect(result.allApprovalsGranted).toBe(false);
    expect(result.allApprovalsResolved).toBe(true);
    expect(result.actionStatus).toBe("canceled");
    expect(result.ledgerStatus).toBe("open");
  });

  it("fails closed when justification is required but missing", async () => {
    const approval = buildApprovalRecord({
      separationOfDuties: {
        required: true,
        satisfied: false,
        requesterActorId: "44444444-4444-4444-8444-444444444444",
      },
    });
    const client = createClientWithResponses([
      { rows: [buildApprovalRow(approval)] },
      { rows: [buildApprovalRow(approval)] },
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    await expect(
      decidePersistentApproval({
        organizationId: ORGANIZATION_ID,
        approvalId: APPROVAL_ID,
        actorUserId: ACTOR_USER_ID,
        actorRole: "super_admin",
        request: {
          outcome: "granted",
          reasonCode: "policy_ok",
          decidedAt: "2026-03-13T12:00:00.000Z",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_APPROVAL_DECISION",
      statusCode: 400,
    });
  });
});
