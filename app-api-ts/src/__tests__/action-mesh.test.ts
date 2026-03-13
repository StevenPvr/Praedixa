import { describe, expect, it } from "vitest";

import {
  activateHumanFallback,
  appendActionDispatchAttempt,
  appendActionDispatchRetry,
  assertUniqueActionDispatchIdempotencyKey,
  createActionDispatchRecord,
  executePreparedFallback,
  shouldRetryActionDispatch,
  type ActionDispatchRecord,
} from "../services/action-mesh.js";

function buildActionDispatch(
  overrides: Partial<ActionDispatchRecord> = {},
): ActionDispatchRecord {
  return {
    kind: "ActionDispatch",
    schemaVersion: "1.0.0",
    actionId: "11111111-1111-1111-1111-111111111111",
    contractId: "coverage_shift_fill",
    contractVersion: 3,
    recommendationId: "22222222-2222-2222-2222-222222222222",
    status: "pending",
    dispatchMode: "live",
    template: {
      templateId: "wfm_shift_v1",
      templateVersion: 1,
      actionType: "write_shift_plan",
      destinationType: "wfm_shift",
    },
    destination: {
      system: "ukg",
      targetResourceType: "shift",
      targetResourceId: "shift-001",
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
      permissionKeys: ["dispatch:ukg:shift:write"],
    },
    retryPolicy: {
      maxAttempts: 2,
      retryableErrorCodes: ["UKG_WRITE_FAILED", "UKG_RATE_LIMITED"],
      backoffStrategy: "exponential",
      initialDelayMs: 1000,
      maxDelayMs: 8000,
    },
    idempotencyKey: "coverage_shift_fill:rec-1",
    payloadPreview: {
      shiftId: "shift-001",
    },
    attempts: [],
    createdAt: "2026-03-13T10:00:00.000Z",
    updatedAt: "2026-03-13T10:00:00.000Z",
    ...overrides,
  };
}

describe("action mesh service", () => {
  it("creates pending live dispatches and dry-run previews deterministically", () => {
    expect(createActionDispatchRecord(buildActionDispatch()).status).toBe(
      "pending",
    );
    expect(
      createActionDispatchRecord(
        buildActionDispatch({
          dispatchMode: "dry_run",
        }),
      ).status,
    ).toBe("dry_run");
  });

  it("rejects duplicate idempotency keys across different action records", () => {
    const existing = createActionDispatchRecord(buildActionDispatch());
    const duplicate = buildActionDispatch({
      actionId: "33333333-3333-4333-8333-333333333333",
    });

    expect(() =>
      assertUniqueActionDispatchIdempotencyKey([existing], duplicate),
    ).toThrow(/already assigned/);
  });

  it("records dispatch progression and blocks invalid retry transitions", () => {
    const pending = createActionDispatchRecord(buildActionDispatch());

    expect(() =>
      appendActionDispatchRetry(pending, {
        retriedAt: "2026-03-13T10:05:00.000Z",
      }),
    ).toThrow(/Only failed dispatches can transition to retried/);

    const failed = appendActionDispatchAttempt(pending, {
      attemptNumber: 1,
      status: "failed",
      dispatchedAt: "2026-03-13T10:10:00.000Z",
      errorCode: "UKG_WRITE_FAILED",
      errorMessage: "upstream rejected the mutation",
    });

    expect(shouldRetryActionDispatch(failed)).toBe(true);

    const retried = appendActionDispatchRetry(failed, {
      retriedAt: "2026-03-13T10:11:00.000Z",
    });

    expect(retried.status).toBe("retried");
    expect(retried.attempts[1]).toMatchObject({
      attemptNumber: 2,
      status: "retried",
      errorCode: "UKG_WRITE_FAILED",
    });
  });

  it("acknowledges successful dispatches and closes fallback as not needed", () => {
    const dispatched = appendActionDispatchAttempt(
      createActionDispatchRecord(buildActionDispatch()),
      {
        attemptNumber: 1,
        status: "dispatched",
        dispatchedAt: "2026-03-13T10:10:00.000Z",
        latencyMs: 420,
      },
    );

    const acknowledged = appendActionDispatchAttempt(dispatched, {
      attemptNumber: 2,
      status: "acknowledged",
      dispatchedAt: "2026-03-13T10:11:00.000Z",
      targetReference: "ukg-shift-001",
    });

    expect(acknowledged.status).toBe("acknowledged");
    expect(acknowledged.fallback).toEqual({
      status: "not_needed",
      channel: "notification",
      humanRequired: false,
    });
  });

  it("activates and executes a human fallback when retries are exhausted", () => {
    const failed = appendActionDispatchAttempt(
      createActionDispatchRecord(
        buildActionDispatch({
          retryPolicy: {
            maxAttempts: 1,
            retryableErrorCodes: ["UKG_WRITE_FAILED"],
            backoffStrategy: "fixed",
            initialDelayMs: 1000,
          },
        }),
      ),
      {
        attemptNumber: 1,
        status: "failed",
        dispatchedAt: "2026-03-13T10:10:00.000Z",
        errorCode: "UKG_WRITE_FAILED",
      },
    );

    expect(shouldRetryActionDispatch(failed)).toBe(false);

    const prepared = activateHumanFallback(failed, {
      channel: "task_copy",
      preparedAt: "2026-03-13T10:12:00.000Z",
      activatedBy: "system",
      activationReason: "retry_budget_exhausted",
      reference: "task-123",
    });
    const executed = executePreparedFallback(
      prepared,
      "2026-03-13T10:15:00.000Z",
    );

    expect(executed.fallback).toEqual({
      status: "executed",
      channel: "task_copy",
      preparedAt: "2026-03-13T10:12:00.000Z",
      executedAt: "2026-03-13T10:15:00.000Z",
      activatedBy: "system",
      activationReason: "retry_budget_exhausted",
      humanRequired: true,
      reference: "task-123",
    });
  });
});
