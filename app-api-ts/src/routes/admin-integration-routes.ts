import {
  completeIntegrationAuthorization,
  IntegrationInputError,
  createIntegrationConnection,
  getIntegrationConnection,
  issueIntegrationIngestCredential,
  listIntegrationAuditEvents,
  listIntegrationCatalog,
  listIntegrationConnections,
  listIntegrationIngestCredentials,
  listIntegrationRawEvents,
  listIntegrationSyncRuns,
  revokeIntegrationIngestCredential,
  startIntegrationAuthorization,
  testIntegrationConnection,
  triggerIntegrationSync,
  updateIntegrationConnection,
} from "../admin-integrations.js";
import { failure, success } from "../response.js";
import { route } from "../router.js";
import type { RouteDefinition } from "../types.js";

const adminAllowedRoles = ["super_admin"] as const;
const adminOnly = { allowedRoles: adminAllowedRoles };
const adminAuditRead = {
  ...adminOnly,
  requiredPermissions: ["admin:audit:read"] as const,
};
const adminIntegrationsRead = {
  ...adminOnly,
  requiredPermissions: ["admin:integrations:read"] as const,
};
const adminIntegrationsWrite = {
  ...adminOnly,
  requiredPermissions: ["admin:integrations:write"] as const,
};

function integrationFailureResponse(
  error: unknown,
  requestId: string,
  fallbackCode: string,
  fallbackMessage: string,
) {
  if (error instanceof IntegrationInputError) {
    return failure(
      fallbackCode,
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

export const ADMIN_INTEGRATION_ROUTES: RouteDefinition[] = [
  route(
    "GET",
    "/api/v1/admin/integrations/catalog",
    async (ctx) => {
      try {
        return success(await listIntegrationCatalog(), ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_CATALOG_FAILED",
          "Unable to load integration catalog",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections",
    async (ctx) => {
      try {
        return success(
          await listIntegrationConnections(
            ctx.params["orgId"] ?? "",
            ctx.query.get("vendor"),
          ),
          ctx.requestId,
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_CONNECTIONS_FAILED",
          "Unable to load integration connections",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId",
    async (ctx) => {
      try {
        const connection = await getIntegrationConnection(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
        );
        return success(connection, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "NOT_FOUND",
          "Unable to load integration connection",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections",
    async (ctx) => {
      try {
        const created = await createIntegrationConnection(
          ctx.params["orgId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(
          created,
          ctx.requestId,
          "Integration connection created",
          201,
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_CREATE_FAILED",
          "Unable to create integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "PATCH",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId",
    async (ctx) => {
      try {
        const updated = await updateIntegrationConnection(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(
          updated,
          ctx.requestId,
          "Integration connection updated",
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_UPDATE_FAILED",
          "Unable to update integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/start",
    async (ctx) => {
      try {
        const started = await startIntegrationAuthorization(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(
          started,
          ctx.requestId,
          "Integration authorization started",
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "AUTHORIZATION_START_FAILED",
          "Unable to start integration authorization",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/authorize/complete",
    async (ctx) => {
      try {
        const completed = await completeIntegrationAuthorization(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(
          completed,
          ctx.requestId,
          "Integration authorization completed",
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "AUTHORIZATION_COMPLETE_FAILED",
          "Unable to complete integration authorization",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/test",
    async (ctx) => {
      try {
        const result = await testIntegrationConnection(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.user?.userId ?? null,
        );
        return success(result, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "CONNECTION_TEST_FAILED",
          "Unable to test integration connection",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials",
    async (ctx) => {
      try {
        const credentials = await listIntegrationIngestCredentials(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
        );
        return success(credentials, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIALS_LIST_FAILED",
          "Unable to list integration ingest credentials",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials",
    async (ctx) => {
      try {
        const issued = await issueIntegrationIngestCredential(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(
          issued,
          ctx.requestId,
          "Integration ingest credential issued",
          201,
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIAL_ISSUE_FAILED",
          "Unable to issue integration ingest credential",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/ingest-credentials/:credentialId/revoke",
    async (ctx) => {
      try {
        const revoked = await revokeIntegrationIngestCredential(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.params["credentialId"] ?? "",
          ctx.user?.userId ?? null,
        );
        return success(
          revoked,
          ctx.requestId,
          "Integration ingest credential revoked",
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INGEST_CREDENTIAL_REVOKE_FAILED",
          "Unable to revoke integration ingest credential",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/raw-events",
    async (ctx) => {
      try {
        const rawEvents = await listIntegrationRawEvents(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
        );
        return success(rawEvents, ctx.requestId);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "RAW_EVENTS_LIST_FAILED",
          "Unable to list integration raw events",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "POST",
    "/api/v1/admin/organizations/:orgId/integrations/connections/:connectionId/sync",
    async (ctx) => {
      try {
        const run = await triggerIntegrationSync(
          ctx.params["orgId"] ?? "",
          ctx.params["connectionId"] ?? "",
          ctx.body,
          ctx.user?.userId ?? null,
        );
        return success(run, ctx.requestId, "Integration sync run created", 202);
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "SYNC_TRIGGER_FAILED",
          "Unable to trigger integration sync",
        );
      }
    },
    adminIntegrationsWrite,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/sync-runs",
    async (ctx) => {
      try {
        return success(
          await listIntegrationSyncRuns(
            ctx.params["orgId"] ?? "",
            ctx.query.get("connectionId"),
          ),
          ctx.requestId,
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "SYNC_RUNS_LIST_FAILED",
          "Unable to load integration sync runs",
        );
      }
    },
    adminIntegrationsRead,
  ),
  route(
    "GET",
    "/api/v1/admin/organizations/:orgId/integrations/audit",
    async (ctx) => {
      try {
        return success(
          await listIntegrationAuditEvents(
            ctx.params["orgId"] ?? "",
            ctx.query.get("connectionId"),
          ),
          ctx.requestId,
        );
      } catch (error) {
        return integrationFailureResponse(
          error,
          ctx.requestId,
          "INTEGRATION_AUDIT_FAILED",
          "Unable to load integration audit events",
        );
      }
    },
    adminAuditRead,
  ),
];
