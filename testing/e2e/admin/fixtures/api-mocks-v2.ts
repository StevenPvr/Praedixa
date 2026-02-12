import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────
// Timestamp used across all mock responses
// ─────────────────────────────────────────────────

const TS = "2026-02-07T12:00:00Z";

// ─────────────────────────────────────────────────
// Helpers (same pattern as api-mocks.ts)
// ─────────────────────────────────────────────────

function apiResponse<T>(data: T) {
  return { success: true, data, timestamp: TS };
}

function paginatedResponse<T>(
  data: T[],
  opts: { total?: number; page?: number; pageSize?: number } = {},
) {
  const total = opts.total ?? data.length;
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    timestamp: TS,
  };
}

function fulfill(
  route: { fulfill: (opts: object) => Promise<void> },
  body: unknown,
) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function fulfillError(
  route: { fulfill: (opts: object) => Promise<void> },
  message: string,
) {
  return route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({
      success: false,
      error: { code: "INTERNAL_ERROR", message },
      timestamp: TS,
    }),
  });
}

// ─────────────────────────────────────────────────
// Re-export data from existing api-mocks.ts
// ─────────────────────────────────────────────────

export {
  MOCK_ORG_LIST,
  MOCK_AUDIT_ENTRIES,
  MOCK_ONBOARDING_LIST,
  MOCK_COST_PARAMS_MISSING,
  MOCK_COST_PARAMS_ALL_CONFIGURED,
} from "./api-mocks";

// ─────────────────────────────────────────────────
// Mock data — Accueil page
// ─────────────────────────────────────────────────

export const MOCK_PLATFORM_KPIS = {
  totalOrganizations: 12,
  activeOrganizations: 10,
  totalUsers: 245,
  avgAdoptionRate: 72.5,
  ingestionSuccessRate: 97.8,
  apiErrorRate: 0.3,
};

export const MOCK_ALERTS_BY_ORG = {
  organizations: [
    {
      orgId: "org-001",
      orgName: "Acme Logistique",
      critical: 2,
      high: 1,
      medium: 3,
      low: 1,
      total: 7,
    },
    {
      orgId: "org-002",
      orgName: "Express Transport",
      critical: 0,
      high: 2,
      medium: 1,
      low: 0,
      total: 3,
    },
  ],
  totalAlerts: 10,
};

export const MOCK_COST_PARAMS_MISSING_V2 = {
  organizations: [
    {
      orgId: "org-003",
      orgName: "Global Freight",
      missingSites: 3,
      totalSites: 5,
    },
  ],
};

export const MOCK_DECISIONS_ADOPTION = {
  organizations: [
    {
      orgId: "org-004",
      orgName: "Swift Deliveries",
      adoptionRate: 35,
      totalDecisions: 28,
    },
    {
      orgId: "org-005",
      orgName: "NordLog",
      adoptionRate: 82,
      totalDecisions: 45,
    },
  ],
};

export const MOCK_UNREAD_COUNT = {
  total: 14,
  byOrg: [
    { orgId: "org-001", orgName: "Acme Logistique", count: 8 },
    { orgId: "org-002", orgName: "Express Transport", count: 3 },
    { orgId: "org-006", orgName: "Metro Logistics", count: 3 },
  ],
};

export const MOCK_AUDIT_ENTRIES_ACCUEIL = [
  {
    id: "audit-a1",
    adminUserId: "sa-00000000-0000-0000-0000-000000000001",
    action: "view_org",
    resourceType: "organization",
    severity: "low",
    createdAt: "2026-02-07T10:00:00Z",
    targetOrgId: "org-001",
  },
  {
    id: "audit-a2",
    adminUserId: "sa-00000000-0000-0000-0000-000000000001",
    action: "suspend_org",
    resourceType: "organization",
    severity: "high",
    createdAt: "2026-02-07T11:30:00Z",
    targetOrgId: "org-002",
  },
];

// ─────────────────────────────────────────────────
// Accueil page mocks
// ─────────────────────────────────────────────────

