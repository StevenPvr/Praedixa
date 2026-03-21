import { z } from "zod";
import type {
  CompleteOnboardingCaseTaskRequest,
  CreateAdminOnboardingCaseRequest,
  CreateOnboardingCaseRequest,
  OnboardingCaseLifecycleRequest,
  SaveOnboardingCaseTaskRequest,
} from "@praedixa/shared-types/api";

import { failure, paginated, success } from "../response.js";
import { route } from "../router.js";
import {
  cancelOnboardingCase,
  completeOnboardingTask,
  createOnboardingCase,
  getOnboardingCase,
  getOnboardingCaseBundle,
  listOnboardingCases,
  listOrganizationOnboardingCases,
  recomputeOnboardingReadiness,
  reopenOnboardingCase,
  saveOnboardingTaskDraft,
} from "../services/admin-onboarding.js";
import { PersistenceError, isUuidString } from "../services/persistence.js";
import type { RouteContext, RouteDefinition, RouteResult } from "../types.js";

const adminAllowedRoles = ["super_admin"] as const;
const adminOnboardingRead = {
  allowedRoles: adminAllowedRoles,
  requiredPermissions: ["admin:onboarding:read"] as const,
};
const adminOnboardingWrite = {
  allowedRoles: adminAllowedRoles,
  requiredPermissions: ["admin:onboarding:write"] as const,
};

const sourceModeSchema = z.enum(["api", "file", "sftp"]);
const activationModeSchema = z.enum(["shadow", "limited", "full"]);
const environmentTargetSchema = z.enum(["sandbox", "production"]);
const onboardingMetadataSchema = z.record(z.string(), z.unknown());

const createOnboardingCaseSchema = z.object({
  ownerUserId: z.string().uuid().nullable().optional(),
  sponsorUserId: z.string().uuid().nullable().optional(),
  activationMode: activationModeSchema,
  environmentTarget: environmentTargetSchema,
  dataResidencyRegion: z.string().trim().min(1).max(32),
  subscriptionModules: z.array(z.string().trim().min(1).max(80)).min(1),
  selectedPacks: z.array(z.string().trim().min(1).max(80)).min(1),
  sourceModes: z.array(sourceModeSchema).min(1),
  targetGoLiveAt: z.string().datetime().nullable().optional(),
  metadataJson: onboardingMetadataSchema.optional(),
});

const createAdminOnboardingCaseSchema = createOnboardingCaseSchema.extend({
  organizationId: z.string().uuid(),
});
const completeOnboardingTaskSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
  payloadJson: onboardingMetadataSchema.optional(),
});
const saveOnboardingTaskSchema = z.object({
  note: z.string().trim().max(500).nullable().optional(),
  payloadJson: onboardingMetadataSchema.optional(),
});
const onboardingCaseLifecycleSchema = z.object({
  reason: z.string().trim().max(500).nullable().optional(),
});

