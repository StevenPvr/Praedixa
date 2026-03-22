import { z } from "zod";

import { CONNECTOR_CATALOG } from "./catalog.js";
import { failure, success } from "./response.js";
import { route } from "./router.js";
import {
  createDefaultConnectorService,
  IngestAuthenticationError,
} from "./service.js";
import { redactSensitive } from "./security.js";
import type {
  AuthorizationCompleteInput,
  AuthorizationStartInput,
  ConnectorAuthMode,
  ConnectorVendor,
  CreateConnectionInput,
  IngestAuthContext,
  IngestEventsInput,
  IssueIngestCredentialInput,
  RouteContext,
  RouteDefinition,
  SyncTriggerType,
  TriggerSyncInput,
  UpdateConnectionInput,
} from "./types.js";

const servicePromise = createDefaultConnectorService();
async function getService() {
  return await servicePromise;
}

const vendors = CONNECTOR_CATALOG.map((entry) => entry.vendor);
const authModes = Array.from(
  new Set(CONNECTOR_CATALOG.flatMap((entry) => entry.authModes)),
);
const runtimeEnvironments = ["production", "sandbox"] as const;
const syncTriggers: SyncTriggerType[] = [
  "manual",
  "schedule",
  "backfill",
  "replay",
  "webhook",
];
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{7,127}$/;

const createConnectionSchema = z.object({
  vendor: z.enum(vendors as [ConnectorVendor, ...ConnectorVendor[]]),
  displayName: z.string().min(3).max(120),
  runtimeEnvironment: z.enum(runtimeEnvironments).optional(),
  authMode: z.enum(authModes as [ConnectorAuthMode, ...ConnectorAuthMode[]]),
  config: z.record(z.unknown()).optional(),
  secretRef: z.string().min(8).max(256).optional().nullable(),
  credentials: z.record(z.unknown()).optional().nullable(),
  sourceObjects: z.array(z.string().min(1).max(120)).max(32).optional(),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  webhookEnabled: z.boolean().optional(),
  baseUrl: z.string().url().max(2048).optional().nullable(),
  externalAccountId: z.string().min(1).max(255).optional().nullable(),
  oauthScopes: z
    .array(z.string().min(1).max(120))
    .max(20)
    .optional()
    .nullable(),
});

const updateConnectionSchema = z.object({
  displayName: z.string().min(3).max(120).optional(),
  runtimeEnvironment: z.enum(runtimeEnvironments).optional(),
  config: z.record(z.unknown()).optional(),
  sourceObjects: z.array(z.string().min(1).max(120)).max(32).optional(),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  webhookEnabled: z.boolean().optional(),
  baseUrl: z.string().url().max(2048).optional().nullable(),
  externalAccountId: z.string().min(1).max(255).optional().nullable(),
  oauthScopes: z
    .array(z.string().min(1).max(120))
    .max(20)
    .optional()
    .nullable(),
  status: z.enum(["pending", "active", "disabled"]).optional(),
  disabledReason: z.string().min(3).max(400).optional().nullable(),
});

const authorizationStartSchema = z.object({
  redirectUri: z.string().url().max(2048),
  authorizationEndpoint: z.string().url().max(2048).optional().nullable(),
  tokenEndpoint: z.string().url().max(2048).optional().nullable(),
  scopes: z.array(z.string().min(1).max(120)).max(20).optional(),
  clientCredentials: z.record(z.unknown()).optional().nullable(),
});

const authorizationCompleteSchema = z.object({
  state: z.string().min(16).max(255).optional().nullable(),
  code: z.string().min(3).max(4096).optional().nullable(),
  credentials: z.record(z.unknown()).optional().nullable(),
});

const triggerSyncSchema = z.object({
  triggerType: z
    .enum(syncTriggers as [SyncTriggerType, ...SyncTriggerType[]])
    .optional()
    .default("manual"),
  forceFullSync: z.boolean().optional().default(false),
  sourceWindowStart: z.string().datetime().optional().nullable(),
  sourceWindowEnd: z.string().datetime().optional().nullable(),
});

const claimSyncRunsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(25),
  leaseSeconds: z.number().int().min(30).max(900).optional().default(120),
});

const syncRunExecutionPlanSchema = z.object({
  lockToken: z.string().min(16).max(255),
});

const completeSyncRunSchema = z.object({
  lockToken: z.string().min(16).max(255),
  recordsFetched: z.number().int().min(0).max(1_000_000),
  recordsWritten: z.number().int().min(0).max(1_000_000),
});

const failSyncRunSchema = z.object({
  lockToken: z.string().min(16).max(255),
  errorMessage: z.string().min(3).max(400),
  errorClass: z.string().min(1).max(80).optional().nullable(),
  retryable: z.boolean().optional().default(false),
  retryDelaySeconds: z.number().int().min(5).max(3600).optional().nullable(),
});

const syncStateUpdateSchema = z.object({
  lockToken: z.string().min(16).max(255),
  sourceObject: z.string().min(1).max(120),
  watermarkText: z.string().min(1).max(255).optional().nullable(),
  watermarkAt: z.string().datetime().optional().nullable(),
  cursorJson: z.record(z.unknown()).optional().nullable(),
});

const issueIngestCredentialSchema = z.object({
  label: z.string().min(3).max(120),
  expiresAt: z.string().datetime().optional().nullable(),
  allowedSourceObjects: z
    .array(z.string().min(1).max(120))
    .max(32)
    .optional()
    .nullable(),
  allowedIpAddresses: z
    .array(z.string().min(3).max(120))
    .max(32)
    .optional()
    .nullable(),
  requireSignature: z.boolean().optional().default(true),
});

const ingestEventSchema = z.object({
  eventId: z.string().min(1).max(255).optional().nullable(),
  sourceObject: z.string().min(1).max(120),
  sourceRecordId: z.string().min(1).max(255),
  sourceUpdatedAt: z.string().datetime().optional().nullable(),
  contentType: z.string().min(1).max(120).optional().nullable(),
  payload: z.record(z.unknown()),
});

const ingestEventsSchema = z.object({
  schemaVersion: z.string().min(1).max(64),
  sentAt: z.string().datetime().optional().nullable(),
  events: z.array(ingestEventSchema).min(1).max(500),
});

const providerEventsIngestSchema = z.object({
  syncRunId: z.string().min(3).max(120),
  lockToken: z.string().min(16).max(255),
  schemaVersion: z.string().min(1).max(64),
  events: z.array(ingestEventSchema).min(1).max(500),
});

const claimRawEventsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const rawEventProcessingSchema = z.object({
  claimToken: z.string().min(16).max(255),
});

const rawEventFailureSchema = rawEventProcessingSchema.extend({
  errorMessage: z.string().min(3).max(400),
});

const providerRuntimeAccessContextSchema = z.object({
  syncRunId: z.string().min(3).max(120),
  lockToken: z.string().min(16).max(255),
});

