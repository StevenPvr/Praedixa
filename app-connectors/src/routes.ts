import { z } from "zod";

import { CONNECTOR_CATALOG } from "./catalog.js";
import { failure, success } from "./response.js";
import { route } from "./router.js";
import { createDefaultConnectorService } from "./service.js";
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
  new Set(
    CONNECTOR_CATALOG.flatMap((entry) => entry.authModes),
  ),
);
const syncTriggers: SyncTriggerType[] = ["manual", "schedule", "backfill", "replay", "webhook"];
const IDEMPOTENCY_KEY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9:_-]{7,127}$/;

const createConnectionSchema = z.object({
  vendor: z.enum(vendors as [ConnectorVendor, ...ConnectorVendor[]]),
  displayName: z.string().min(3).max(120),
  authMode: z.enum(authModes as [ConnectorAuthMode, ...ConnectorAuthMode[]]),
  config: z.record(z.unknown()).optional(),
  secretRef: z.string().min(8).max(256).optional().nullable(),
  credentials: z.record(z.unknown()).optional().nullable(),
  sourceObjects: z.array(z.string().min(1).max(120)).max(32).optional(),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  webhookEnabled: z.boolean().optional(),
  baseUrl: z.string().url().max(2048).optional().nullable(),
  externalAccountId: z.string().min(1).max(255).optional().nullable(),
  oauthScopes: z.array(z.string().min(1).max(120)).max(20).optional().nullable(),
});