function isRouteResult(value: unknown): value is RouteResult {
  return (
    typeof value === "object" &&
    value != null &&
    "statusCode" in value &&
    "payload" in value
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  minimum = 1,
  maximum = 100,
): number {
  if (value == null) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

function pageQuery(ctx: RouteContext): { page: number; pageSize: number } {
  return {
    page: parsePositiveInteger(ctx.query.get("page"), 1, 1, 10_000),
    pageSize: parsePositiveInteger(ctx.query.get("page_size"), 20),
  };
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireActorUserId(ctx: RouteContext): string | RouteResult {
  const actorUserId = normalizeOptionalText(ctx.user?.userId);
  if (actorUserId) {
    return actorUserId;
  }

  return failure(
    "ACTOR_CONTEXT_REQUIRED",
    "Authenticated admin actor context is required.",
    ctx.requestId,
    403,
  );
}

function requireOrganizationId(ctx: RouteContext): string | RouteResult {
  const organizationId = normalizeOptionalText(ctx.params.orgId);
  if (organizationId && isUuidString(organizationId)) {
    return organizationId;
  }

  return failure(
    "INVALID_ORGANIZATION_ID",
    "organizationId must be a UUID.",
    ctx.requestId,
    400,
  );
}

function requireCaseId(ctx: RouteContext): string | RouteResult {
  const caseId = normalizeOptionalText(ctx.params.caseId);
  if (caseId && isUuidString(caseId)) {
    return caseId;
  }

  return failure(
    "INVALID_CASE_ID",
    "caseId must be a UUID.",
    ctx.requestId,
    400,
  );
}

function requireTaskId(ctx: RouteContext): string | RouteResult {
  const taskId = normalizeOptionalText(ctx.params.taskId);
  if (taskId && isUuidString(taskId)) {
    return taskId;
  }

  return failure(
    "INVALID_TASK_ID",
    "taskId must be a UUID.",
    ctx.requestId,
    400,
  );
}

function onboardingFailureResponse(
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

  return failure(fallbackCode, fallbackMessage, requestId, 400);
}

function parseBody<T>(
  ctx: RouteContext,
  schema: {
    safeParse: (
      value: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: Array<{ message: string }> } };
  },
  code: string,
  fallbackMessage: string,
): T | RouteResult {
  const parsed = schema.safeParse(ctx.body);
  if (parsed.success) {
    return parsed.data;
  }

  return failure(
    code,
    parsed.error.issues[0]?.message ?? fallbackMessage,
    ctx.requestId,
    400,
  );
}

async function requireScopedCase(ctx: RouteContext): Promise<
  | {
      organizationId: string;
      caseId: string;
    }
  | RouteResult
> {
  const organizationId = requireOrganizationId(ctx);
  if (isRouteResult(organizationId)) {
    return organizationId;
  }

  const caseId = requireCaseId(ctx);
  if (isRouteResult(caseId)) {
    return caseId;
  }

  try {
    const caseDetail = await getOnboardingCase(caseId);
    if (caseDetail.organizationId !== organizationId) {
      return failure(
        "NOT_FOUND",
        "Onboarding case not found.",
        ctx.requestId,
        404,
      );
    }

    return { organizationId, caseId };
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_DETAIL_FAILED",
      "Unable to load onboarding case.",
    );
  }
}

async function listGlobalOnboardingCases(ctx: RouteContext) {
  try {
    const { page, pageSize } = pageQuery(ctx);
    const result = await listOnboardingCases({
      organizationId:
        normalizeOptionalText(ctx.query.get("organization_id")) ??
        normalizeOptionalText(ctx.query.get("org_id")),
      status: normalizeOptionalText(ctx.query.get("status")),
      page,
      pageSize,
    });

    return paginated(
      [...result.items],
      page,
      pageSize,
      result.total,
      ctx.requestId,
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ADMIN_ONBOARDING_LIST_FAILED",
      "Unable to load onboarding cases.",
    );
  }
}

async function createGlobalOnboardingCase(ctx: RouteContext) {
  const parsed = parseBody<CreateAdminOnboardingCaseRequest>(
    ctx,
    createAdminOnboardingCaseSchema,
    "INVALID_ONBOARDING_CASE_BODY",
    "Onboarding case body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    const { organizationId, ...request } = parsed;
    return success(
      await createOnboardingCase({
        organizationId,
        actorUserId,
        request,
      }),
      ctx.requestId,
      "Onboarding case created",
      201,
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_CREATE_FAILED",
      "Unable to create onboarding case.",
    );
  }
}

async function listOrganizationCases(ctx: RouteContext) {
  const organizationId = requireOrganizationId(ctx);
  if (isRouteResult(organizationId)) {
    return organizationId;
  }

  try {
    const { page, pageSize } = pageQuery(ctx);
    const result = await listOrganizationOnboardingCases({
      organizationId,
      page,
      pageSize,
    });

    return paginated(
      [...result.items],
      page,
      pageSize,
      result.total,
      ctx.requestId,
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ORG_ONBOARDING_CASES_FAILED",
      "Unable to load organization onboarding cases.",
    );
  }
}

async function createOrganizationCase(ctx: RouteContext) {
  const organizationId = requireOrganizationId(ctx);
  if (isRouteResult(organizationId)) {
    return organizationId;
  }

  const parsed = parseBody<CreateOnboardingCaseRequest>(
    ctx,
    createOnboardingCaseSchema,
    "INVALID_ONBOARDING_CASE_BODY",
    "Onboarding case body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    return success(
      await createOnboardingCase({
        organizationId,
        actorUserId,
        request: parsed,
      }),
      ctx.requestId,
      "Onboarding case created",
      201,
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_CREATE_FAILED",
      "Unable to create onboarding case.",
    );
  }
}

async function getOrganizationCaseDetail(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  try {
    return success(await getOnboardingCaseBundle(scoped.caseId), ctx.requestId);
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_DETAIL_FAILED",
      "Unable to load onboarding case detail.",
    );
  }
}

