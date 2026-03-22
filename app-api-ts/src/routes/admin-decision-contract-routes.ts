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
        organizationId: ctx.params["orgId"] ?? "",
        actor: {
          userId: actorUserId,
          decidedAt: now,
          reason: extractDecisionContractSaveReason(data.contract),
        },
        request: data,
      })
    : service.createDraftFromTemplate({
        ...(function () {
          const createRequest: DecisionContractStudioCreateRequest = data;
          const scopeOverrides = normalizeDecisionScopeOverrides(
            createRequest.scopeOverrides,
          );
          return {
            organizationId: ctx.params["orgId"] ?? "",
            actor: {
              userId: actorUserId,
              decidedAt: now,
              reason: createRequest.reason,
              ...(createRequest.notes !== undefined
                ? { notes: createRequest.notes }
                : {}),
            },
            request: {
              templateId: createRequest.templateId,
              ...(createRequest.templateVersion !== undefined
                ? { templateVersion: createRequest.templateVersion }
                : {}),
              contractId: createRequest.contractId,
              ...(createRequest.pack !== undefined
                ? { pack: createRequest.pack }
                : {}),
              ...(createRequest.workspaceId !== undefined
                ? { workspaceId: createRequest.workspaceId }
                : {}),
              name: createRequest.name,
              ...(createRequest.description !== undefined
                ? { description: createRequest.description }
                : {}),
              reason: createRequest.reason,
              ...(createRequest.notes !== undefined
                ? { notes: createRequest.notes }
                : {}),
              ...(createRequest.tags !== undefined
                ? { tags: createRequest.tags }
                : {}),
              ...(scopeOverrides !== undefined ? { scopeOverrides } : {}),
            },
          };
        })(),
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
  const contractId = normalizeOptionalText(ctx.params["contractId"]) ?? "";
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
        ctx.params["contractVersion"],
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
        organizationId: ctx.params["orgId"] ?? "",
        ...(parsed.data.workspaceId !== undefined
          ? { workspaceId: parsed.data.workspaceId }
          : {}),
        ...(parsed.data.pack !== undefined ? { pack: parsed.data.pack } : {}),
        ...(parsed.data.statuses !== undefined
          ? { statuses: parsed.data.statuses }
          : {}),
        ...(parsed.data.search !== undefined
          ? { search: parsed.data.search }
          : {}),
        ...(parsed.data.includeArchived !== undefined
          ? { includeArchived: parsed.data.includeArchived }
          : {}),
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
        ctx.params["orgId"] ?? "",
        {
          contractId: contractSelection.contractId,
          contractVersion: contractSelection.contractVersion,
          ...(compareToRaw != null
            ? {
                compareToVersion: parsePositiveInteger(
                  compareToRaw,
                  "compareToVersion",
                ),
              }
            : {}),
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
    const normalizedScopeOverrides =
      "contract" in parsed || parsed.scopeOverrides === undefined
        ? undefined
        : normalizeDecisionScopeOverrides({
            ...(parsed.scopeOverrides.entityType !== undefined
              ? { entityType: parsed.scopeOverrides.entityType }
              : {}),
            ...(parsed.scopeOverrides.selector?.mode !== undefined
              ? {
                  selector: {
                    mode: parsed.scopeOverrides.selector.mode,
                    ...(parsed.scopeOverrides.selector.ids !== undefined
                      ? { ids: parsed.scopeOverrides.selector.ids }
                      : {}),
                    ...(parsed.scopeOverrides.selector.query !== undefined
                      ? { query: parsed.scopeOverrides.selector.query }
                      : {}),
                  },
                }
              : {}),
            ...(parsed.scopeOverrides.horizonId !== undefined
              ? { horizonId: parsed.scopeOverrides.horizonId }
              : {}),
            ...(parsed.scopeOverrides.dimensions !== undefined
              ? { dimensions: parsed.scopeOverrides.dimensions }
              : {}),
          });
    const normalizedDraft =
      "contract" in parsed
        ? parsed
        : {
            templateId: parsed.templateId,
            ...(parsed.templateVersion !== undefined
              ? { templateVersion: parsed.templateVersion }
              : {}),
            contractId: parsed.contractId,
            name: parsed.name,
            ...(parsed.description !== undefined
              ? { description: parsed.description }
              : {}),
            reason: parsed.reason,
            ...(parsed.notes !== undefined ? { notes: parsed.notes } : {}),
            ...(parsed.workspaceId !== undefined
              ? { workspaceId: parsed.workspaceId }
              : {}),
            ...(normalizedScopeOverrides !== undefined
              ? { scopeOverrides: normalizedScopeOverrides }
              : {}),
            ...(parsed.tags !== undefined ? { tags: parsed.tags } : {}),
          };
    const result = await persistDraftMutation(
      ctx,
      actorUserId,
      normalizedDraft,
    );
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
        organizationId: ctx.params["orgId"] ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
        request: {
          transition: parsed.data.transition,
          reason: parsed.data.reason,
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
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
        ctx.params["orgId"] ?? "",
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
        organizationId: ctx.params["orgId"] ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
        request: {
          name: parsed.data.name,
          reason: parsed.data.reason,
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
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
        organizationId: ctx.params["orgId"] ?? "",
        contractId: contractSelection.contractId,
        contractVersion: contractSelection.contractVersion,
        actor: {
          userId: actorUserId,
          decidedAt: new Date().toISOString(),
          reason: parsed.data.reason,
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
        request: {
          targetVersion: parsed.data.targetVersion,
          reason: parsed.data.reason,
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined
            ? { description: parsed.data.description }
            : {}),
          ...(parsed.data.notes !== undefined
            ? { notes: parsed.data.notes }
            : {}),
        },
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
