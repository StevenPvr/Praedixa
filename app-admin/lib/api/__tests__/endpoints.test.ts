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
    expect(ADMIN_ENDPOINTS.onboardingList).toBe("/api/v1/admin/onboarding");
    expect(ADMIN_ENDPOINTS.onboardingStart).toBe("/api/v1/admin/onboarding");
  });

  it("encodes path params", () => {
    const orgId = "org/a b";
    const userId = "user+id";
    const datasetId = "dataset/01";

    expect(ADMIN_ENDPOINTS.orgMetrics(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgMirror(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.organization(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgHierarchy(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgSuspend(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgReactivate(orgId)).toContain("org%2Fa%20b");
    expect(ADMIN_ENDPOINTS.orgChurn(orgId)).toContain("org%2Fa%20b");

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

    expect(ADMIN_ENDPOINTS.onboardingStep("ob-1", 3)).toBe(
      "/api/v1/admin/onboarding/ob-1/step/3",
    );

    expect(ADMIN_ENDPOINTS.orgCanonical(orgId)).toContain("canonical");
    expect(ADMIN_ENDPOINTS.orgCanonicalQuality(orgId)).toContain(
      "canonical/quality",
    );
    expect(ADMIN_ENDPOINTS.orgCostParams(orgId)).toContain("cost-params");
    expect(ADMIN_ENDPOINTS.orgAlerts(orgId)).toContain("alerts");
    expect(ADMIN_ENDPOINTS.orgScenarios(orgId)).toContain("scenarios");
    expect(ADMIN_ENDPOINTS.orgProofPacks(orgId)).toContain("proof-packs");
    expect(ADMIN_ENDPOINTS.orgIngestionLog(orgId)).toContain("ingestion-log");
    expect(ADMIN_ENDPOINTS.orgDatasetData(orgId, datasetId)).toContain(
      "datasets/dataset%2F01/data",
    );
    expect(ADMIN_ENDPOINTS.orgDatasetFeatures(orgId, datasetId)).toContain(
      "datasets/dataset%2F01/features",
    );
  });
});