const updateConnectionSchema = z.object({
  displayName: z.string().min(3).max(120).optional(),
  config: z.record(z.unknown()).optional(),
  sourceObjects: z.array(z.string().min(1).max(120)).max(32).optional(),
  syncIntervalMinutes: z.number().int().min(5).max(1440).optional(),
  webhookEnabled: z.boolean().optional(),
  baseUrl: z.string().url().max(2048).optional().nullable(),
  externalAccountId: z.string().min(1).max(255).optional().nullable(),
  oauthScopes: z.array(z.string().min(1).max(120)).max(20).optional().nullable(),
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

const issueIngestCredentialSchema = z.object({
  label: z.string().min(3).max(120),
  expiresAt: z.string().datetime().optional().nullable(),
  allowedSourceObjects: z.array(z.string().min(1).max(120)).max(32).optional().nullable(),
  allowedIpAddresses: z.array(z.string().min(3).max(120)).max(32).optional().nullable(),
  requireSignature: z.boolean().optional().default(false),
});

const ingestEventsSchema = z.object({
  schemaVersion: z.string().min(1).max(64),
  sentAt: z.string().datetime().optional().nullable(),
  events: z.array(
    z.object({
      eventId: z.string().min(1).max(255).optional().nullable(),
      sourceObject: z.string().min(1).max(120),
      sourceRecordId: z.string().min(1).max(255),
      sourceUpdatedAt: z.string().datetime().optional().nullable(),
      contentType: z.string().min(1).max(120).optional().nullable(),
      payload: z.record(z.unknown()),
    }),
  ).min(1).max(500),
});

const claimRawEventsSchema = z.object({
  workerId: z.string().min(3).max(120),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const rawEventProcessingSchema = z.object({
  workerId: z.string().min(3).max(120),
});

const rawEventFailureSchema = rawEventProcessingSchema.extend({
  errorMessage: z.string().min(3).max(400),
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

function actorUserIdFromContext(ctx: RouteContext): string | null {
  const header = ctx.headers["x-actor-user-id"];
  if (typeof header !== "string") {
    return null;
  }
  const normalized = header.trim();
  return normalized.length > 0 ? normalized : null;
}

export function parseIdempotencyKeyHeader(
  rawHeader: string | string[] | undefined,
):
  | { ok: true; value: string }
  | { ok: false; code: "IDEMPOTENCY_KEY_REQUIRED" | "INVALID_IDEMPOTENCY_KEY"; message: string } {
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
    actorUserId: actorUserIdFromContext(ctx),
    requestId: ctx.requestId,
  };
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
  options: Pick<ServiceActionOptions, "errorCode" | "errorMessage" | "errorStatusCode">,
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

function buildIngestAuthContext(ctx: RouteContext): IngestAuthContext {
  return {
    authorizationHeader: getSingleHeader(ctx.headers.authorization),
    keyIdHeader: getSingleHeader(ctx.headers["x-praedixa-key-id"]),
    timestampHeader: getSingleHeader(ctx.headers["x-praedixa-timestamp"]),
    signatureHeader: getSingleHeader(ctx.headers["x-praedixa-signature"]),
    clientIp: ctx.clientIp,
    rawBody: ctx.rawBody,
  };
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
  route("GET", "/v1/connectors/catalog", async (ctx) =>
    success((await getService()).listCatalog(), ctx.requestId),
  ),
  route("GET", "/v1/organizations/:orgId/connections", async (ctx) =>
    success(
      (await getService()).listConnections(ctx.params.orgId ?? "", ctx.query.get("vendor")),
      ctx.requestId,
    ),
  ),
  route("GET", "/v1/organizations/:orgId/connections/:connectionId", async (ctx) => {
    const service = await getService();
    const connection = service.getConnection(
      ctx.params.orgId ?? "",
      ctx.params.connectionId ?? "",
    );
    if (connection == null) {
      return failure("NOT_FOUND", "Connection not found", ctx.requestId, 404);
    }
    return success(connection, ctx.requestId);
  }),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId/ingest-credentials",
    async (ctx) =>
      success(
        (await getService()).listIngestCredentials(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        ),
        ctx.requestId,
      ),
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/ingest-credentials",
    async (ctx) => {
      const parsed = parseBody<IssueIngestCredentialInput>(
        issueIngestCredentialSchema as z.ZodType<IssueIngestCredentialInput>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "INGEST_CREDENTIAL_ISSUE_FAILED",
          errorMessage: "Unable to issue ingestion credential",
          successMessage: "Ingestion credential issued",
          successStatusCode: 201,
        },
        (service) =>
          service.issueIngestCredential(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            parsed.data,
            buildAuditContext(ctx),
          ),
      );
    },
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
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            ctx.params.credentialId ?? "",
            buildAuditContext(ctx),
          ),
      ),
  ),
  route(
    "GET",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events",
    async (ctx) =>
      success(
        (await getService()).listRawEvents(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        ),
        ctx.requestId,
      ),
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
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            ctx.params.eventId ?? "",
          ),
      ),
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/claim",
    async (ctx) => {
      const parsed = parseBody<{ workerId: string; limit: number }>(
        claimRawEventsSchema as z.ZodType<{ workerId: string; limit: number }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "RAW_EVENTS_CLAIM_FAILED",
          errorMessage: "Unable to claim raw events",
          successMessage: "Raw events claimed",
        },
        (service) =>
          service.claimRawEvents(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            parsed.data.workerId,
            parsed.data.limit,
            buildAuditContext(ctx),
          ),
      );
    },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/processed",
    async (ctx) => {
      const parsed = parseBody<{ workerId: string }>(
        rawEventProcessingSchema as z.ZodType<{ workerId: string }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "RAW_EVENT_PROCESS_FAILED",
          errorMessage: "Unable to mark raw event as processed",
          successMessage: "Raw event marked as processed",
        },
        (service) =>
          service.markRawEventProcessed(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            ctx.params.rawEventId ?? "",
            parsed.data.workerId,
            buildAuditContext(ctx),
          ),
      );
    },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/raw-events/:rawEventId/failed",
    async (ctx) => {
      const parsed = parseBody<{ workerId: string; errorMessage: string }>(
        rawEventFailureSchema as z.ZodType<{ workerId: string; errorMessage: string }>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "RAW_EVENT_FAIL_FAILED",
          errorMessage: "Unable to mark raw event as failed",
          successMessage: "Raw event marked as failed",
        },
        (service) =>
          service.markRawEventFailed(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            ctx.params.rawEventId ?? "",
            parsed.data.workerId,
            parsed.data.errorMessage,
            buildAuditContext(ctx),
          ),
      );
    },
  ),
  route("POST", "/v1/organizations/:orgId/connections", async (ctx) => {
    const parsed = parseBody<CreateConnectionInput>(
      createConnectionSchema as z.ZodType<CreateConnectionInput>,
      ctx,
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    return await runServiceAction(
      ctx,
      {
        errorCode: "CONNECTION_CREATE_FAILED",
        errorMessage: "Unable to create connection",
        successMessage: "Connection created",
        successStatusCode: 201,
      },
      (service) =>
        service.createConnection(
          ctx.params.orgId ?? "",
          parsed.data,
          buildAuditContext(ctx),
        ),
    );
  }),
  route("PATCH", "/v1/organizations/:orgId/connections/:connectionId", async (ctx) => {
    const parsed = parseBody<UpdateConnectionInput>(
      updateConnectionSchema as z.ZodType<UpdateConnectionInput>,
      ctx,
    );
    if (!parsed.ok) {
      return parsed.response;
    }
    return await runServiceAction(
      ctx,
      {
        errorCode: "CONNECTION_UPDATE_FAILED",
        errorMessage: "Unable to update connection",
        successMessage: "Connection updated",
      },
      (service) =>
        service.updateConnection(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          parsed.data,
          buildAuditContext(ctx),
        ),
    );
  }),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/authorize/start",
    async (ctx) => {
      const parsed = parseBody<AuthorizationStartInput>(
        authorizationStartSchema as z.ZodType<AuthorizationStartInput>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "AUTHORIZATION_START_FAILED",
          errorMessage: "Unable to start authorization",
          successMessage: "Authorization URL generated",
        },
        (service) =>
          service.startAuthorization(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            parsed.data,
            buildAuditContext(ctx),
          ),
      );
    },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/authorize/complete",
    async (ctx) => {
      const parsed = parseBody<AuthorizationCompleteInput>(
        authorizationCompleteSchema as z.ZodType<AuthorizationCompleteInput>,
        ctx,
      );
      if (!parsed.ok) {
        return parsed.response;
      }
      return await runServiceAction(
        ctx,
        {
          errorCode: "AUTHORIZATION_COMPLETE_FAILED",
          errorMessage: "Unable to complete authorization",
          successMessage: "Authorization completed",
        },
        async (service) =>
          await service.completeAuthorization(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            parsed.data,
            buildAuditContext(ctx),
          ),
      );
    },
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
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            buildAuditContext(ctx),
          ),
      ),
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/sync",
    async (ctx) => {
      const idempotencyKey = parseIdempotencyKeyHeader(ctx.headers["idempotency-key"]);
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
        const run = await (await getService()).triggerSync(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          parsed.data,
          idempotencyKey.value,
          buildAuditContext(ctx),
        );
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
  ),
  route("GET", "/v1/organizations/:orgId/sync-runs", async (ctx) =>
    success(
      (await getService()).listSyncRuns(ctx.params.orgId ?? "", ctx.query.get("connectionId")),
      ctx.requestId,
    ),
  ),
  route("GET", "/v1/organizations/:orgId/sync-runs/:runId", async (ctx) => {
    const run = (await getService()).getSyncRun(ctx.params.orgId ?? "", ctx.params.runId ?? "");
    if (run == null) {
      return failure("NOT_FOUND", "Sync run not found", ctx.requestId, 404);
    }
    return success(run, ctx.requestId);
  }),
  route("GET", "/v1/organizations/:orgId/audit-events", async (ctx) =>
    success(
      (await getService()).listAuditEvents(ctx.params.orgId ?? "", ctx.query.get("connectionId")),
      ctx.requestId,
    ),
  ),
  route(
    "POST",
    "/v1/ingest/:orgId/:connectionId/events",
    async (ctx) => {
      const idempotencyKey = parseIdempotencyKeyHeader(ctx.headers["idempotency-key"]);
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

      return await runServiceAction(
        ctx,
        {
          errorCode: "INGEST_FAILED",
          errorMessage: "Unable to ingest events",
          successMessage: "Events ingested",
        },
        async (service) =>
          await service.ingestEvents(
            ctx.params.orgId ?? "",
            ctx.params.connectionId ?? "",
            parsed.data,
            buildIngestAuthContext(ctx),
            idempotencyKey.value,
          ),
      );
    },
    { authRequired: false },
  ),
];
