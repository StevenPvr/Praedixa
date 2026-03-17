import type { RouteContext, RouteDefinition, RouteResult } from "../types.js";
import type {
  DecisionContractStudioCreateRequest,
  DecisionContractStudioSaveRequest,
} from "@praedixa/shared-types/api";
import { failure, success } from "../response.js";
import { route } from "../router.js";
import { getDecisionContractRuntimeService } from "../services/decision-contract-runtime.js";
import {
  adminOrgRead,
  adminOrgWrite,
  decisionContractRuntimeFailure,
  decisionContractStudioForkSchema,
  decisionContractStudioListQuerySchema,
  decisionContractStudioRollbackSchema,
  decisionContractStudioSaveMutationSchema,
  decisionContractStudioTransitionSchema,
  extractDecisionContractSaveReason,
  normalizeDecisionScopeOverrides,
  normalizeOptionalText,
  parsePositiveInteger,
} from "./admin-decision-contract-route-support.js";

function isRouteResult(value: unknown): value is RouteResult {
  return (
    typeof value === "object" &&
    value != null &&
    "statusCode" in value &&
    "payload" in value
  );
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

async function persistDraftMutation(
  ctx: RouteContext,
  actorUserId: string,
  data: DecisionContractStudioSaveRequest | DecisionContractStudioCreateRequest,
) {
  const now = new Date().toISOString();
  const service = getDecisionContractRuntimeService();
  return "contract" in data
    ? service.saveDraft({
        organizationId: ctx.params.orgId ?? "",
        actor: {
          userId: actorUserId,
          decidedAt: now,
          reason: extractDecisionContractSaveReason(data.contract),
        },
        request: data,
      })
    : service.createDraftFromTemplate({
        organizationId: ctx.params.orgId ?? "",
        workspaceId: data.workspaceId,
        actor: {
          userId: actorUserId,
          decidedAt: now,
          reason: data.reason,
          notes: data.notes,
        },
        request: {
          ...data,
          scopeOverrides: normalizeDecisionScopeOverrides(data.scopeOverrides),
        },
      });
}

function requireActorUserId(ctx: RouteContext): string | RouteResult {
  const actorUserId = ctx.user?.userId?.trim() ?? "";
  return actorUserId.length > 0
    ? actorUserId
    : failure(
        "DECISION_CONTRACT_ACTOR_CONTEXT_REQUIRED",
        "Authenticated admin actor context is required.",
        ctx.requestId,
        403,
      );
}

function requireContractId(ctx: RouteContext): string | RouteResult {
  const contractId = normalizeOptionalText(ctx.params.contractId) ?? "";
  return contractId.length > 0
    ? contractId
    : failure(
        "DECISION_CONTRACT_ID_REQUIRED",
        "DecisionContract id is required.",
        ctx.requestId,
        400,
      );
}

function parseContractSelection(
  ctx: RouteContext,
): { contractId: string; contractVersion: number } | RouteResult {
  const contractId = requireContractId(ctx);
  if (isRouteResult(contractId)) {
    return contractId;
  }

  try {
    return {
      contractId,
      contractVersion: parsePositiveInteger(
        ctx.params.contractVersion,
        "contractVersion",
      ),
    };
  } catch (error) {
    return failure(
      "INVALID_DECISION_CONTRACT_VERSION",
      error instanceof Error
        ? error.message
        : "contractVersion must be a positive integer",
      ctx.requestId,
      400,
    );
  }
}

function parseListQuery(ctx: RouteContext) {
  const statuses = [
    ...ctx.query.getAll("status"),
    ...(ctx.query.get("statuses")?.split(",") ?? []),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return decisionContractStudioListQuerySchema.safeParse({
    workspaceId:
      normalizeOptionalText(ctx.query.get("workspaceId")) ??
      normalizeOptionalText(ctx.query.get("workspace_id")) ??
      undefined,
    pack: normalizeOptionalText(ctx.query.get("pack")) ?? undefined,
    statuses: statuses.length > 0 ? statuses : undefined,
    search: normalizeOptionalText(ctx.query.get("search")) ?? undefined,
    includeArchived:
      ctx.query.get("includeArchived") == null &&
      ctx.query.get("include_archived") == null
        ? undefined
        : (ctx.query.get("includeArchived") ??
            ctx.query.get("include_archived")) === "true",
  });
}

async function listDecisionContracts(ctx: RouteContext) {
  const parsed = parseListQuery(ctx);
  if (!parsed.success) {
    return failure(
      "INVALID_DECISION_CONTRACT_STUDIO_QUERY",
      parsed.error.issues[0]?.message ??
        "DecisionContract studio query is invalid.",
      ctx.requestId,
      400,
    );
  }

  try {
    return success(
      await getDecisionContractRuntimeService().listContracts({
        organizationId: ctx.params.orgId ?? "",
        ...parsed.data,
      }),
      ctx.requestId,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_LIST_FAILED",
      "Unable to load DecisionContracts.",
    );
  }
}

async function getDecisionContractDetail(ctx: RouteContext) {
  const contractSelection = parseContractSelection(ctx);
  if (isRouteResult(contractSelection)) {
    return contractSelection;
  }

  try {
    const compareToRaw =
      ctx.query.get("compareToVersion") ?? ctx.query.get("compare_to_version");
    return success(
      await getDecisionContractRuntimeService().getContractDetail(
        ctx.params.orgId ?? "",
        {
          contractId: contractSelection.contractId,
          contractVersion: contractSelection.contractVersion,
          compareToVersion:
            compareToRaw == null
              ? undefined
              : parsePositiveInteger(compareToRaw, "compareToVersion"),
        },
      ),
      ctx.requestId,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_DETAIL_FAILED",
      "Unable to load DecisionContract detail.",
    );
  }
}

async function saveDecisionContractDraft(ctx: RouteContext) {
  const parsed = parseBody(
    ctx,
    decisionContractStudioSaveMutationSchema,
    "INVALID_DECISION_CONTRACT_MUTATION_BODY",
    "DecisionContract mutation body is invalid.",
  );
  if (isRouteResult(parsed)) {
    return parsed;
  }

  const actorUserId = requireActorUserId(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }

  try {
    const result = await persistDraftMutation(ctx, actorUserId, parsed);
    return success(result, ctx.requestId, "DecisionContract draft saved", 201);
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_SAVE_FAILED",
      "Unable to save DecisionContract draft.",
    );
  }
}

async function transitionDecisionContract(ctx: RouteContext) {
  const parsed = decisionContractStudioTransitionSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return failure(
      "INVALID_DECISION_CONTRACT_TRANSITION_BODY",
      parsed.error.issues[0]?.message ??
        "DecisionContract transition body is invalid.",
      ctx.requestId,
      400,
    );
  }

  const actorUserId = requireActorUserId(ctx);
  const contractSelection = parseContractSelection(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }
  if (isRouteResult(contractSelection)) {
    return contractSelection;
  }

  try {
    return success(
      await getDecisionContractRuntimeService().transitionContract({
        organizationId: ctx.params.orgId ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          notes: parsed.data.notes,
        },
        request: parsed.data,
      }),
      ctx.requestId,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_TRANSITION_FAILED",
      "Unable to transition DecisionContract.",
    );
  }
}

