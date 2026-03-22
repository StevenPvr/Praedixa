import type { RouteContext, RouteDefinition, RouteResult } from "../types.js";
import { failure, success } from "../response.js";
import { route } from "../router.js";
import {
  getPersistentActionDispatchDetail,
  getPersistentLedgerDetail,
  listPersistentApprovalInbox,
} from "../services/decisionops-runtime.js";
import { decidePersistentApproval } from "../services/decisionops-runtime-approval.js";
import {
  decidePersistentActionDispatch,
  decidePersistentActionFallback,
} from "../services/decisionops-runtime-action.js";
import { decidePersistentLedger } from "../services/decisionops-runtime-ledger.js";
import {
  actionDispatchDecisionSchema,
  actionDispatchFallbackSchema,
  adminOrgRead,
  adminOrgWrite,
  adminUsersWriteRateLimit,
  approvalDecisionSchema,
  ledgerDecisionSchema,
  normalizeOptionalText,
  operationalFailureResponse,
  requireDecisionActorContext,
  requireUuidParam,
} from "./admin-decision-runtime-route-support.js";

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

function organizationIdFrom(ctx: RouteContext): string {
  return ctx.params["orgId"] ?? "";
}

function resolveDecisionMutationInput<T>(
  ctx: RouteContext,
  options: {
    paramValue: string | undefined;
    invalidParamCode: string;
    label: string;
    paramName: string;
    schema: {
      safeParse: (
        value: unknown,
      ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ message: string }> } };
    };
    invalidBodyCode: string;
    invalidBodyMessage: string;
    actorContextCode: string;
  },
) {
  const entityId = requireUuidParam(
    options.paramValue,
    ctx.requestId,
    options.invalidParamCode,
    options.label,
    options.paramName,
  );
  if (isRouteResult(entityId)) return entityId;

  const request = parseBody(
    ctx,
    options.schema,
    options.invalidBodyCode,
    options.invalidBodyMessage,
  );
  if (isRouteResult(request)) return request;

  const actor = requireDecisionActorContext(ctx, options.actorContextCode);
  if (isRouteResult(actor)) return actor;

  return { entityId, request, actor };
}

async function persistDecisionMutation<T>(
  ctx: RouteContext,
  options: {
    execute: (organizationId: string) => Promise<T>;
    successMessage: string;
    failureCode: string;
    failureMessage: string;
  },
) {
  try {
    return success(
      await options.execute(organizationIdFrom(ctx)),
      ctx.requestId,
      options.successMessage,
    );
  } catch (error) {
    return operationalFailureResponse(
      error,
      ctx.requestId,
      options.failureCode,
      options.failureMessage,
    );
  }
}

async function listApprovalInbox(ctx: RouteContext) {
  try {
    return success(
      await listPersistentApprovalInbox({
        organizationId: organizationIdFrom(ctx),
      }),
      ctx.requestId,
    );
  } catch (error) {
    return operationalFailureResponse(
      error,
      ctx.requestId,
      "APPROVAL_INBOX_FAILED",
      "Unable to load admin approval inbox",
    );
  }
}

async function decideApproval(ctx: RouteContext) {
  const input = resolveDecisionMutationInput(ctx, {
    paramValue: ctx.params["approvalId"],
    invalidParamCode: "INVALID_APPROVAL_ID",
    label: "Approval id",
    paramName: "approvalId",
    schema: approvalDecisionSchema,
    invalidBodyCode: "INVALID_APPROVAL_DECISION_BODY",
    invalidBodyMessage: "Approval decision body is invalid.",
    actorContextCode: "APPROVAL_ACTOR_CONTEXT_REQUIRED",
  });
  if (isRouteResult(input)) return input;

  return persistDecisionMutation(ctx, {
    execute: (organizationId) =>
      decidePersistentApproval({
        organizationId,
        approvalId: input.entityId,
        actorUserId: input.actor.actorUserId,
        actorRole: input.actor.actorRole,
        request: {
          outcome: input.request.outcome,
          reasonCode: input.request.reasonCode,
          ...(input.request.comment !== undefined
            ? { comment: input.request.comment }
            : {}),
          ...(input.request.decidedAt !== undefined
            ? { decidedAt: input.request.decidedAt }
            : {}),
        },
      }),
    successMessage: "Approval decision persisted",
    failureCode: "APPROVAL_DECISION_FAILED",
    failureMessage: "Unable to persist approval decision",
  });
}

