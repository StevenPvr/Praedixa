import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────
// Timestamp used across all mock responses
// ─────────────────────────────────────────────────

const TS = "2026-02-07T12:00:00Z";

// ─────────────────────────────────────────────────
// Helper: wrap data in the standard ApiResponse shape
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
// Mock data
// ─────────────────────────────────────────────────

export const MOCK_ALERT_SUMMARY = {
  total: 12,
  bySeverity: { low: 3, medium: 4, high: 3, critical: 2 },
  byStatus: { open: 5, acknowledged: 3, resolved: 2, expired: 2 },
};

export const MOCK_AUDIT_ENTRIES = [
  {
    id: "audit-001",
    adminUserId: "sa-00000000-0000-0000-0000-000000000001",
    targetOrgId: "org-001",
    action: "view_org",
    resourceType: "organization",
    resourceId: "org-001",
    ipAddress: "192.168.1.1",
    userAgent: "Mozilla/5.0",
    requestId: "req-00001234-5678-aaaa-bbbb-ccccddddeeee",
    metadataJson: {},
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
    ipAddress: "10.0.0.1",
    userAgent: null,
    requestId: "req-00005678-1234-bbbb-cccc-ddddeeeeffff",
    metadataJson: {},
    severity: "high",
    createdAt: "2026-02-07T11:30:00Z",
  },
];

export const MOCK_ORG_BILLING_LIST = [
  {
    id: "org-001",
    name: "Acme Logistique",
    slug: "acme-logistique",
    status: "active",
    plan: "professional",
    contactEmail: "admin@acme-logistique.fr",
    userCount: 25,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "org-002",
    name: "Express Transport",
    slug: "express-transport",
    status: "trial",
    plan: "starter",
    contactEmail: "contact@express-transport.fr",
    userCount: 8,
    createdAt: "2026-02-01T14:00:00Z",
  },
];

export const MOCK_ONBOARDING_LIST = [
  {
    id: "onb-001",
    organizationId: "org-00112233-4455-6677-8899-aabbccddeeff",
    status: "in_progress",
    currentStep: 3,
    stepsCompleted: [1, 2, 3],
    initiatedBy: "sa-00000000-0000-0000-0000-000000000001",
    createdAt: "2026-02-01T09:00:00Z",
    completedAt: null,
  },
  {
    id: "onb-002",
    organizationId: "org-ffeeddcc-bbaa-9988-7766-554433221100",
    status: "completed",
    currentStep: 5,
    stepsCompleted: [1, 2, 3, 4, 5],
    initiatedBy: "sa-00000000-0000-0000-0000-000000000001",
    createdAt: "2026-01-20T08:00:00Z",
    completedAt: "2026-01-25T16:00:00Z",
  },
];

export const MOCK_ORG_LIST = [
  {
    id: "org-001",
    name: "Acme Logistique",
    slug: "acme-logistique",
    status: "active",
    plan: "professional",
    contactEmail: "admin@acme-logistique.fr",
    userCount: 25,
    siteCount: 4,
    createdAt: "2026-01-15T09:00:00Z",
  },
  {
    id: "org-002",
    name: "Express Transport",
    slug: "express-transport",
    status: "suspended",
    plan: "starter",
    contactEmail: "contact@express-transport.fr",
    userCount: 8,
    siteCount: 1,
    createdAt: "2026-02-01T14:00:00Z",
  },
  {
    id: "org-003",
    name: "Global Freight",
    slug: "global-freight",
    status: "trial",
    plan: "enterprise",
    contactEmail: "ops@globalfreight.com",
    userCount: 50,
    siteCount: 12,
    createdAt: "2025-12-10T11:00:00Z",
  },
];

// ─────────────────────────────────────────────────
// Per-page mock setup functions
// ─────────────────────────────────────────────────

/**
 * Alertes page: uses useApiGet on /api/v1/admin/monitoring/alerts/summary
 */
export async function mockAlertesApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/alerts/summary*", (route) =>
    fulfill(route, apiResponse(MOCK_ALERT_SUMMARY)),
  );
}

export async function mockAlertesApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/alerts/summary*", (route) =>
    fulfillError(route, "Erreur serveur alertes"),
  );
}

/**
 * Audit page: uses useApiGetPaginated on /api/v1/admin/audit-log
 */
export async function mockAuditApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(
      route,
      paginatedResponse(MOCK_AUDIT_ENTRIES, { total: 2, pageSize: 30 }),
    ),
  );
}

export async function mockAuditApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0, pageSize: 30 })),
  );
}

export async function mockAuditApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/audit-log*", (route) =>
    fulfillError(route, "Erreur serveur audit"),
  );
}

/**
 * Facturation page: uses useApiGetPaginated on /api/v1/admin/organizations
 */
export async function mockFacturationApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse(MOCK_ORG_BILLING_LIST, { total: 2 })),
  );
}

export async function mockFacturationApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0 })),
  );
}

export async function mockFacturationApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfillError(route, "Erreur serveur facturation"),
  );
}

/**
 * Onboarding page: uses useApiGetPaginated on /api/v1/admin/onboarding
 */
