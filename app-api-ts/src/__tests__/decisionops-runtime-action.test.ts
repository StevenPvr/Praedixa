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
  LedgerEntry,
} from "@praedixa/shared-types/domain";

import { decidePersistentActionDispatch } from "../services/decisionops-runtime-action.js";
import { withTransaction } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const RECOMMENDATION_ID = "22222222-2222-4222-8222-222222222222";
const ACTION_ID = "33333333-3333-4333-8333-333333333333";

const mockedWithTransaction = vi.mocked(withTransaction);

function buildActionRecord(
  overrides: Partial<ActionDispatchRecord> = {},
): ActionDispatchRecord {
  return {
    kind: "ActionDispatch",
    schemaVersion: "1.0.0",
    actionId: ACTION_ID,
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    approvalId: "44444444-4444-4444-8444-444444444444",
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
      maxDelayMs: 15_000,
    },
    idempotencyKey: "coverage-core:222:wfm.shift",
    payloadPreview: { site_code: "site-lyon" },
    attempts: [],
    fallback: {
      status: "prepared",
      channel: "task_copy",
      preparedAt: "2026-03-13T10:59:00.000Z",
      activatedBy: "system",
      activationReason: "awaiting_dispatch",
      humanRequired: true,
    },
    createdAt: "2026-03-13T10:58:00.000Z",
    updatedAt: "2026-03-13T10:59:00.000Z",
    ...overrides,
  };
}

function buildLedger(status: LedgerEntry["status"] = "open"): LedgerEntry {
  return {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: "55555555-5555-4555-8555-555555555555",
    contractId: "coverage-core",
    contractVersion: 2,
    recommendationId: RECOMMENDATION_ID,
    status,
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
      actionId: ACTION_ID,
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
      components: [],
    },
    explanation: {
      topDrivers: ["gap_h"],
      bindingConstraints: ["dispatch_pending"],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
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

describe("decidePersistentActionDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists an acknowledged dispatch and moves the ledger to measuring", async () => {
    const dispatched = buildActionRecord({
      status: "dispatched",
      attempts: [
        {
          attemptNumber: 1,
          status: "dispatched",
          dispatchedAt: "2026-03-13T11:00:00.000Z",
        },
      ],
    });
    const ledger = buildLedger("open");
    const client = createClientWithResponses([
      { rows: [buildActionRow(dispatched)] },
      {},
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentActionDispatch({
      organizationId: ORGANIZATION_ID,
      actionId: ACTION_ID,
      actorUserId: "admin-1",
      actorRole: "super_admin",
      request: {
        outcome: "acknowledged",
        reasonCode: "connector_ack",
        targetReference: "ukg-shift-42",
        occurredAt: "2026-03-13T11:05:00.000Z",
      },
    });

    expect(result.actionStatus).toBe("acknowledged");
    expect(result.latestAttemptStatus).toBe("acknowledged");
    expect(result.ledgerStatus).toBe("measuring");
    expect(result.fallbackStatus).toBe("not_needed");
    expect(result.retryEligible).toBe(false);
  });

  it("persists a failed dispatch and keeps retry eligibility explicit", async () => {
    const pending = buildActionRecord();
    const ledger = buildLedger("open");
    const client = createClientWithResponses([
      { rows: [buildActionRow(pending)] },
      {},
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentActionDispatch({
      organizationId: ORGANIZATION_ID,
      actionId: ACTION_ID,
      actorUserId: "admin-1",
      actorRole: "super_admin",
      request: {
        outcome: "failed",
        reasonCode: "connector_timeout",
        errorCode: "UKG_TIMEOUT",
        comment: "Timeout after upstream call.",
        occurredAt: "2026-03-13T11:00:00.000Z",
      },
    });

    expect(result.actionStatus).toBe("failed");
    expect(result.latestAttemptStatus).toBe("failed");
    expect(result.ledgerStatus).toBe("open");
    expect(result.retryEligible).toBe(true);
  });

  it("fails closed on invalid lifecycle transitions", async () => {
    const pending = buildActionRecord();
    const client = createClientWithResponses([
      { rows: [buildActionRow(pending)] },
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    await expect(
      decidePersistentActionDispatch({
        organizationId: ORGANIZATION_ID,
        actionId: ACTION_ID,
        actorUserId: "admin-1",
        actorRole: "super_admin",
        request: {
          outcome: "acknowledged",
          reasonCode: "connector_ack",
        },
      }),
    ).rejects.toMatchObject({
      code: "INVALID_ACTION_DISPATCH_DECISION",
      statusCode: 400,
    });
  });
});
