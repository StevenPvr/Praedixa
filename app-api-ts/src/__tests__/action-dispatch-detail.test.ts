import { describe, expect, expectTypeOf, it } from "vitest";
import type {
  ActionDispatchDetailRequest as SharedActionDispatchDetailRequest,
  ActionDispatchDetailResponse as SharedActionDispatchDetailResponse,
} from "@praedixa/shared-types/api";
import type { ActionDispatchRecord } from "@praedixa/shared-types/domain";

import {
  ActionDispatchDetailError,
  buildActionDispatchDedupeInsight,
  buildActionDispatchFallbackSummary,
  buildActionDispatchTimeline,
  evaluateActionDispatchRetryEligibility,
  resolveActionDispatchDetail,
  type ActionDispatchDetailRequest,
  type ActionDispatchDetailResponse,
} from "../services/action-dispatch-detail.js";

const acknowledgedRecord: ActionDispatchRecord = {
  kind: "ActionDispatch",
  schemaVersion: "1.0.0",
  actionId: "11111111-1111-1111-1111-111111111111",
  contractId: "coverage-core",
  contractVersion: 2,
  recommendationId: "22222222-2222-2222-2222-222222222222",
  approvalId: "33333333-3333-3333-3333-333333333333",
  status: "acknowledged",
  dispatchMode: "live",
  template: {
    templateId: "shift-open",
    templateVersion: 4,
    actionType: "shift_open",
    destinationType: "wfm.shift",
  },
  destination: {
    system: "wfm",
    connectorId: "44444444-4444-4444-4444-444444444444",
    targetResourceType: "shift",
    targetResourceId: "shift-lyon-1",
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
    retryableErrorCodes: ["timeout", "rate_limit"],
    backoffStrategy: "exponential",
    initialDelayMs: 1000,
    maxDelayMs: 8000,
  },
  idempotencyKey: "idem-coverage-lyon",
  payloadPreview: {
    shift: { id: "shift-lyon-1", date: "2026-03-14" },
    slots: [{ start: "08:00", end: "12:00" }],
  },
  payloadFinal: {
    shift: { id: "shift-lyon-1", date: "2026-03-14" },
    agent: { id: "agent-7" },
  },
  attempts: [
    {
      attemptNumber: 1,
      status: "dispatched",
      dispatchedAt: "2026-03-13T10:00:00.000Z",
      latencyMs: 320,
      targetReference: "wfm:dispatch:1",
    },
    {
      attemptNumber: 2,
      status: "acknowledged",
      dispatchedAt: "2026-03-13T10:05:00.000Z",
      latencyMs: 610,
      targetReference: "wfm:dispatch:1",
    },
  ],
  fallback: {
    status: "not_needed",
    channel: "notification",
    humanRequired: false,
  },
  createdAt: "2026-03-13T10:00:00.000Z",
  updatedAt: "2026-03-13T10:05:00.000Z",
};

const failedRetryableRecord: ActionDispatchRecord = {
  ...acknowledgedRecord,
  actionId: "55555555-5555-5555-5555-555555555555",
  status: "failed",
  idempotencyKey: "idem-retry",
  attempts: [
    {
      attemptNumber: 1,
      status: "failed",
      dispatchedAt: "2026-03-13T11:00:00.000Z",
      latencyMs: 1200,
      errorCode: "timeout",
      errorMessage: "Connector timeout",
    },
  ],
  createdAt: "2026-03-13T11:00:00.000Z",
  updatedAt: "2026-03-13T11:00:00.000Z",
};

const failedFallbackRecord: ActionDispatchRecord = {
  ...acknowledgedRecord,
  actionId: "66666666-6666-6666-6666-666666666666",
  status: "failed",
  idempotencyKey: "idem-collision",
  attempts: [
    {
      attemptNumber: 1,
      status: "failed",
      dispatchedAt: "2026-03-13T12:00:00.000Z",
      latencyMs: 900,
      errorCode: "manual_review_required",
      errorMessage: "Manual review required",
    },
  ],
  fallback: {
    status: "executed",
    channel: "task_copy",
    reference: "task-19",
    preparedAt: "2026-03-13T12:05:00.000Z",
    executedAt: "2026-03-13T12:10:00.000Z",
    activatedBy: "human",
    activationReason: "Ops handoff",
    humanRequired: true,
  },
  retryPolicy: {
    maxAttempts: 2,
    retryableErrorCodes: ["timeout"],
    backoffStrategy: "fixed",
    initialDelayMs: 1000,
  },
  createdAt: "2026-03-13T12:00:00.000Z",
  updatedAt: "2026-03-13T12:10:00.000Z",
};