export async function mockOnboardingApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/onboarding*", (route) =>
    fulfill(route, paginatedResponse(MOCK_ONBOARDING_LIST, { total: 2 })),
  );
}

export async function mockOnboardingApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/onboarding*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0 })),
  );
}

export async function mockOnboardingApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/onboarding*", (route) =>
    fulfillError(route, "Erreur serveur onboarding"),
  );
}

/**
 * Organisations page: uses useApiGetPaginated on /api/v1/admin/organizations
 *
 * NOTE: shares the same endpoint as facturation but with different mock data
 * (organisations page expects siteCount field).
 */
export async function mockOrganisationsApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse(MOCK_ORG_LIST, { total: 3 })),
  );
}

export async function mockOrganisationsApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfill(route, paginatedResponse([], { total: 0 })),
  );
}

export async function mockOrganisationsApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/organizations*", (route) =>
    fulfillError(route, "Erreur serveur organisations"),
  );
}

// ─────────────────────────────────────────────────
// Batch 2 mock data
// ─────────────────────────────────────────────────

export const MOCK_COST_PARAMS_MISSING = {
  totalOrgsWithMissing: 2,
  totalMissingParams: 5,
  orgs: [
    {
      organizationId: "org-aabb1122-3344-5566-7788-99aabbccddee",
      missingTypes: [
        "overtime_hourly",
        "interim_daily",
        "penalty_understaffing",
      ],
      totalMissing: 3,
    },
    {
      organizationId: "org-11223344-5566-7788-99aa-bbccddeeff00",
      missingTypes: ["realloc_cost", "outsource_unit"],
      totalMissing: 2,
    },
  ],
};

export const MOCK_COST_PARAMS_ALL_CONFIGURED = {
  totalOrgsWithMissing: 0,
  totalMissingParams: 0,
  orgs: [],
};

export const MOCK_PROOF_PACKS_SUMMARY = {
  totalProofRecords: 156,
  totalGainNetEur: 245000,
  avgAdoptionPct: 72.5,
  orgsWithProof: 4,
  orgs: [
    {
      organizationId: "org-aabb1122-3344-5566-7788-99aabbccddee",
      totalRecords: 80,
      totalGainNetEur: 125000,
      avgAdoptionPct: 85.2,
    },
    {
      organizationId: "org-11223344-5566-7788-99aa-bbccddeeff00",
      totalRecords: 76,
      totalGainNetEur: 120000,
      avgAdoptionPct: null,
    },
  ],
};

export const MOCK_SCENARIOS_SUMMARY = {
  totalScenarios: 340,
  paretoOptimalCount: 48,
  recommendedCount: 22,
  byType: [
    { optionType: "hs", count: 120 },
    { optionType: "interim", count: 95 },
    { optionType: "realloc_intra", count: 60 },
    { optionType: "outsource", count: 65 },
  ],
};

// ─────────────────────────────────────────────────
// Batch 2 per-page mock setup functions
// ─────────────────────────────────────────────────

/**
 * Parametres page: uses useApiGet on /api/v1/admin/monitoring/cost-params/missing
 */
export async function mockParametresApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse(MOCK_COST_PARAMS_MISSING)),
  );
}

export async function mockParametresApisAllConfigured(
  page: Page,
): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfill(route, apiResponse(MOCK_COST_PARAMS_ALL_CONFIGURED)),
  );
}

export async function mockParametresApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/cost-params/missing*", (route) =>
    fulfillError(route, "Erreur serveur parametres"),
  );
}

/**
 * Proof Packs page: uses useApiGet on /api/v1/admin/monitoring/proof-packs/summary
 */
export async function mockProofPacksApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/proof-packs/summary*", (route) =>
    fulfill(route, apiResponse(MOCK_PROOF_PACKS_SUMMARY)),
  );
}

export async function mockProofPacksApisNoAdoption(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/proof-packs/summary*", (route) =>
    fulfill(
      route,
      apiResponse({
        ...MOCK_PROOF_PACKS_SUMMARY,
        avgAdoptionPct: null,
        orgs: [],
      }),
    ),
  );
}

export async function mockProofPacksApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/proof-packs/summary*", (route) =>
    fulfillError(route, "Erreur serveur proof packs"),
  );
}

/**
 * Scenarios page: uses useApiGet on /api/v1/admin/monitoring/scenarios/summary
 */
export async function mockScenariosApis(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/scenarios/summary*", (route) =>
    fulfill(route, apiResponse(MOCK_SCENARIOS_SUMMARY)),
  );
}

export async function mockScenariosApisEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/scenarios/summary*", (route) =>
    fulfill(
      route,
      apiResponse({
        totalScenarios: 0,
        paretoOptimalCount: 0,
        recommendedCount: 0,
        byType: [],
      }),
    ),
  );
}

export async function mockScenariosApisError(page: Page): Promise<void> {
  await page.route("**/api/v1/admin/monitoring/scenarios/summary*", (route) =>
    fulfillError(route, "Erreur serveur scenarios"),
  );
}