function parseBody<T>(
  schema: z.ZodType<T>,
  ctx: RouteContext,
): { ok: true; data: T } | { ok: false; response: ReturnType<typeof failure> } {
  const parsed = schema.safeParse(ctx.body);
  if (!parsed.success) {
    return {
      ok: false,
      response: failure(
        "VALIDATION_ERROR",
        "Payload validation failed",
        ctx.requestId,
        422,
        {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}

export function parseIdempotencyKeyHeader(
  rawHeader: string | string[] | undefined,
):
  | { ok: true; value: string }
  | {
      ok: false;
      code: "IDEMPOTENCY_KEY_REQUIRED" | "INVALID_IDEMPOTENCY_KEY";
      message: string;
    } {
  if (rawHeader == null) {
    return {
      ok: false,
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "Idempotency-Key header is required",
    };
  }

  if (Array.isArray(rawHeader)) {
    return {
      ok: false,
      code: "INVALID_IDEMPOTENCY_KEY",
      message: "Idempotency-Key header must be provided exactly once",
    };
  }

  const normalized = rawHeader.trim();
  if (!IDEMPOTENCY_KEY_PATTERN.test(normalized)) {
    return {
      ok: false,
      code: "INVALID_IDEMPOTENCY_KEY",
      message:
        "Idempotency-Key must be 8-128 chars and use only letters, numbers, colon, underscore or hyphen",
    };
  }

  return {
    ok: true,
    value: normalized,
  };
}

function buildAuditContext(ctx: RouteContext) {
  return {
    actorService: ctx.principal?.name ?? null,
    actorUserId: null,
    requestId: ctx.requestId,
  };
}

function normalizeCorrelationId(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function bindRouteCorrelation(
  ctx: RouteContext,
  updates: {
    runId?: string | null;
    connectorRunId?: string | null;
  },
): void {
  const runId = normalizeCorrelationId(updates.runId);
  if (runId != null) {
    ctx.runId = runId;
  }

  const connectorRunId = normalizeCorrelationId(updates.connectorRunId);
  if (connectorRunId != null) {
    ctx.connectorRunId = connectorRunId;
  }
}

function getSingleHeader(
  header: string | string[] | undefined,
): string | undefined {
  if (typeof header === "string") {
    return header;
  }
  return undefined;
}

type ServiceActionOptions = {
  errorCode: string;
  errorMessage: string;
  errorStatusCode?: number;
  successMessage?: string;
  successStatusCode?: number;
};

function failureFromError(
  ctx: RouteContext,
  options: Pick<
    ServiceActionOptions,
    "errorCode" | "errorMessage" | "errorStatusCode"
  >,
  error: unknown,
) {
  return failure(
    options.errorCode,
    error instanceof Error ? error.message : options.errorMessage,
    ctx.requestId,
    options.errorStatusCode ?? 400,
  );
}

async function runServiceAction<T>(
  ctx: RouteContext,
  options: ServiceActionOptions,
  action: (service: Awaited<ReturnType<typeof getService>>) => Promise<T> | T,
) {
  try {
    const result = await action(await getService());
    return success(
      result,
      ctx.requestId,
      options.successMessage,
      options.successStatusCode,
    );
  } catch (error) {
    return failureFromError(ctx, options, error);
  }
}

async function runParsedServiceAction<T, TResult>(
  ctx: RouteContext,
  schema: z.ZodType<T>,
  options: ServiceActionOptions,
  action: (
    service: Awaited<ReturnType<typeof getService>>,
    input: T,
  ) => Promise<TResult> | TResult,
) {
  const parsed = parseBody<T>(schema, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }

  return await runServiceAction(ctx, options, (service) =>
    action(service, parsed.data),
  );
}

function getOrgId(ctx: RouteContext): string {
  return ctx.params["orgId"] ?? "";
}

function getConnectionId(ctx: RouteContext): string {
  return ctx.params["connectionId"] ?? "";
}

function getCredentialId(ctx: RouteContext): string {
  return ctx.params["credentialId"] ?? "";
}

function getEventId(ctx: RouteContext): string {
  return ctx.params["eventId"] ?? "";
}

function getRawEventId(ctx: RouteContext): string {
  return ctx.params["rawEventId"] ?? "";
}

function getRunId(ctx: RouteContext): string {
  return ctx.params["runId"] ?? "";
}

function bindConnectorRunId(
  ctx: RouteContext,
  connectorRunId: string | null | undefined,
): void {
  bindRouteCorrelation(ctx, {
    ...(connectorRunId !== undefined ? { connectorRunId } : {}),
  });
}

function buildIngestAuthContext(ctx: RouteContext): IngestAuthContext {
  return {
    authorizationHeader: getSingleHeader(ctx.headers["authorization"]),
    keyIdHeader: getSingleHeader(ctx.headers["x-praedixa-key-id"]),
    timestampHeader: getSingleHeader(ctx.headers["x-praedixa-timestamp"]),
    signatureHeader: getSingleHeader(ctx.headers["x-praedixa-signature"]),
    clientIp: ctx.clientIp,
    rawBody: ctx.rawBody,
  };
}

function logIngestSecurityEvent(
  event: string,
  ctx: RouteContext,
  payload: Record<string, unknown>,
): void {
  const envelope = redactSensitive({
    event,
    requestId: ctx.requestId,
    path: ctx.path,
    method: ctx.method,
    clientIp: ctx.clientIp,
    ...payload,
  });
  process.stderr.write(`[connectors][security] ${JSON.stringify(envelope)}\n`);
}

export const routes: RouteDefinition[] = [
  route(
    "GET",
    "/health",
    (ctx) =>
      success(
        {
          status: "healthy",
          service: "app-connectors",
          timestamp: new Date().toISOString(),
        },
        ctx.requestId,
      ),
    { authRequired: false },
  ),
  route(
    "GET",
    "/v1/connectors/catalog",
    async (ctx) => success((await getService()).listCatalog(), ctx.requestId),
    { requiredCapabilities: ["catalog:read"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections",
    async (ctx) =>
      success(
        (await getService()).listConnections(
          ctx.params["orgId"] ?? "",
          ctx.query.get("vendor"),
        ),
        ctx.requestId,
      ),
    { requiredCapabilities: ["connections:read"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId",
    async (ctx) => {
      const service = await getService();
      const connection = service.getConnection(
        ctx.params["orgId"] ?? "",
        ctx.params["connectionId"] ?? "",
      );
      if (connection == null) {
        return failure("NOT_FOUND", "Connection not found", ctx.requestId, 404);
      }
      return success(connection, ctx.requestId);
    },
    { requiredCapabilities: ["connections:read"] },
  ),
  route(
    "POST",
    "/v1/runtime/organizations/:orgId/connections/:connectionId/access-context",
    async (ctx) =>
      await runParsedServiceAction<
        {
          syncRunId: string;
          lockToken: string;
        },
        unknown
      >(
        ctx,
        providerRuntimeAccessContextSchema as z.ZodType<{
          syncRunId: string;
          lockToken: string;
        }>,
        {
          errorCode: "PROVIDER_ACCESS_CONTEXT_FAILED",
          errorMessage: "Unable to load provider runtime access context",
          successMessage: "Provider runtime access context loaded",
        },
        async (service, input) =>
          await service.getProviderRuntimeAccessContextForRun(
            getOrgId(ctx),
            getConnectionId(ctx),
            input,
          ),
      ),
    { requiredCapabilities: ["provider_runtime:write"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId/ingest-credentials",
    async (ctx) =>
      success(
        (await getService()).listIngestCredentials(
          getOrgId(ctx),
          getConnectionId(ctx),
        ),
        ctx.requestId,
      ),
    { requiredCapabilities: ["ingest_credentials:read"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/ingest-credentials",
    async (ctx) =>
      await runParsedServiceAction<IssueIngestCredentialInput, unknown>(
        ctx,
        issueIngestCredentialSchema as z.ZodType<IssueIngestCredentialInput>,
        {
          errorCode: "INGEST_CREDENTIAL_ISSUE_FAILED",
          errorMessage: "Unable to issue ingestion credential",
          successMessage: "Ingestion credential issued",
          successStatusCode: 201,
        },
        (service, input) =>
          service.issueIngestCredential(
            getOrgId(ctx),
            getConnectionId(ctx),
            input,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["ingest_credentials:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/ingest-credentials/:credentialId/revoke",
    async (ctx) =>
      await runServiceAction(
        ctx,
        {
          errorCode: "INGEST_CREDENTIAL_REVOKE_FAILED",
          errorMessage: "Unable to revoke ingestion credential",
          successMessage: "Ingestion credential revoked",
        },
        (service) =>
          service.revokeIngestCredential(
            getOrgId(ctx),
            getConnectionId(ctx),
            getCredentialId(ctx),
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["ingest_credentials:write"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events",
    async (ctx) =>
      success(
        (await getService()).listRawEventSummaries(
          getOrgId(ctx),
          getConnectionId(ctx),
        ),
        ctx.requestId,
      ),
    { requiredCapabilities: ["raw_events:read"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/:eventId/payload",
    async (ctx) =>
      await runServiceAction(
        ctx,
        {
          errorCode: "RAW_EVENT_PAYLOAD_FAILED",
          errorMessage: "Unable to load raw event payload",
          errorStatusCode: 404,
        },
        (service) =>
          service.getRawEventPayload(
            getOrgId(ctx),
            getConnectionId(ctx),
            getEventId(ctx),
          ),
      ),
    { requiredCapabilities: ["raw_events_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/runtime/organizations/:orgId/connections/:connectionId/provider-events",
    async (ctx) =>
      await runParsedServiceAction<
        {
          syncRunId: string;
          lockToken: string;
          schemaVersion: string;
          events: IngestEventsInput["events"];
        },
        unknown
      >(
        ctx,
        providerEventsIngestSchema as z.ZodType<{
          syncRunId: string;
          lockToken: string;
          schemaVersion: string;
          events: IngestEventsInput["events"];
        }>,
        {
          errorCode: "PROVIDER_EVENTS_INGEST_FAILED",
          errorMessage: "Unable to ingest provider events",
          successMessage: "Provider events ingested",
        },
        async (service, input) =>
          await service.ingestProviderEvents(
            getOrgId(ctx),
            getConnectionId(ctx),
            {
              syncRunId: input.syncRunId,
              workerId: input.lockToken,
              schemaVersion: input.schemaVersion,
              events: input.events,
            },
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["provider_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/claim",
    async (ctx) =>
      await runParsedServiceAction<{ limit: number }, unknown>(
        ctx,
        claimRawEventsSchema as z.ZodType<{ limit: number }>,
        {
          errorCode: "RAW_EVENTS_CLAIM_FAILED",
          errorMessage: "Unable to claim raw events",
          successMessage: "Raw events claimed",
        },
        (service, input) =>
          service.claimRawEventsWithOpaqueClaims(
            getOrgId(ctx),
            getConnectionId(ctx),
            input.limit,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["raw_events_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/processed",
    async (ctx) =>
      await runParsedServiceAction<{ claimToken: string }, unknown>(
        ctx,
        rawEventProcessingSchema as z.ZodType<{ claimToken: string }>,
        {
          errorCode: "RAW_EVENT_PROCESS_FAILED",
          errorMessage: "Unable to mark raw event as processed",
          successMessage: "Raw event marked as processed",
        },
        (service, input) =>
          service.markRawEventProcessed(
            getOrgId(ctx),
            getConnectionId(ctx),
            getRawEventId(ctx),
            input.claimToken,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["raw_events_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/failed",
    async (ctx) =>
      await runParsedServiceAction<
        { claimToken: string; errorMessage: string },
        unknown
      >(
        ctx,
        rawEventFailureSchema as z.ZodType<{
          claimToken: string;
          errorMessage: string;
        }>,
        {
          errorCode: "RAW_EVENT_FAIL_FAILED",
          errorMessage: "Unable to mark raw event as failed",
          successMessage: "Raw event marked as failed",
        },
        (service, input) =>
          service.markRawEventFailed(
            getOrgId(ctx),
            getConnectionId(ctx),
            getRawEventId(ctx),
            input.claimToken,
            input.errorMessage,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["raw_events_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections",
    async (ctx) =>
      await runParsedServiceAction<CreateConnectionInput, unknown>(
        ctx,
        createConnectionSchema as z.ZodType<CreateConnectionInput>,
        {
          errorCode: "CONNECTION_CREATE_FAILED",
          errorMessage: "Unable to create connection",
          successMessage: "Connection created",
          successStatusCode: 201,
        },
        (service, input) =>
          service.createConnection(
            getOrgId(ctx),
            input,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["connections:write"] },
  ),
  route(
    "PATCH",
    "/v1/organizations/:orgId/connections/:connectionId",
    async (ctx) =>
      await runParsedServiceAction<UpdateConnectionInput, unknown>(
        ctx,
        updateConnectionSchema as z.ZodType<UpdateConnectionInput>,
        {
          errorCode: "CONNECTION_UPDATE_FAILED",
          errorMessage: "Unable to update connection",
          successMessage: "Connection updated",
        },
        (service, input) =>
          service.updateConnection(
            getOrgId(ctx),
            getConnectionId(ctx),
            input,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["connections:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/authorize/start",
    async (ctx) =>
      await runParsedServiceAction<AuthorizationStartInput, unknown>(
        ctx,
        authorizationStartSchema as z.ZodType<AuthorizationStartInput>,
        {
          errorCode: "AUTHORIZATION_START_FAILED",
          errorMessage: "Unable to start authorization",
          successMessage: "Authorization URL generated",
        },
        (service, input) =>
          service.startAuthorization(
            getOrgId(ctx),
            getConnectionId(ctx),
            input,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["oauth:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/authorize/complete",
    async (ctx) =>
      await runParsedServiceAction<AuthorizationCompleteInput, unknown>(
        ctx,
        authorizationCompleteSchema as z.ZodType<AuthorizationCompleteInput>,
        {
          errorCode: "AUTHORIZATION_COMPLETE_FAILED",
          errorMessage: "Unable to complete authorization",
          successMessage: "Authorization completed",
        },
        async (service, input) =>
          await service.completeAuthorization(
            getOrgId(ctx),
            getConnectionId(ctx),
            input,
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["oauth:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/test",
    async (ctx) =>
      await runServiceAction(
        ctx,
        {
          errorCode: "CONNECTION_TEST_FAILED",
          errorMessage: "Unable to test connection",
        },
        async (service) =>
          await service.testConnection(
            getOrgId(ctx),
            getConnectionId(ctx),
            buildAuditContext(ctx),
          ),
      ),
    { requiredCapabilities: ["connections:test"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/sync",
    async (ctx) => {
      const idempotencyKey = parseIdempotencyKeyHeader(
        ctx.headers["idempotency-key"],
      );
      if (!idempotencyKey.ok) {
        return failure(
          idempotencyKey.code,
          idempotencyKey.message,
          ctx.requestId,
          400,
        );
      }

      const parsed = parseBody<TriggerSyncInput>(
        triggerSyncSchema as z.ZodType<TriggerSyncInput>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }

      try {
        const run = await (
          await getService()
        ).triggerSync(
          getOrgId(ctx),
          getConnectionId(ctx),
          parsed.data,
          idempotencyKey.value,
          buildAuditContext(ctx),
        );
        bindRouteCorrelation(ctx, {
          connectorRunId: run.run.id,
        });
        return success(
          run.run,
          ctx.requestId,
          run.created ? "Sync queued" : "Existing sync replayed",
          run.created ? 202 : 200,
        );
      } catch (error) {
        return failureFromError(
          ctx,
          {
            errorCode: "SYNC_TRIGGER_FAILED",
            errorMessage: "Unable to trigger sync",
          },
          error,
        );
      }
    },
    { requiredCapabilities: ["sync:write"] },
  ),
  route(
    "POST",
    "/v1/runtime/sync-runs/claim",
    async (ctx) => {
      const parsed = parseBody<{ limit: number; leaseSeconds: number }>(
        claimSyncRunsSchema as z.ZodType<{
          limit: number;
          leaseSeconds: number;
        }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }

      return await runServiceAction(
        ctx,
        {
          errorCode: "SYNC_RUNS_CLAIM_FAILED",
          errorMessage: "Unable to claim integration sync runs",
          successMessage: "Sync runs claimed",
        },
        (service) =>
          service.claimSyncRunsWithOpaqueLocks(
            ctx.principal?.allowedOrgs ?? [],
            parsed.data,
            buildAuditContext(ctx),
          ),
      );
    },
    { requiredCapabilities: ["sync_runtime:write"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/sync-runs",
    async (ctx) =>
      success(
        (await getService()).listSyncRuns(
          getOrgId(ctx),
          ctx.query.get("connectionId"),
        ),
        ctx.requestId,
      ),
    { requiredCapabilities: ["sync:read"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/sync-runs/:runId",
    async (ctx) => {
      bindConnectorRunId(ctx, getRunId(ctx));
      const run = (await getService()).getSyncRun(getOrgId(ctx), getRunId(ctx));
      if (run == null) {
        return failure("NOT_FOUND", "Sync run not found", ctx.requestId, 404);
      }
      return success(run, ctx.requestId);
    },
    { requiredCapabilities: ["sync:read"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/sync-runs/:runId/execution-plan",
    async (ctx) => {
      const parsed = parseBody<{ lockToken: string }>(
        syncRunExecutionPlanSchema as z.ZodType<{ lockToken: string }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      bindConnectorRunId(ctx, getRunId(ctx));
      return await runServiceAction(
        ctx,
        {
          errorCode: "SYNC_RUN_EXECUTION_PLAN_FAILED",
          errorMessage: "Unable to build integration sync execution plan",
          successMessage: "Sync execution plan generated",
        },
        (service) =>
          service.getSyncRunExecutionPlan(
            getOrgId(ctx),
            getRunId(ctx),
            {
              workerId: parsed.data.lockToken,
            },
            buildAuditContext(ctx),
          ),
      );
    },
    { requiredCapabilities: ["sync_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/sync-runs/:runId/completed",
    async (ctx) => {
      const parsed = parseBody<{
        lockToken: string;
        recordsFetched: number;
        recordsWritten: number;
      }>(
        completeSyncRunSchema as z.ZodType<{
          lockToken: string;
          recordsFetched: number;
          recordsWritten: number;
        }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      bindConnectorRunId(ctx, getRunId(ctx));
      return await runServiceAction(
        ctx,
        {
          errorCode: "SYNC_RUN_COMPLETE_FAILED",
          errorMessage: "Unable to mark integration sync run as completed",
          successMessage: "Sync run marked as completed",
        },
        (service) =>
          service.markSyncRunCompleted(
            getOrgId(ctx),
            getRunId(ctx),
            {
              workerId: parsed.data.lockToken,
              recordsFetched: parsed.data.recordsFetched,
              recordsWritten: parsed.data.recordsWritten,
            },
            buildAuditContext(ctx),
          ),
      );
    },
    { requiredCapabilities: ["sync_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/sync-runs/:runId/sync-state",
    async (ctx) => {
      const parsed = parseBody<{
        lockToken: string;
        sourceObject: string;
        watermarkText?: string | null;
        watermarkAt?: string | null;
        cursorJson?: Record<string, unknown> | null;
      }>(
        syncStateUpdateSchema as z.ZodType<{
          lockToken: string;
          sourceObject: string;
          watermarkText?: string | null;
          watermarkAt?: string | null;
          cursorJson?: Record<string, unknown> | null;
        }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      bindConnectorRunId(ctx, getRunId(ctx));
      return await runServiceAction(
        ctx,
        {
          errorCode: "SYNC_STATE_UPDATE_FAILED",
          errorMessage: "Unable to persist integration sync state",
          successMessage: "Sync state updated",
        },
        (service) =>
          service.upsertSyncStateForRun(
            getOrgId(ctx),
            getRunId(ctx),
            {
              workerId: parsed.data.lockToken,
              sourceObject: parsed.data.sourceObject,
              ...(parsed.data.watermarkText !== undefined
                ? { watermarkText: parsed.data.watermarkText }
                : {}),
              ...(parsed.data.watermarkAt !== undefined
                ? { watermarkAt: parsed.data.watermarkAt }
                : {}),
              ...(parsed.data.cursorJson !== undefined
                ? { cursorJson: parsed.data.cursorJson }
                : {}),
            },
            buildAuditContext(ctx),
          ),
      );
    },
    { requiredCapabilities: ["sync_runtime:write"] },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/sync-runs/:runId/failed",
    async (ctx) => {
      const parsed = parseBody<{
        lockToken: string;
        errorMessage: string;
        errorClass?: string | null;
        retryable?: boolean;
        retryDelaySeconds?: number | null;
      }>(
        failSyncRunSchema as z.ZodType<{
          lockToken: string;
          errorMessage: string;
          errorClass?: string | null;
          retryable?: boolean;
          retryDelaySeconds?: number | null;
        }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      bindConnectorRunId(ctx, getRunId(ctx));
      return await runServiceAction(
        ctx,
        {
          errorCode: "SYNC_RUN_FAIL_FAILED",
          errorMessage: "Unable to mark integration sync run as failed",
          successMessage: "Sync run marked as failed",
        },
        (service) =>
          service.markSyncRunFailed(
            getOrgId(ctx),
            getRunId(ctx),
            {
              workerId: parsed.data.lockToken,
              errorMessage: parsed.data.errorMessage,
              ...(parsed.data.errorClass !== undefined
                ? { errorClass: parsed.data.errorClass }
                : {}),
              ...(parsed.data.retryable !== undefined
                ? { retryable: parsed.data.retryable }
                : {}),
              ...(parsed.data.retryDelaySeconds !== undefined
                ? { retryDelaySeconds: parsed.data.retryDelaySeconds }
                : {}),
            },
            buildAuditContext(ctx),
          ),
      );
    },
    { requiredCapabilities: ["sync_runtime:write"] },
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/audit-events",
    async (ctx) =>
      success(
        (await getService()).listAuditEvents(
          getOrgId(ctx),
          ctx.query.get("connectionId"),
        ),
        ctx.requestId,
      ),
    { requiredCapabilities: ["audit:read"] },
  ),
  route(
    "POST",
    "/v1/ingest/:orgId/:connectionId/events",
    async (ctx) => {
      const idempotencyKey = parseIdempotencyKeyHeader(
        ctx.headers["idempotency-key"],
      );
      if (!idempotencyKey.ok) {
        return failure(
          idempotencyKey.code,
          idempotencyKey.message,
          ctx.requestId,
          400,
        );
      }

      const parsed = parseBody<IngestEventsInput>(
        ingestEventsSchema as z.ZodType<IngestEventsInput>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }

      try {
        const result = await (
          await getService()
        ).ingestEvents(
          getOrgId(ctx),
          getConnectionId(ctx),
          parsed.data,
          buildIngestAuthContext(ctx),
          idempotencyKey.value,
        );
        bindRouteCorrelation(ctx, {
          connectorRunId: result.runId,
        });
        return success(result, ctx.requestId, "Events ingested");
      } catch (error) {
        if (error instanceof IngestAuthenticationError) {
          logIngestSecurityEvent("connectors.ingest.auth_failed", ctx, {
            organizationId: getOrgId(ctx),
            connectionId: getConnectionId(ctx),
            reason: error.reason,
          });
          return failure(
            "INGEST_AUTH_FAILED",
            "Invalid ingestion credentials",
            ctx.requestId,
            401,
          );
        }
        return failureFromError(
          ctx,
          {
            errorCode: "INGEST_FAILED",
            errorMessage: "Unable to ingest events",
          },
          error,
        );
      }
    },
    {
      authRequired: false,
      rateLimit: {
        maxRequests: 120,
        scope: "ip",
        windowMs: 60_000,
      },
    },
  ),
];
