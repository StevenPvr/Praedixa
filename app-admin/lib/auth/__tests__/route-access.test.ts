import { readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ADMIN_PAGE_POLICIES,
  canAccessAdminApiPath,
  canAccessPath,
  getAdminPageTitle,
  getRequiredPermissionsForPath,
  hasExplicitAdminApiPolicy,
  hasExplicitAdminPagePolicy,
  resolveAccessibleAdminPath,
  resolveAdminApiPolicy,
} from "../route-access";
import { ADMIN_ENDPOINTS } from "@/lib/api/endpoints";

const authTestDir = dirname(fileURLToPath(import.meta.url));
const adminPagesDir = join(authTestDir, "../../../app/(admin)");

function collectAdminPageFiles(directory: string): string[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === "__tests__") {
      continue;
    }

    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAdminPageFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name === "page.tsx") {
      files.push(fullPath);
    }
  }

  return files;
}

function pageFileToRoutePattern(filePath: string): string {
  const normalized = relative(adminPagesDir, filePath).split(sep).join("/");
  if (normalized === "page.tsx") {
    return "/";
  }

  return `/${normalized.replace(/\/page\.tsx$/, "")}`;
}

describe("route access helpers", () => {
  it("maps workspace sections to their required permissions", () => {
    expect(getRequiredPermissionsForPath("/clients/org-1/equipe")).toEqual([
      "admin:users:read",
      "admin:users:write",
    ]);
  });

  it("allows journal access when audit read permission is present", () => {
    expect(canAccessPath("/journal", ["admin:audit:read"])).toBe(true);
  });

  it("blocks support routes without support permissions", () => {
    expect(canAccessPath("/demandes-contact", ["admin:org:read"])).toBe(false);
  });

  it("fails closed for unknown admin paths", () => {
    expect(hasExplicitAdminPagePolicy("/unknown-admin-route")).toBe(false);
    expect(
      canAccessPath("/unknown-admin-route", ["admin:console:access"]),
    ).toBe(false);
  });

  it("resolves explicit policies for priority admin paths", () => {
    expect(getAdminPageTitle("/")).toBe("Accueil");
    expect(getRequiredPermissionsForPath("/clients")).toEqual([
      "admin:org:read",
    ]);
    expect(getRequiredPermissionsForPath("/parametres")).toEqual([
      "admin:onboarding:read",
      "admin:onboarding:write",
      "admin:monitoring:read",
      "admin:org:write",
    ]);
    expect(getRequiredPermissionsForPath("/clients/org-1/contrats")).toEqual([
      "admin:org:write",
      "admin:billing:read",
    ]);
    expect(getRequiredPermissionsForPath("/clients/org-1/config")).toEqual([
      "admin:org:write",
      "admin:billing:read",
    ]);
    expect(getRequiredPermissionsForPath("/coverage-harness")).toEqual([
      "admin:monitoring:read",
    ]);
  });

  it("covers every admin page with an explicit policy", () => {
    const discoveredPatterns = collectAdminPageFiles(adminPagesDir)
      .map((filePath) => pageFileToRoutePattern(filePath))
      .sort();
    const policyPatterns = ADMIN_PAGE_POLICIES.map(
      (policy) => policy.pattern,
    ).sort();

    expect(policyPatterns).toEqual(discoveredPatterns);
  });

  it("resolves the first accessible admin landing path when the preferred path is forbidden", () => {
    expect(
      resolveAccessibleAdminPath(
        ["admin:console:access", "admin:org:read"],
        "/",
      ),
    ).toBe("/clients");
    expect(
      resolveAccessibleAdminPath(
        ["admin:console:access", "admin:org:read"],
        "/parametres",
      ),
    ).toBe("/clients");
    expect(
      resolveAccessibleAdminPath(
        ["admin:console:access", "admin:org:read"],
        "/clients/org-1/dashboard",
      ),
    ).toBe("/clients/org-1/dashboard");
  });

  it("matches explicit admin API policies for guarded proxy paths", () => {
    const apiCases = [
      ["GET", ADMIN_ENDPOINTS.platformKPIs],
      ["GET", ADMIN_ENDPOINTS.organizations],
      ["POST", ADMIN_ENDPOINTS.organizations],
      ["GET", ADMIN_ENDPOINTS.auditLog],
      ["GET", ADMIN_ENDPOINTS.decisionContractTemplates],
      ["POST", ADMIN_ENDPOINTS.decisionContractTemplatePreview],
      ["POST", ADMIN_ENDPOINTS.decisionCompatibilityEvaluate],
      ["GET", ADMIN_ENDPOINTS.onboardingList],
      ["POST", ADMIN_ENDPOINTS.onboardingStart],
      ["GET", ADMIN_ENDPOINTS.orgOnboardingCases("org-1")],
      ["POST", ADMIN_ENDPOINTS.orgOnboardingCases("org-1")],
      ["GET", ADMIN_ENDPOINTS.orgOnboardingCase("org-1", "case-1")],
      ["GET", ADMIN_ENDPOINTS.orgDecisionConfigResolved("org-1")],
      ["GET", ADMIN_ENDPOINTS.orgDecisionContracts("org-1")],
      ["POST", ADMIN_ENDPOINTS.orgDecisionContracts("org-1")],
      [
        "GET",
        ADMIN_ENDPOINTS.orgDecisionContractDetail("org-1", "coverage-core", 2),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgDecisionContractTransition(
          "org-1",
          "coverage-core",
          2,
        ),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgDecisionContractFork("org-1", "coverage-core", 2),
      ],
      [
        "GET",
        ADMIN_ENDPOINTS.orgDecisionContractRollbackCandidates(
          "org-1",
          "coverage-core",
          2,
        ),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgDecisionContractRollback(
          "org-1",
          "coverage-core",
          2,
        ),
      ],
      ["GET", ADMIN_ENDPOINTS.orgApprovalsInbox("org-1")],
      [
        "POST",
        ADMIN_ENDPOINTS.orgApprovalDecision(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      [
        "GET",
        ADMIN_ENDPOINTS.orgActionDispatchDetail(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgActionDispatchDecision(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgActionDispatchFallback(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      [
        "GET",
        ADMIN_ENDPOINTS.orgLedgerDetail(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      [
        "POST",
        ADMIN_ENDPOINTS.orgLedgerDecision(
          "org-1",
          "11111111-1111-4111-8111-111111111111",
        ),
      ],
      ["GET", ADMIN_ENDPOINTS.orgIntegrationConnections("org-1")],
      [
        "POST",
        ADMIN_ENDPOINTS.orgIntegrationConnectionTest("org-1", "connection-1"),
      ],
      ["POST", ADMIN_ENDPOINTS.orgIntegrationSync("org-1", "connection-1")],
      ["GET", ADMIN_ENDPOINTS.orgIntegrationSyncRuns("org-1")],
      [
        "POST",
        ADMIN_ENDPOINTS.orgIntegrationIngestCredentials(
          "org-1",
          "connection-1",
        ),
      ],
      ["GET", ADMIN_ENDPOINTS.conversationsUnread],
      ["PATCH", ADMIN_ENDPOINTS.contactRequestStatus("request-1")],
    ] as const;

    for (const [method, pathname] of apiCases) {
      expect(hasExplicitAdminApiPolicy(pathname, method)).toBe(true);
      expect(resolveAdminApiPolicy(pathname, method)).not.toBeNull();
    }
  });

  it("allows onboarding-only profiles to load the shared org workspace header endpoint", () => {
    expect(
      canAccessAdminApiPath(ADMIN_ENDPOINTS.organization("org-1"), "GET", [
        "admin:onboarding:read",
      ]),
    ).toBe(true);
  });
});