async function listRollbackCandidates(ctx: RouteContext) {
  const contractSelection = parseContractSelection(ctx);
  if (isRouteResult(contractSelection)) {
    return contractSelection;
  }

  try {
    return success(
      await getDecisionContractRuntimeService().listRollbackCandidates(
        ctx.params.orgId ?? "",
        contractSelection.contractId,
        contractSelection.contractVersion,
      ),
      ctx.requestId,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_ROLLBACK_CANDIDATES_FAILED",
      "Unable to load DecisionContract rollback candidates.",
    );
  }
}

async function forkDecisionContract(ctx: RouteContext) {
  const parsed = decisionContractStudioForkSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return failure(
      "INVALID_DECISION_CONTRACT_FORK_BODY",
      parsed.error.issues[0]?.message ??
        "DecisionContract fork body is invalid.",
      ctx.requestId,
      400,
    );
  }

  const actorUserId = requireActorUserId(ctx);
  const contractSelection = parseContractSelection(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }
  if (isRouteResult(contractSelection)) {
    return contractSelection;
  }

  try {
    return success(
      await getDecisionContractRuntimeService().forkDraft({
        organizationId: ctx.params.orgId ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          notes: parsed.data.notes,
        },
        request: parsed.data,
      }),
      ctx.requestId,
      "DecisionContract fork created",
      201,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_FORK_FAILED",
      "Unable to fork DecisionContract.",
    );
  }
}

async function rollbackDecisionContract(ctx: RouteContext) {
  const parsed = decisionContractStudioRollbackSchema.safeParse(ctx.body);
  if (!parsed.success) {
    return failure(
      "INVALID_DECISION_CONTRACT_ROLLBACK_BODY",
      parsed.error.issues[0]?.message ??
        "DecisionContract rollback body is invalid.",
      ctx.requestId,
      400,
    );
  }

  const actorUserId = requireActorUserId(ctx);
  const contractSelection = parseContractSelection(ctx);
  if (isRouteResult(actorUserId)) {
    return actorUserId;
  }
  if (isRouteResult(contractSelection)) {
    return contractSelection;
  }

  try {
    return success(
      await getDecisionContractRuntimeService().rollbackDraft({
        organizationId: ctx.params.orgId ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          notes: parsed.data.notes,
        },
        request: parsed.data,
      }),
      ctx.requestId,
      "DecisionContract rollback draft created",
      201,
    );
  } catch (error) {
    return decisionContractRuntimeFailure(
      error,
      ctx.requestId,
      "DECISION_CONTRACT_ROLLBACK_FAILED",
      "Unable to rollback DecisionContract.",
    );
  }
}

export const ADMIN_DECISION_CONTRACT_ROUTES: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/decision-contracts",
    listDecisionContracts,
    adminOrgRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion",
    getDecisionContractDetail,
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-contracts",
    saveDecisionContractDraft,
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/transition",
    transitionDecisionContract,
    adminOrgWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback-candidates",
    listRollbackCandidates,
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/fork",
    forkDecisionContract,
    adminOrgWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/decision-contracts/:contractId/versions/:contractVersion/rollback",
    rollbackDecisionContract,
    adminOrgWrite,
  ),
];