const collidedRecord: ActionDispatchRecord = {
  ...acknowledgedRecord,
  actionId: "77777777-7777-7777-7777-777777777777",
  status: "canceled",
  idempotencyKey: "idem-collision",
  attempts: [
    {
      attemptNumber: 1,
      status: "canceled",
      dispatchedAt: "2026-03-13T12:02:00.000Z",
    },
  ],
  createdAt: "2026-03-13T12:01:00.000Z",
  updatedAt: "2026-03-13T12:02:00.000Z",
};

describe("action-dispatch-detail service", () => {
  it("keeps request and response shapes aligned with shared API types", () => {
    expectTypeOf<ActionDispatchDetailRequest>().toMatchTypeOf<SharedActionDispatchDetailRequest>();
    expectTypeOf<ActionDispatchDetailResponse>().toMatchTypeOf<SharedActionDispatchDetailResponse>();
  });

  it("resolves a stable acknowledged detail with safe payload refs", () => {
    const detail = resolveActionDispatchDetail([acknowledgedRecord], {
      actionId: acknowledgedRecord.actionId,
    });

    expect(detail.terminalReason).toEqual({
      terminal: true,
      code: "acknowledged",
      message: "Dispatch has been acknowledged by the destination.",
    });
    expect(detail.idempotency.status).toBe("unique");
    expect(detail.timeline.map((entry) => entry.kind)).toEqual([
      "created",
      "attempt",
      "attempt",
    ]);
    expect(detail.timeline[2]).toMatchObject({
      terminal: true,
      status: "acknowledged",
    });
    expect(detail.retryPolicy.eligibility.eligible).toBe(false);
    expect(detail.permissions).toEqual({
      allowedByContract: true,
      permissionKeys: ["shift.write"],
    });
    expect(detail.payloadRefs).toEqual([
      expect.objectContaining({
        source: "payloadPreview",
        available: true,
      }),
      expect.objectContaining({
        source: "payloadFinal",
        available: true,
      }),
    ]);
    expect(detail.payloadRefs[0]?.fieldPaths).toContain("shift.id");
    expect(detail.payloadRefs[0]?.fieldPaths).not.toContain("agent-7");
  });

  it("computes retry eligibility for a retryable failure", () => {
    const eligibility = evaluateActionDispatchRetryEligibility(
      failedRetryableRecord,
    );
    const detail = resolveActionDispatchDetail([failedRetryableRecord], {
      actionId: failedRetryableRecord.actionId,
      includePayloadRefs: false,
    });

    expect(eligibility).toMatchObject({
      eligible: true,
      remainingAttempts: 2,
      nextAttemptNumber: 2,
      blockedBy: [],
      retryableErrorCode: "timeout",
    });
    expect(detail.fallback).toMatchObject({
      status: "not_needed",
      nextStep: "none",
    });
    expect(detail.terminalReason).toMatchObject({
      terminal: false,
      code: "retry_available",
    });
    expect(detail.payloadRefs).toEqual([]);
  });

  it("surfaces collision insight and executed human fallback", () => {
    const records = [failedFallbackRecord, collidedRecord];
    const dedupe = buildActionDispatchDedupeInsight(
      records,
      failedFallbackRecord,
    );
    const fallback = buildActionDispatchFallbackSummary(failedFallbackRecord);
    const detail = resolveActionDispatchDetail(records, {
      actionId: failedFallbackRecord.actionId,
    });
    const timeline = buildActionDispatchTimeline(
      failedFallbackRecord,
      detail.terminalReason,
    );

    expect(dedupe).toMatchObject({
      status: "collision",
      relatedDispatchCount: 2,
      distinctActionCount: 2,
    });
    expect(fallback).toMatchObject({
      supported: true,
      status: "executed",
      nextStep: "monitor",
    });
    expect(detail.retryPolicy.eligibility).toMatchObject({
      eligible: false,
      blockedBy: expect.arrayContaining([
        "fallback_active",
        "error_not_retryable",
      ]),
    });
    expect(detail.terminalReason).toMatchObject({
      terminal: true,
      code: "human_fallback_executed",
    });
    expect(timeline.map((entry) => entry.kind)).toEqual([
      "created",
      "attempt",
      "fallback_prepared",
      "fallback_executed",
    ]);
    expect(timeline[3]?.terminal).toBe(true);
  });

  it("fails closed when a dispatch is missing or duplicated", () => {
    expect(() =>
      resolveActionDispatchDetail([], {
        actionId: acknowledgedRecord.actionId,
      }),
    ).toThrow(ActionDispatchDetailError);

    expect(() =>
      resolveActionDispatchDetail(
        [acknowledgedRecord, { ...acknowledgedRecord }],
        { actionId: acknowledgedRecord.actionId },
      ),
    ).toThrow(ActionDispatchDetailError);
  });
});