export async function mockAccueilApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/platform*", (route) =>
    fulfill(route, apiResponse(MOCK_PLATFORM_KPIS)),
  );
  await page.route("**/api/v1/admin/monitoring/alerts/by-org*", (route) =>
    fulfill(route, apiResponse(MOCK_ALERTS_BY_ORG)),
  );
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse(MOCK_COST_PARAMS_MISSING_V2)),
  );
  await page.route("**/api/v1/admin/monitoring/decisions/adoption*", (route) =>
    fulfill(route, apiResponse(MOCK_DECISIONS_ADOPTION)),
  );
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(
      route,
      paginatedResponse(MOCK_AUDIT_ENTRIES_ACCUEIL, {
        total: 2,
        pageSize: 10,
      }),
    ),
  );
  await page.route("**/api/v1/admin/conversations/unread-count*", (route) =>
    fulfill(route, apiResponse(MOCK_UNREAD_COUNT)),
  );
}

export async function mockAccueilApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/platform*", (route) =>
    fulfillError(route, "Erreur serveur KPIs"),
  );
  await page.route("**/api/v1/admin/monitoring/alerts/by-org*", (route) =>
    fulfill(route, apiResponse({ organizations: [], totalAlerts: 0 })),
  );
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse({ organizations: [] })),
  );
  await page.route("**/api/v1/admin/monitoring/decisions/adoption*", (route) =>
    fulfill(route, apiResponse({ organizations: [] })),
  );
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0, pageSize: 10 })),
  );
  await page.route("**/api/v1/admin/conversations/unread-count*", (route) =>
    fulfill(route, apiResponse({ total: 0, byOrg: [] })),
  );
}

export async function mockAccueilApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/platform*", (route) =>
    fulfill(
      route,
      apiResponse({
        totalOrganizations: 5,
        activeOrganizations: 5,
        totalUsers: 100,
        avgAdoptionRate: 80,
        ingestionSuccessRate: 99.5,
        apiErrorRate: 0.1,
      }),
    ),
  );
  await page.route("**/api/v1/admin/monitoring/alerts/by-org*", (route) =>
    fulfill(route, apiResponse({ organizations: [], totalAlerts: 0 })),
  );
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse({ organizations: [] })),
  );
  await page.route("**/api/v1/admin/monitoring/decisions/adoption*", (route) =>
    fulfill(
      route,
      apiResponse({
        organizations: [
          {
            orgId: "org-ok",
            orgName: "Good Co",
            adoptionRate: 75,
            totalDecisions: 50,
          },
        ],
      }),
    ),
  );
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0, pageSize: 10 })),
  );
  await page.route("**/api/v1/admin/conversations/unread-count*", (route) =>
    fulfill(route, apiResponse({ total: 0, byOrg: [] })),
  );
}

// ─────────────────────────────────────────────────
// Clients page mocks
// ─────────────────────────────────────────────────

// Import MOCK_ORG_LIST from re-export above
import { MOCK_ORG_LIST as _MOCK_ORG_LIST } from "./api-mocks";

export async function mockClientsApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse(_MOCK_ORG_LIST, { total: 3 })),
  );
}

export async function mockClientsApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0 })),
  );
}

export async function mockClientsApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfillError(route, "Erreur serveur organisations"),
  );
}

// ─────────────────────────────────────────────────
// Journal page mocks
// ─────────────────────────────────────────────────

import { MOCK_AUDIT_ENTRIES as _MOCK_AUDIT_ENTRIES } from "./api-mocks";

export async function mockJournalApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(
      route,
      paginatedResponse(_MOCK_AUDIT_ENTRIES, { total: 2, pageSize: 30 }),
    ),
  );
}

export async function mockJournalApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0, pageSize: 30 })),
  );
}

export async function mockJournalApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfillError(route, "Erreur serveur audit"),
  );
}

// ─────────────────────────────────────────────────
// Parametres page mocks
// ─────────────────────────────────────────────────

import {
  MOCK_ONBOARDING_LIST as _MOCK_ONBOARDING_LIST,
  MOCK_COST_PARAMS_MISSING as _MOCK_COST_PARAMS_MISSING,
} from "./api-mocks";

export async function mockParametresApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/onboarding*", (route) =>
    fulfill(route, paginatedResponse(_MOCK_ONBOARDING_LIST, { total: 2 })),
  );
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse(_MOCK_COST_PARAMS_MISSING)),
  );
}

export async function mockParametresApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/onboarding*", (route) =>
    fulfillError(route, "Erreur serveur onboarding"),
  );
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfillError(route, "Erreur serveur config"),
  );
}
