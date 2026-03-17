import { z } from "zod";

import { failure } from "../response.js";
import { PersistenceError, isUuidString } from "../services/persistence.js";
import type { RouteContext, RouteResult } from "../types.js";

export const approvalDecisionSchema = z.object({
  outcome: z.enum(["granted", "rejected"]),
  reasonCode: z.string().trim().min(1).max(120),
  comment: z.string().trim().max(1_000).optional(),
  decidedAt: z.string().datetime().optional(),
});
export const actionDispatchDecisionSchema = z.object({
  outcome: z.enum([
    "dispatched",
    "acknowledged",
    "failed",
    "retried",
    "canceled",
  ]),
  reasonCode: z.string().trim().min(1).max(120),
  comment: z.string().trim().max(1_000).optional(),
  occurredAt: z.string().datetime().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  targetReference: z.string().trim().max(240).optional(),
  errorCode: z.string().trim().max(120).optional(),
  errorMessage: z.string().trim().max(1_000).optional(),
});
export const actionDispatchFallbackSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("prepare"),
    reasonCode: z.string().trim().min(1).max(120),
    comment: z.string().trim().max(1_000).optional(),
    occurredAt: z.string().datetime().optional(),
    channel: z.enum(["export", "link", "notification", "task_copy"]),
    reference: z.string().trim().max(240).optional(),
  }),
  z.object({
    operation: z.literal("execute"),
    reasonCode: z.string().trim().min(1).max(120),
    comment: z.string().trim().max(1_000).optional(),
    occurredAt: z.string().datetime().optional(),
  }),
]);
export const ledgerDecisionSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.enum(["close", "recalculate"]),
    reasonCode: z.string().trim().min(1).max(120),
    comment: z.string().trim().max(1_000).optional(),
    occurredAt: z.string().datetime().optional(),
    actual: z.object({
      recordedAt: z.string().datetime().optional(),
      values: z.record(z.union([z.number(), z.string(), z.boolean()])),
    }),
    roi: z.object({
      currency: z.string().trim().length(3).optional(),
      validationStatus: z.enum(["estimated", "validated", "contested"]),
      components: z.array(
        z.object({
          key: z.string().trim().min(1).max(120),
          label: z.string().trim().min(1).max(160),
          kind: z.enum(["benefit", "cost"]),
          value: z.number().finite(),
          validationStatus: z.enum(["estimated", "validated", "contested"]),
        }),
      ),
    }),
  }),
  z.object({
    operation: z.literal("validate"),
    reasonCode: z.string().trim().min(1).max(120),
    comment: z.string().trim().max(1_000).optional(),
    occurredAt: z.string().datetime().optional(),
    validationStatus: z.enum(["estimated", "validated", "contested"]),
  }),
]);

export const adminUsersWriteRateLimit = {
  maxRequests: 20,
  scope: "principal" as const,
  windowMs: 60_000,
};
const adminAllowedRoles = ["super_admin"] as const;
const adminOnly = { allowedRoles: adminAllowedRoles };
export const adminOrgRead = {
  ...adminOnly,
  requiredPermissions: ["admin:org:read"] as const,
};
export const adminOrgWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:org:write"] as const,
};

export type DecisionActorContext = {
  actorPermissions: readonly string[];
  actorRole: string;
  actorUserId: string;
};

export function normalizeOptionalText(value: string | null): string | null {
  if (value == null) {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function operationalFailureResponse(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof PersistenceError) {
    return failure(
      error.code,
      error.message,
      requestId,
      error.statusCode,
      error.details,
    );
  }

  return failure(
    fallbackCode,
    error instanceof Error ? error.message : fallbackMessage,
    requestId,
    400,
  );
}

export function requireUuidParam(
  value: string | undefined,
  requestId: string,
  code: string,
  label: string,
  field: string,
) {
  if (value && isUuidString(value)) {
    return value;
  }
  return failure(code, `${label} must be a UUID.`, requestId, 400, {
    [field]: value ?? "",
  });
}

export function requireDecisionActorContext(
  ctx: RouteContext,
  code: string,
): DecisionActorContext | RouteResult {
  const actorUserId = ctx.user?.userId?.trim() ?? "";
  const actorRole = ctx.user?.role?.trim() ?? "";
  if (actorUserId.length === 0 || actorRole.length === 0) {
    return failure(
      code,
      "Authenticated admin actor context is required.",
      ctx.requestId,
      403,
    );
  }

  return {
    actorPermissions: ctx.user?.permissions ?? [],
    actorRole,
    actorUserId,
  };
}
