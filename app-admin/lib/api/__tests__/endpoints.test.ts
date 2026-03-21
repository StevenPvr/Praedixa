import { describe, it, expect } from "vitest";
import { ADMIN_ENDPOINTS } from "../endpoints";

describe("ADMIN_ENDPOINTS", () => {
  it("exposes expected static paths", () => {
    expect(ADMIN_ENDPOINTS.platformKPIs).toBe(
      "/api/v1/admin/monitoring/platform",
    );
    expect(ADMIN_ENDPOINTS.trends).toBe("/api/v1/admin/monitoring/trends");
    expect(ADMIN_ENDPOINTS.errors).toBe("/api/v1/admin/monitoring/errors");
    expect(ADMIN_ENDPOINTS.organizations).toBe("/api/v1/admin/organizations");
    expect(ADMIN_ENDPOINTS.auditLog).toBe("/api/v1/admin/audit-log");
    expect(ADMIN_ENDPOINTS.decisionContractTemplates).toBe(
      "/api/v1/admin/decision-contract-templates",
    );
    expect(ADMIN_ENDPOINTS.decisionContractTemplatePreview).toBe(
      "/api/v1/admin/decision-contract-templates/instantiate-preview",
    );
    expect(ADMIN_ENDPOINTS.decisionCompatibilityEvaluate).toBe(
      "/api/v1/admin/decision-compatibility/evaluate",
    );
    expect(ADMIN_ENDPOINTS.onboardingList).toBe("/api/v1/admin/onboarding");
    expect(ADMIN_ENDPOINTS.onboardingStart).toBe("/api/v1/admin/onboarding");
    expect(ADMIN_ENDPOINTS.contactRequests).toBe(
      "/api/v1/admin/contact-requests",
    );
  });

  it("encodes path params", () => {
    const orgId = "org/a b";
    const userId = "user+id";
    const datasetId = "dataset/01";
    const actionId = "action/42";
    const ledgerId = "ledger/7";

    expect(ADMIN_ENDPOINTS.orgMetrics(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgMirror(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.organization(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgOverview(orgId)).toContain(
      "organizations/org%2Fa%20b/overview",
    );
    expect(ADMIN_ENDPOINTS.orgHierarchy(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgSuspend(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgReactivate(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgChurn(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgDelete(orgId)).toContain("org%2Fa%20b/delete");

    expect(ADMIN_ENDPOINTS.orgUsers(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgUser(orgId, userId)).toContain("users/user%2Bid");
    expect(ADMIN_ENDPOINTS.orgUserRole(orgId, userId)).toContain(
      "users/user%2Bid/role",
    );
    expect(ADMIN_ENDPOINTS.orgUserInvite(orgId)).toContain("users/invite");
    expect(ADMIN_ENDPOINTS.orgUserDeactivate(orgId, userId)).toContain(
      "deactivate",
    );
    expect(ADMIN_ENDPOINTS.orgUserReactivate(orgId, userId)).toContain(
      "reactivate",
    );

    expect(ADMIN_ENDPOINTS.orgBilling(orgId)).toContain(
      "billing/organizations/org%2Fa%20b",
    );
    expect(ADMIN_ENDPOINTS.orgChangePlan(orgId)).toContain("change-plan");
    expect(ADMIN_ENDPOINTS.orgPlanHistory(orgId)).toContain("history");

    expect(ADMIN_ENDPOINTS.orgOnboardingCases(orgId)).toContain(
      "organizations/org%2Fa%20b/onboarding/cases",
    );
    expect(ADMIN_ENDPOINTS.orgOnboardingCase(orgId, "case/3")).toBe(
      "/api/v1/admin/organizations/org%2Fa%20b/onboarding/cases/case%2F3",
    );
    expect(
      ADMIN_ENDPOINTS.orgOnboardingTaskComplete(orgId, "case/3", "task/8"),
    ).toBe(
      "/api/v1/admin/organizations/org%2Fa%20b/onboarding/cases/case%2F3/tasks/task%2F8/complete",
    );

    expect(ADMIN_ENDPOINTS.orgCanonical(orgId)).toContain("canonical");
    expect(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId)).toContain(
      "canonical/quality",
    );
    expect(ADMIN_ENDPOINTS.orgCostParams(orgId)).toContain("cost-params");
    expect(ADMIN_ENDPOINTS.orgDecisionContracts(orgId)).toContain(
      "decision-contracts",
    );
    expect(
      ADMIN_ENDPOINTS.orgDecisionContractDetail(orgId, "coverage/core", 2),
    ).toContain("decision-contracts/coverage%2Fcore/versions/2");
    expect(
      ADMIN_ENDPOINTS.orgDecisionContractTransition(orgId, "coverage/core", 2),
    ).toContain("decision-contracts/coverage%2Fcore/versions/2/transition");
    expect(
      ADMIN_ENDPOINTS.orgDecisionContractFork(orgId, "coverage/core", 2),
    ).toContain("decision-contracts/coverage%2Fcore/versions/2/fork");
    expect(
      ADMIN_ENDPOINTS.orgDecisionContractRollbackCandidates(
        orgId,
        "coverage/core",
        2,
      ),
    ).toContain(
      "decision-contracts/coverage%2Fcore/versions/2/rollback-candidates",
    );
    expect(
      ADMIN_ENDPOINTS.orgDecisionContractRollback(orgId, "coverage/core", 2),
    ).toContain("decision-contracts/coverage%2Fcore/versions/2/rollback");
    expect(ADMIN_ENDPOINTS.orgAlerts(orgId)).toContain("alerts");
    expect(ADMIN_ENDPOINTS.orgScenarios(orgId)).toContain("scenarios");
    expect(ADMIN_ENDPOINTS.orgApprovalsInbox(orgId)).toContain(
      "organizations/org%2Fa%20b/approval-inbox",
    );
    expect(ADMIN_ENDPOINTS.orgApprovalDecision(orgId, "approval/9")).toContain(
      "approvals/approval%2F9/decision",
    );
    expect(ADMIN_ENDPOINTS.orgActionDispatchDetail(orgId, actionId)).toContain(
      "action-dispatches/action%2F42",
    );
    expect(
      ADMIN_ENDPOINTS.orgActionDispatchDecision(orgId, actionId),
    ).toContain("action-dispatches/action%2F42/decision");
    expect(
      ADMIN_ENDPOINTS.orgActionDispatchFallback(orgId, actionId),
    ).toContain("action-dispatches/action%2F42/fallback");
    expect(ADMIN_ENDPOINTS.orgLedgerDetail(orgId, ledgerId)).toContain(
      "ledgers/ledger%2F7",
    );
    expect(ADMIN_ENDPOINTS.orgLedgerDecision(orgId, ledgerId)).toContain(
      "ledgers/ledger%2F7/decision",
    );
    expect(ADMIN_ENDPOINTS.orgProofPacks(orgId)).toContain("proof-packs");
    expect(ADMIN_ENDPOINTS.orgIngestionLog(orgId)).toContain("ingestion-log");
    expect(ADMIN_ENDPOINTS.orgDatasetData(orgId, datasetId)).toContain(
      "datasets/dataset%2F01/data",
    );
    expect(ADMIN_ENDPOINTS.orgDatasetFeatures(orgId, datasetId)).toContain(
      "datasets/dataset%2F01/features",
    );
    expect(
      ADMIN_ENDPOINTS.orgIntegrationConnectionTest(orgId, "connection/1"),
    ).toContain("integrations/connections/connection%2F1/test");
    expect(ADMIN_ENDPOINTS.orgIntegrationSync(orgId, "connection/1")).toContain(
      "integrations/connections/connection%2F1/sync",
    );
    expect(ADMIN_ENDPOINTS.orgIntegrationSyncRuns(orgId)).toContain(
      "integrations/sync-runs",
    );

    expect(ADMIN_ENDPOINTS.contactRequestStatus(orgId)).toContain(
      "contact-requests/org%2Fa%20b/status",
    );
  });
});
