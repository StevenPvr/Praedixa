import { z } from "zod";

import { failure, success } from "./response.js";
import { route } from "./router.js";
import { createDefaultConnectorService } from "./service.js";
import type {
  ConnectorAuthMode,
  ConnectorVendor,
  RouteContext,
  RouteDefinition,
  SyncTriggerType,
} from "./types.js";

const service = createDefaultConnectorService();

const vendors = service.listCatalog().map((entry) => entry.vendor);
const authModes = Array.from(
  new Set(
    service.listCatalog().flatMap((entry) => entry.authModes),
  ),
);
const syncTriggers: SyncTriggerType[] = ["manual", "schedule", "backfill", "replay", "webhook"];

const createConnectionSchema = z.object({
  vendor: z.enum(vendors as [ConnectorVendor, ...ConnectorVendor[]]),
  displayName: z.string().min(3).max(120),
  authMode: z.enum(authModes as [ConnectorAuthMode, ...ConnectorAuthMode[]]),
  secretRef: z.string().min(8).max(256).optional().nullable(),
  config: z.record(z.unknown()).optional(),
});

const triggerSyncSchema = z.object({
  triggerType: z
    .enum(syncTriggers as [SyncTriggerType, ...SyncTriggerType[]])
    .optional()
    .default("manual"),
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
  route("GET", "/v1/connectors/catalog", (ctx) =>
    success(service.listCatalog(), ctx.requestId),
  ),
  route("GET", "/v1/organizations/:orgId/connections", (ctx) =>
    success(
      service.listConnections(ctx.params.orgId ?? "", ctx.query.get("vendor")),
      ctx.requestId,
    ),
  ),
  route("POST", "/v1/organizations/:orgId/connections", (ctx) => {
    const parsed = parseBody(createConnectionSchema, ctx);
    if (!parsed.ok) {
      return parsed.response;
    }
    try {
      const row = service.createConnection(ctx.params.orgId ?? "", parsed.data);
      return success(row, ctx.requestId, "Connection created", 201);
    } catch (error) {
      return failure(
        "CONNECTION_CREATE_FAILED",
        error instanceof Error ? error.message : "Unable to create connection",
        ctx.requestId,
        400,
      );
    }
  }),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/test",
    async (ctx) => {
      try {
        const result = await service.testConnection(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
        );
        return success(result, ctx.requestId);
      } catch (error) {
        return failure(
          "CONNECTION_TEST_FAILED",
          error instanceof Error ? error.message : "Unable to test connection",
          ctx.requestId,
          404,
        );
      }
    },
  ),
  route(
    "POST",
    "/v1/organizations/:orgId/connections/:connectionId/sync",
    async (ctx) => {
      const parsed = parseBody(triggerSyncSchema, ctx);
      if (!parsed.ok) {
        return parsed.response;
      }

      try {
        const run = await service.triggerSync(
          ctx.params.orgId ?? "",
          ctx.params.connectionId ?? "",
          parsed.data.triggerType ?? "manual",
        );
        return success(run, ctx.requestId, "Sync started", 202);
      } catch (error) {
        return failure(
          "SYNC_TRIGGER_FAILED",
          error instanceof Error ? error.message : "Unable to trigger sync",
          ctx.requestId,
          404,
        );
      }
    },
  ),
  route("GET", "/v1/organizations/:orgId/sync-runs", (ctx) =>
    success(
      service.listSyncRuns(ctx.params.orgId ?? "", ctx.query.get("connectionId")),
      ctx.requestId,
    ),
  ),
  route("GET", "/v1/organizations/:orgId/sync-runs/:runId", (ctx) => {
    const run = service.getSyncRun(ctx.params.orgId ?? "", ctx.params.runId ?? "");
    if (run == null) {
      return failure("NOT_FOUND", "Sync run not found", ctx.requestId, 404);
    }
    return success(run, ctx.requestId);
  }),
];
