import {
  AUDIT_READ,
  BILLING_READ,
  BILLING_WRITE,
  CONFIG_ACCESS,
  CONFIG_WRITE,
  INTEGRATIONS_READ,
  MESSAGES_ACCESS,
  MONITORING_READ,
  ONBOARDING_ACCESS,
  ONBOARDING_WRITE,
  ORG_READ,
  ORG_WRITE,
  USERS_ACCESS,
  USERS_WRITE,
  createApiPolicy,
  dedupePermissions,
  type AdminApiPolicy,
} from "./admin-route-policy-shared";

const WORKSPACE_HEADER_ACCESS = dedupePermissions([
  ...ORG_READ,
  ...USERS_ACCESS,
  ...CONFIG_ACCESS,
  ...ONBOARDING_ACCESS,
  ...MESSAGES_ACCESS,
]);
const PROOF_PACK_ACCESS = dedupePermissions([...ORG_READ, ...CONFIG_ACCESS]);

export const ADMIN_API_CORE_POLICIES: readonly AdminApiPolicy[] = [
  createApiPolicy({
    id: "health",
    pattern: "/api/v1/health",
    methods: ["GET"],
    public: true,
  }),
  createApiPolicy({
    id: "decision-contract-templates",
    pattern: "/api/v1/admin/decision-contract-templates",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "decision-contract-template-preview",
    pattern: "/api/v1/admin/decision-contract-templates/instantiate-preview",
    methods: ["POST"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "decision-compatibility-evaluate",
    pattern: "/api/v1/admin/decision-compatibility/evaluate",
    methods: ["POST"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  ...[
    "/api/v1/admin/monitoring/platform",
    "/api/v1/admin/monitoring/trends",
    "/api/v1/admin/monitoring/errors",
    "/api/v1/admin/monitoring/alerts/summary",
    "/api/v1/admin/monitoring/alerts/by-org",
    "/api/v1/admin/monitoring/scenarios/summary",
    "/api/v1/admin/monitoring/decisions/summary",
    "/api/v1/admin/monitoring/decisions/overrides",
    "/api/v1/admin/monitoring/decisions/adoption",
    "/api/v1/admin/monitoring/proof-packs/summary",
    "/api/v1/admin/monitoring/canonical-coverage",
    "/api/v1/admin/monitoring/cost-params/missing",
    "/api/v1/admin/monitoring/roi/by-org",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `monitoring-${index}`,
      pattern,
      methods: ["GET"],
      requiredPermissions: MONITORING_READ,
    }),
  ),
  createApiPolicy({
    id: "organizations-list",
    pattern: "/api/v1/admin/organizations",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "organizations-create",
    pattern: "/api/v1/admin/organizations",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-monitoring",
    pattern: "/api/v1/admin/monitoring/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: MONITORING_READ,
  }),
  createApiPolicy({
    id: "org-mirror",
    pattern: "/api/v1/admin/monitoring/organizations/[orgId]/mirror",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "organization",
    pattern: "/api/v1/admin/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: WORKSPACE_HEADER_ACCESS,
  }),
  createApiPolicy({
    id: "org-overview",
    pattern: "/api/v1/admin/organizations/[orgId]/overview",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-hierarchy",
    pattern: "/api/v1/admin/organizations/[orgId]/hierarchy",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "integrations-catalog",
    pattern: "/api/v1/admin/integrations/catalog",
    methods: ["GET"],
    requiredPermissions: INTEGRATIONS_READ,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/suspend",
    "/api/v1/admin/organizations/[orgId]/reactivate",
    "/api/v1/admin/organizations/[orgId]/churn",
    "/api/v1/admin/organizations/[orgId]/delete",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: ORG_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-users",
    pattern: "/api/v1/admin/organizations/[orgId]/users",
    methods: ["GET"],
    requiredPermissions: USERS_ACCESS,
  }),
  createApiPolicy({
    id: "org-user",
    pattern: "/api/v1/admin/organizations/[orgId]/users/[userId]",
    methods: ["GET"],
    requiredPermissions: USERS_ACCESS,
  }),
  createApiPolicy({
    id: "org-user-role",
    pattern: "/api/v1/admin/organizations/[orgId]/users/[userId]/role",
    methods: ["PATCH"],
    requiredPermissions: USERS_WRITE,
  }),
  createApiPolicy({
    id: "org-user-invite",
    pattern: "/api/v1/admin/organizations/[orgId]/users/invite",
    methods: ["POST"],
    requiredPermissions: USERS_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/users/[userId]/deactivate",
    "/api/v1/admin/organizations/[orgId]/users/[userId]/reactivate",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-user-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: USERS_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-billing",
    pattern: "/api/v1/admin/billing/organizations/[orgId]",
    methods: ["GET"],
    requiredPermissions: BILLING_READ,
  }),
  createApiPolicy({
    id: "org-change-plan",
    pattern: "/api/v1/admin/billing/organizations/[orgId]/change-plan",
    methods: ["POST"],
    requiredPermissions: BILLING_WRITE,
  }),
  createApiPolicy({
    id: "org-plan-history",
    pattern: "/api/v1/admin/billing/organizations/[orgId]/history",
    methods: ["GET"],
    requiredPermissions: BILLING_READ,
  }),
  createApiPolicy({
    id: "audit-log",
    pattern: "/api/v1/admin/audit-log",
    methods: ["GET"],
    requiredPermissions: AUDIT_READ,
  }),
  createApiPolicy({
    id: "onboarding-list",
    pattern: "/api/v1/admin/onboarding",
    methods: ["GET"],
    requiredPermissions: ONBOARDING_ACCESS,
  }),
  createApiPolicy({
    id: "onboarding-start",
    pattern: "/api/v1/admin/onboarding",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-cases",
    pattern: "/api/v1/admin/organizations/[orgId]/onboarding/cases",
    methods: ["GET"],
    requiredPermissions: ONBOARDING_ACCESS,
  }),
  createApiPolicy({
    id: "org-onboarding-case-create",
    pattern: "/api/v1/admin/organizations/[orgId]/onboarding/cases",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-case-detail",
    pattern: "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]",
    methods: ["GET"],
    requiredPermissions: ONBOARDING_ACCESS,
  }),
  createApiPolicy({
    id: "org-onboarding-case-recompute",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/readiness/recompute",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-case-cancel",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/cancel",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-case-reopen",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/reopen",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-task-save",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/tasks/[taskId]/save",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-task-complete",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/tasks/[taskId]/complete",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-task-file-upload",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/tasks/[taskId]/file-sources/upload",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  createApiPolicy({
    id: "org-onboarding-task-api-source-activate",
    pattern:
      "/api/v1/admin/organizations/[orgId]/onboarding/cases/[caseId]/tasks/[taskId]/api-sources/activate",
    methods: ["POST"],
    requiredPermissions: ONBOARDING_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/canonical",
    "/api/v1/admin/organizations/[orgId]/canonical/quality",
    "/api/v1/admin/organizations/[orgId]/alerts",
    "/api/v1/admin/organizations/[orgId]/scenarios",
    "/api/v1/admin/organizations/[orgId]/ml-monitoring/summary",
    "/api/v1/admin/organizations/[orgId]/ml-monitoring/drift",
    "/api/v1/admin/organizations/[orgId]/ingestion-log",
    "/api/v1/admin/organizations/[orgId]/medallion-quality-report",
    "/api/v1/admin/organizations/[orgId]/datasets",
    "/api/v1/admin/organizations/[orgId]/datasets/[datasetId]/data",
    "/api/v1/admin/organizations/[orgId]/datasets/[datasetId]/features",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-read-${index}`,
      pattern,
      methods: ["GET"],
      requiredPermissions: ORG_READ,
    }),
  ),
  createApiPolicy({
    id: "org-cost-params",
    pattern: "/api/v1/admin/organizations/[orgId]/cost-params",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-contracts-get",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-contracts",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-contracts-post",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-contracts",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  createApiPolicy({
    id: "org-decision-contract-detail",
    pattern:
      "/api/v1/admin/organizations/[orgId]/decision-contracts/[contractId]/versions/[contractVersion]",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-contract-transition",
    pattern:
      "/api/v1/admin/organizations/[orgId]/decision-contracts/[contractId]/versions/[contractVersion]/transition",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  createApiPolicy({
    id: "org-decision-contract-fork",
    pattern:
      "/api/v1/admin/organizations/[orgId]/decision-contracts/[contractId]/versions/[contractVersion]/fork",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  createApiPolicy({
    id: "org-decision-contract-rollback-candidates",
    pattern:
      "/api/v1/admin/organizations/[orgId]/decision-contracts/[contractId]/versions/[contractVersion]/rollback-candidates",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-contract-rollback",
    pattern:
      "/api/v1/admin/organizations/[orgId]/decision-contracts/[contractId]/versions/[contractVersion]/rollback",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  createApiPolicy({
    id: "org-decision-config-resolved",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/resolved",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-config-versions-get",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/versions",
    methods: ["GET"],
    requiredPermissions: CONFIG_ACCESS,
  }),
  createApiPolicy({
    id: "org-decision-config-versions-post",
    pattern: "/api/v1/admin/organizations/[orgId]/decision-config/versions",
    methods: ["POST"],
    requiredPermissions: CONFIG_WRITE,
  }),
  ...[
    "/api/v1/admin/organizations/[orgId]/decision-config/versions/[versionId]/cancel",
    "/api/v1/admin/organizations/[orgId]/decision-config/versions/[versionId]/rollback",
    "/api/v1/admin/organizations/[orgId]/alerts/[alertId]/scenarios/recompute",
  ].map((pattern, index) =>
    createApiPolicy({
      id: `org-decision-config-write-${index}`,
      pattern,
      methods: ["POST"],
      requiredPermissions: CONFIG_WRITE,
    }),
  ),
  createApiPolicy({
    id: "org-proof-packs",
    pattern: "/api/v1/admin/organizations/[orgId]/proof-packs",
    methods: ["GET"],
    requiredPermissions: PROOF_PACK_ACCESS,
  }),
  createApiPolicy({
    id: "org-approval-inbox",
    pattern: "/api/v1/admin/organizations/[orgId]/approval-inbox",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-approval-decision",
    pattern:
      "/api/v1/admin/organizations/[orgId]/approvals/[approvalId]/decision",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-action-dispatch-detail",
    pattern: "/api/v1/admin/organizations/[orgId]/action-dispatches/[actionId]",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-action-dispatch-decision",
    pattern:
      "/api/v1/admin/organizations/[orgId]/action-dispatches/[actionId]/decision",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-action-dispatch-fallback",
    pattern:
      "/api/v1/admin/organizations/[orgId]/action-dispatches/[actionId]/fallback",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-ledger-detail",
    pattern: "/api/v1/admin/organizations/[orgId]/ledgers/[ledgerId]",
    methods: ["GET"],
    requiredPermissions: ORG_READ,
  }),
  createApiPolicy({
    id: "org-ledger-decision",
    pattern: "/api/v1/admin/organizations/[orgId]/ledgers/[ledgerId]/decision",
    methods: ["POST"],
    requiredPermissions: ORG_WRITE,
  }),
  createApiPolicy({
    id: "org-proof-pack-share-link",
    pattern:
      "/api/v1/admin/organizations/[orgId]/proof-packs/[proofPackId]/share-link",
    methods: ["POST"],
    requiredPermissions: PROOF_PACK_ACCESS,
  }),
] as const;