async function completeOrganizationCaseTask(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  const taskId = requireTaskId(ctx);
  if (isRouteResult(taskId)) {
    return taskId;
  }

  const parsed = parseBody<CompleteOnboardingCaseTaskRequest>(
    ctx,
    completeOnboardingTaskSchema,
    "INVALID_ONBOARDING_TASK_BODY",
    "Onboarding task body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    return success(
      await completeOnboardingTask({
        organizationId: scoped.organizationId,
        caseId: scoped.caseId,
        taskId,
        actorUserId,
        note: parsed.note ?? null,
        payloadJson: parsed.payloadJson ?? {},
      }),
      ctx.requestId,
      "Onboarding task completed",
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_TASK_COMPLETE_FAILED",
      "Unable to complete onboarding task.",
    );
  }
}

async function saveOrganizationCaseTask(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  const taskId = requireTaskId(ctx);
  if (isRouteResult(taskId)) {
    return taskId;
  }

  const parsed = parseBody<SaveOnboardingCaseTaskRequest>(
    ctx,
    saveOnboardingTaskSchema,
    "INVALID_ONBOARDING_TASK_BODY",
    "Onboarding task body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    return success(
      await saveOnboardingTaskDraft({
        organizationId: scoped.organizationId,
        caseId: scoped.caseId,
        taskId,
        actorUserId,
        note: parsed.note ?? null,
        payloadJson: parsed.payloadJson ?? {},
      }),
      ctx.requestId,
      "Onboarding task draft saved",
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_TASK_SAVE_FAILED",
      "Unable to save onboarding task draft.",
    );
  }
}

async function recomputeOrganizationCaseReadiness(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  try {
    return success(
      await recomputeOnboardingReadiness({
        organizationId: scoped.organizationId,
        caseId: scoped.caseId,
      }),
      ctx.requestId,
      "Onboarding readiness recomputed",
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_READINESS_RECOMPUTE_FAILED",
      "Unable to recompute onboarding readiness.",
    );
  }
}

async function cancelOrganizationCase(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  const parsed = parseBody<OnboardingCaseLifecycleRequest>(
    ctx,
    onboardingCaseLifecycleSchema,
    "INVALID_ONBOARDING_CASE_BODY",
    "Onboarding case body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    return success(
      await cancelOnboardingCase({
        organizationId: scoped.organizationId,
        caseId: scoped.caseId,
        actorUserId,
        reason: parsed.reason ?? null,
      }),
      ctx.requestId,
      "Onboarding case cancelled",
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_CANCEL_FAILED",
      "Unable to cancel onboarding case.",
    );
  }
}

async function reopenOrganizationCase(ctx: RouteContext) {
  const scoped = await requireScopedCase(ctx);
  if (isRouteResult(scoped)) {
    return scoped;
  }

  const parsed = parseBody<OnboardingCaseLifecycleRequest>(
    ctx,
    onboardingCaseLifecycleSchema,
    "INVALID_ONBOARDING_CASE_BODY",
    "Onboarding case body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    return success(
      await reopenOnboardingCase({
        organizationId: scoped.organizationId,
        caseId: scoped.caseId,
        actorUserId,
        reason: parsed.reason ?? null,
      }),
      ctx.requestId,
      "Onboarding case reopened",
      201,
    );
  } catch (error) {
    return onboardingFailureResponse(
      error,
      ctx.requestId,
      "ONBOARDING_CASE_REOPEN_FAILED",
      "Unable to reopen onboarding case.",
    );
  }
}

export const ADMIN_ONBOARDING_ROUTES: readonly RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/admin/onboarding",
    listGlobalOnboardingCases,
    adminOnboardingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/onboarding",
    createGlobalOnboardingCase,
    adminOnboardingWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/onboarding/cases",
    listOrganizationCases,
    adminOnboardingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases",
    createOrganizationCase,
    adminOnboardingWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId",
    getOrganizationCaseDetail,
    adminOnboardingRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/readiness/recompute",
    recomputeOrganizationCaseReadiness,
    adminOnboardingWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/cancel",
    cancelOrganizationCase,
    adminOnboardingWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/reopen",
    reopenOrganizationCase,
    adminOnboardingWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/save",
    saveOrganizationCaseTask,
    adminOnboardingWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/onboarding/cases/:caseId/tasks/:taskId/complete",
    completeOrganizationCaseTask,
    adminOnboardingWrite,
  ),
];
