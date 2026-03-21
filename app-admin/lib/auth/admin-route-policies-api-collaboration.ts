import {
  INTEGRATIONS_READ,
  INTEGRATIONS_WRITE,
  MESSAGES_ACCESS,
  MESSAGES_WRITE,
  SUPPORT_ACCESS,
  SUPPORT_WRITE,
  createApiPolicy,
  type AdminApiPolicy,
} from "./admin-route-policy-shared";

export const ADMIN_API_COLLABORATION_POLICIES: readonly AdminApiPolicy[] = [
  createApiPolicy({
    id: "org-integrations-get",
    pattern: "/api/v1/admin/organizations/[orgId]/integrations/connections",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integrations-post",
    pattern: "/api/v1/admin/organizations/[orgId]/integrations/connections",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-connection-get",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-connection-patch",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]",
    methods: ["PATCH"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-connection-test",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/test",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-sync",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/sync",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-sync-runs",
    pattern: "/api/v1/admin/organizations/[orgId]/integrations/sync-runs",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credentials-get",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credentials-post",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-ingest-credential-revoke",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/ingest-credentials/[credentialId]/revoke",
    methods: ["POST"],
    requiredPermissions: INTEGRATIONS_WRITE,
  }),
  createApiPolicy({
    id: "org-integration-raw-events",
    pattern:
      "/api/v1/admin/organizations/[orgId]/integrations/connections/[connectionId]/raw-events",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  createApiPolicy({
    id: "conversations",
    pattern: "/api/v1/admin/conversations",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "org-conversations",
    pattern: "/api/v1/admin/organizations/[orgId]/conversations",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-messages-get",
    pattern: "/api/v1/admin/conversations/[conversationId]/messages",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-messages-post",
    pattern: "/api/v1/admin/conversations/[conversationId]/messages",
    methods: ["POST"],
    requiredPermissions: MESSAGES_WRITE,
  }),
  createApiPolicy({
    id: "conversation-status-get",
    pattern: "/api/v1/admin/conversations/[conversationId]",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "conversation-status-patch",
    pattern: "/api/v1/admin/conversations/[conversationId]",
    methods: ["PATCH"],
    requiredPermissions: MESSAGES_WRITE,
  }),
  createApiPolicy({
    id: "conversations-unread",
    pattern: "/api/v1/admin/conversations/unread-count",
    methods: ["GET"],
    requiredPermissions: MESSAGES_ACCESS,
  }),
  createApiPolicy({
    id: "contact-requests",
    pattern: "/api/v1/admin/contact-requests",
    methods: ["GET"],
    requiredPermissions: SUPPORT_ACCESS,
  }),
  createApiPolicy({
    id: "contact-request-status",
    pattern: "/api/v1/admin/contact-requests/[requestId]/status",
    methods: ["PATCH"],
    requiredPermissions: SUPPORT_WRITE,
  }),
] as const;
