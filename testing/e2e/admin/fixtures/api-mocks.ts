import type { Page } from "@playwright/test";

const TIMESTAMP = "2026-02-07T12:00:00Z";

export const MOCK_ORG_LIST = [
  {
    id: "org-001",
    name: "Acme Logistique",
    slug: "acme-logistique",
    status: "active",
    plan: "starter",
    contactEmail: "ops@acme-logistique.example",
    userCount: 18,
    siteCount: 4,
    createdAt: "2026-01-05T09:00:00Z",
  },
  {
    id: "org-002",
    name: "Express Transport",
    slug: "express-transport",
    status: "trial",
    plan: "professional",
    contactEmail: "pilot@express-transport.example",
    userCount: 11,
    siteCount: 2,
    createdAt: "2026-01-21T11:00:00Z",
  },
  {
    id: "org-003",
    name: "Global Freight",
    slug: "global-freight",
    status: "suspended",
    plan: "enterprise",
    contactEmail: "finance@global-freight.example",
    userCount: 27,
    siteCount: 6,
    createdAt: "2025-12-18T08:30:00Z",
  },
] as const;

export const MOCK_AUDIT_ENTRIES = [
  {
    id: "audit-001",
    adminUserId: "sa-00000000-0000-0000-0000-000000000001",
    targetOrgId: "org-001",
    action: "view_org",
    resourceType: "organization",
    resourceId: "org-001",
    ipAddress: "203.0.113.10",
    userAgent: "Playwright",
    requestId: "req-audit-001",
    metadataJson: { source: "e2e" },
    severity: "low",
    createdAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "audit-002",
    adminUserId: "sa-00000000-0000-0000-0000-000000000001",
    targetOrgId: "org-002",
    action: "suspend_org",
    resourceType: "organization",
    resourceId: "org-002",
    ipAddress: "203.0.113.11",
    userAgent: "Playwright",
    requestId: "req-audit-002",
    metadataJson: { source: "e2e" },
    severity: "high",
    createdAt: "2026-02-07T11:30:00Z",
  },
] as const;

export const MOCK_ONBOARDING_LIST = [
  {
    id: "onb-001",
    organizationId: "org-001",
    status: "running",
    currentStep: 2,
    stepsCompleted: [1],
    initiatedBy: "sa-00000000-0000-0000-0000-000000000001",
    createdAt: "2026-02-06T08:00:00Z",
    completedAt: null,
  },
  {
    id: "onb-002",
    organizationId: "org-002",
    status: "completed",
    currentStep: 5,
    stepsCompleted: [1, 2, 3, 4, 5],
    initiatedBy: "sa-00000000-0000-0000-0000-000000000001",
    createdAt: "2026-02-01T08:00:00Z",
    completedAt: "2026-02-03T18:00:00Z",
  },
] as const;

export const MOCK_COST_PARAMS_MISSING = {
  totalOrgsWithMissing: 1,
  totalMissingParams: 2,
  orgs: [
    {
      organizationId: "org-003",
      missingTypes: ["c_int", "c_interim"],
      totalMissing: 2,
    },
  ],
} as const;

export const MOCK_COST_PARAMS_ALL_CONFIGURED = {
  totalOrgsWithMissing: 0,
  totalMissingParams: 0,
  orgs: [],
} as const;

function apiResponse(data: unknown) {
  return { success: true, data, timestamp: TIMESTAMP };
}

function paginatedResponse(data: unknown[]) {
  return {
    success: true,
    data,
    pagination: {
      total: data.length,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
    timestamp: TIMESTAMP,
  };
}

export async function mockAdminShellApis(page: Page): Promise<void> {
  await page.route("**/api/v1/**", (route) => {
    const { pathname } = new URL(route.request().url());

    if (pathname.startsWith("/api/v1/admin/monitoring/platform")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiResponse({
            totalOrganizations: 12,
            activeOrganizations: 10,
            totalUsers: 245,
            ingestionSuccessRate: 97.8,
            apiErrorRate: 0.3,
          }),
        ),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/alerts/by-org")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          apiResponse({ organizations: [], totalAlerts: 0 }),
        ),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/cost-params/missing")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse(MOCK_COST_PARAMS_ALL_CONFIGURED)),
      });
    }

    if (pathname.startsWith("/api/v1/admin/monitoring/decisions/adoption")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse({ organizations: [] })),
      });
    }

    if (pathname.startsWith("/api/v1/admin/conversations/unread-count")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(apiResponse({ total: 0, byOrg: [] })),
      });
    }

    if (pathname.startsWith("/api/v1/admin/audit-log")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([...MOCK_AUDIT_ENTRIES])),
      });
    }

    if (pathname.startsWith("/api/v1/admin/organizations")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([...MOCK_ORG_LIST])),
      });
    }

    if (pathname.startsWith("/api/v1/admin/onboarding")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(paginatedResponse([...MOCK_ONBOARDING_LIST])),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(apiResponse([])),
    });
  });
}