async function getActionDispatchDetail(ctx: RouteContext) {
  const actionId = requireUuidParam(
    ctx.params["actionId"],
    ctx.requestId,
    "INVALID_ACTION_ID",
    "Action id",
    "actionId",
  );
  if (isRouteResult(actionId)) return actionId;

  try {
    return success(
      await getPersistentActionDispatchDetail({
        organizationId: organizationIdFrom(ctx),
        actionId,
      }),
      ctx.requestId,
    );
  } catch (error) {
    return operationalFailureResponse(
      error,
      ctx.requestId,
      "ACTION_DISPATCH_DETAIL_FAILED",
      "Unable to load admin action dispatch detail",
    );
  }
}

async function decideActionDispatch(ctx: RouteContext) {
  const input = resolveDecisionMutationInput(ctx, {
    paramValue: ctx.params["actionId"],
    invalidParamCode: "INVALID_ACTION_ID",
    label: "Action id",
    paramName: "actionId",
    schema: actionDispatchDecisionSchema,
    invalidBodyCode: "INVALID_ACTION_DISPATCH_DECISION_BODY",
    invalidBodyMessage: "Action dispatch decision body is invalid.",
    actorContextCode: "ACTION_DISPATCH_ACTOR_CONTEXT_REQUIRED",
  });
  if (isRouteResult(input)) return input;

  return persistDecisionMutation(ctx, {
    execute: (organizationId) =>
      decidePersistentActionDispatch({
        organizationId,
        actionId: input.entityId,
        actorUserId: input.actor.actorUserId,
        actorRole: input.actor.actorRole,
        actorPermissions: input.actor.actorPermissions,
        request: {
          outcome: input.request.outcome,
          reasonCode: input.request.reasonCode,
          ...(input.request.comment !== undefined
            ? { comment: input.request.comment }
            : {}),
          ...(input.request.errorCode !== undefined
            ? { errorCode: input.request.errorCode }
            : {}),
          ...(input.request.errorMessage !== undefined
            ? { errorMessage: input.request.errorMessage }
            : {}),
          ...(input.request.occurredAt !== undefined
            ? { occurredAt: input.request.occurredAt }
            : {}),
          ...(input.request.latencyMs !== undefined
            ? { latencyMs: input.request.latencyMs }
            : {}),
          ...(input.request.targetReference !== undefined
            ? { targetReference: input.request.targetReference }
            : {}),
        },
      }),
    successMessage: "Action dispatch decision persisted",
    failureCode: "ACTION_DISPATCH_DECISION_FAILED",
    failureMessage: "Unable to persist action dispatch decision",
  });
}

async function decideActionFallback(ctx: RouteContext) {
  const input = resolveDecisionMutationInput(ctx, {
    paramValue: ctx.params["actionId"],
    invalidParamCode: "INVALID_ACTION_ID",
    label: "Action id",
    paramName: "actionId",
    schema: actionDispatchFallbackSchema,
    invalidBodyCode: "INVALID_ACTION_DISPATCH_FALLBACK_BODY",
    invalidBodyMessage: "Action dispatch fallback body is invalid.",
    actorContextCode: "ACTION_DISPATCH_ACTOR_CONTEXT_REQUIRED",
  });
  if (isRouteResult(input)) return input;

  return persistDecisionMutation(ctx, {
    execute: (organizationId) =>
      decidePersistentActionFallback({
        organizationId,
        actionId: input.entityId,
        actorUserId: input.actor.actorUserId,
        actorRole: input.actor.actorRole,
        actorPermissions: input.actor.actorPermissions,
        request:
          input.request.operation === "prepare"
            ? {
                operation: "prepare",
                channel: input.request.channel,
                reasonCode: input.request.reasonCode,
                ...(input.request.reference !== undefined
                  ? { reference: input.request.reference }
                  : {}),
                ...(input.request.occurredAt !== undefined
                  ? { occurredAt: input.request.occurredAt }
                  : {}),
                ...(input.request.comment !== undefined
                  ? { comment: input.request.comment }
                  : {}),
              }
            : {
                operation: "execute",
                reasonCode: input.request.reasonCode,
                ...(input.request.occurredAt !== undefined
                  ? { occurredAt: input.request.occurredAt }
                  : {}),
                ...(input.request.comment !== undefined
                  ? { comment: input.request.comment }
                  : {}),
              },
      }),
    successMessage: "Action dispatch fallback persisted",
    failureCode: "ACTION_DISPATCH_FALLBACK_FAILED",
    failureMessage: "Unable to persist action dispatch fallback",
  });
}

