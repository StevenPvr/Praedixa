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

import type { LedgerEntry } from "@praedixa/shared-types/domain";

import { decidePersistentLedger } from "../services/decisionops-runtime-ledger.js";
import { withTransaction } from "../services/persistence.js";

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const LEDGER_ID = "22222222-2222-4222-8222-222222222222";
const RECOMMENDATION_ID = "33333333-3333-4333-8333-333333333333";

const mockedWithTransaction = vi.mocked(withTransaction);

function buildLedger(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    kind: "LedgerEntry",
    schemaVersion: "1.0.0",
    ledgerId: LEDGER_ID,
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
      values: { predicted_impact_eur: 920, gap_h: 6 },
    },
    recommended: {
      recordedAt: "2026-03-13T08:05:00.000Z",
      actionSummary: "Shift adjustment",
      values: { chosen_cost_eur: 320, expected_service_pct: 0.95 },
    },
    approvals: [],
    action: {
      actionId: "44444444-4444-4444-8444-444444444444",
      status: "acknowledged",
      destination: "wfm.shift",
      lastAttemptAt: "2026-03-13T09:15:00.000Z",
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
      ],
    },
    explanation: {
      topDrivers: ["gap_h"],
      bindingConstraints: [],
    },
    openedAt: "2026-03-13T08:00:00.000Z",
    ...overrides,
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

describe("decidePersistentLedger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes an open ledger with explicit actuals and ROI components", async () => {
    const ledger = buildLedger();
    const client = createClientWithResponses([
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentLedger({
      organizationId: ORGANIZATION_ID,
      ledgerId: LEDGER_ID,
      actorUserId: "finance-1",
      actorRole: "finance_manager",
      request: {
        operation: "close",
        reasonCode: "period_complete",
        occurredAt: "2026-03-13T18:00:00.000Z",
        actual: {
          values: {
            actual_service_pct: 0.96,
            dispatch_cost_eur: 300,
          },
        },
        roi: {
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
              value: 300,
              validationStatus: "estimated",
            },
          ],
        },
      },
    });

    expect(result.operation).toBe("close");
    expect(result.status).toBe("closed");
    expect(result.selectedRevision).toBe(1);
    expect(result.exportReadyFormats).toEqual([]);
  });

  it("recalculates a closed ledger into a new revision", async () => {
    const ledger = buildLedger({
      status: "closed",
      actual: {
        recordedAt: "2026-03-13T18:00:00.000Z",
        values: { actual_service_pct: 0.96 },
      },
      closedAt: "2026-03-13T18:00:00.000Z",
    });
    const client = createClientWithResponses([
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentLedger({
      organizationId: ORGANIZATION_ID,
      ledgerId: LEDGER_ID,
      actorUserId: "finance-1",
      actorRole: "finance_manager",
      request: {
        operation: "recalculate",
        reasonCode: "late_actuals",
        occurredAt: "2026-03-14T18:00:00.000Z",
        actual: {
          values: {
            actual_service_pct: 0.97,
            dispatch_cost_eur: 280,
          },
        },
        roi: {
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
      },
    });

    expect(result.operation).toBe("recalculate");
    expect(result.status).toBe("recalculated");
    expect(result.selectedRevision).toBe(2);
    expect(result.latestRevision).toBe(2);
    expect(result.exportReadyFormats).toEqual(["csv", "json", "xlsx"]);
  });

  it("validates an existing closed ledger revision", async () => {
    const ledger = buildLedger({
      status: "closed",
      actual: {
        recordedAt: "2026-03-13T18:00:00.000Z",
        values: { actual_service_pct: 0.96 },
      },
      closedAt: "2026-03-13T18:00:00.000Z",
    });
    const client = createClientWithResponses([
      { rows: [buildLedgerRow(ledger)] },
      {},
    ]);
    mockedWithTransaction.mockImplementation(async (fn) => await fn(client));

    const result = await decidePersistentLedger({
      organizationId: ORGANIZATION_ID,
      ledgerId: LEDGER_ID,
      actorUserId: "finance-1",
      actorRole: "finance_manager",
      request: {
        operation: "validate",
        reasonCode: "finance_review_complete",
        validationStatus: "validated",
      },
    });

    expect(result.operation).toBe("validate");
    expect(result.status).toBe("closed");
    expect(result.validationStatus).toBe("validated");
    expect(result.exportReadyFormats).toEqual(["csv", "json", "xlsx"]);
  });
});