async function getLedgerDetail(ctx: RouteContext) {
  const ledgerId = requireUuidParam(
    ctx.params["ledgerId"],
    ctx.requestId,
    "INVALID_LEDGER_ID",
    "Ledger id",
    "ledgerId",
  );
  if (isRouteResult(ledgerId)) return ledgerId;

  const revision = normalizeOptionalText(ctx.query.get("revision"));
  if (revision != null && !/^[1-9]\d*$/.test(revision)) {
    return operationalFailureResponse(
      new Error("Ledger revision must be a positive integer."),
      ctx.requestId,
      "INVALID_LEDGER_REVISION",
      "Ledger revision must be a positive integer.",
    );
  }

  try {
    return success(
      await getPersistentLedgerDetail({
        organizationId: organizationIdFrom(ctx),
        request: {
          ledgerId,
          ...(revision != null
            ? { revision: Number.parseInt(revision, 10) }
            : {}),
        },
      }),
      ctx.requestId,
    );
  } catch (error) {
    return operationalFailureResponse(
      error,
      ctx.requestId,
      "LEDGER_DETAIL_FAILED",
      "Unable to load admin ledger detail",
    );
  }
}

async function decideLedger(ctx: RouteContext) {
  const input = resolveDecisionMutationInput(ctx, {
    paramValue: ctx.params["ledgerId"],
    invalidParamCode: "INVALID_LEDGER_ID",
    label: "Ledger id",
    paramName: "ledgerId",
    schema: ledgerDecisionSchema,
    invalidBodyCode: "INVALID_LEDGER_DECISION_BODY",
    invalidBodyMessage: "Ledger decision body is invalid.",
    actorContextCode: "LEDGER_ACTOR_CONTEXT_REQUIRED",
  });
  if (isRouteResult(input)) return input;

  return persistDecisionMutation(ctx, {
    execute: (organizationId) =>
      decidePersistentLedger({
        organizationId,
        ledgerId: input.entityId,
        actorUserId: input.actor.actorUserId,
        actorRole: input.actor.actorRole,
        request:
          input.request.operation === "validate"
            ? {
                operation: "validate",
                reasonCode: input.request.reasonCode,
                validationStatus: input.request.validationStatus,
                ...(input.request.comment !== undefined
                  ? { comment: input.request.comment }
                  : {}),
                ...(input.request.occurredAt !== undefined
                  ? { occurredAt: input.request.occurredAt }
                  : {}),
              }
            : {
                operation: input.request.operation,
                reasonCode: input.request.reasonCode,
                ...(input.request.comment !== undefined
                  ? { comment: input.request.comment }
                  : {}),
                ...(input.request.occurredAt !== undefined
                  ? { occurredAt: input.request.occurredAt }
                  : {}),
                actual: {
                  ...(input.request.actual.recordedAt !== undefined
                    ? { recordedAt: input.request.actual.recordedAt }
                    : {}),
                  values: input.request.actual.values,
                },
                roi: {
                  ...(input.request.roi.currency !== undefined
                    ? { currency: input.request.roi.currency }
                    : {}),
                  validationStatus: input.request.roi.validationStatus,
                  components: input.request.roi.components,
                },
              },
      }),
    successMessage: "Ledger decision persisted",
    failureCode: "LEDGER_DECISION_FAILED",
    failureMessage: "Unable to persist ledger decision",
  });
}

export const ADMIN_DECISION_RUNTIME_ROUTES: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/approval-inbox",
    listApprovalInbox,
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/approvals/:approvalId/decision",
    decideApproval,
    { ...adminOrgWrite, rateLimit: adminUsersWriteRateLimit },
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId",
    getActionDispatchDetail,
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/decision",
    decideActionDispatch,
    { ...adminOrgWrite, rateLimit: adminUsersWriteRateLimit },
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/action-dispatches/:actionId/fallback",
    decideActionFallback,
    { ...adminOrgWrite, rateLimit: adminUsersWriteRateLimit },
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId",
    getLedgerDetail,
    adminOrgRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/ledgers/:ledgerId/decision",
    decideLedger,
    { ...adminOrgWrite, rateLimit: adminUsersWriteRateLimit },
  ),
];
