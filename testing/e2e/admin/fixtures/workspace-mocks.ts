import type { Page } from "@playwright/test";

export const TEST_ORG_ID = "org-001";

const TS = "2026-02-07T12:00:00Z";

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

// ── OrgDetail (required by layout) ──────────────────

export const MOCK_ORG_DETAIL = {
  id: TEST_ORG_ID,
  name: "Acme Logistique",
  slug: "acme-logistique",
  status: "active",
  plan: "professional",
  contactEmail: "admin@acme-logistique.fr",
  sites: [
    {
      id: "site-001",
      name: "Lyon-Sat",
      code: "LYS",
      departments: [{ id: "dept-001", name: "Logistique" }],
    },
    {
      id: "site-002",
      name: "Paris-CDG",
      code: "CDG",
      departments: [{ id: "dept-002", name: "Manutention" }],
    },
  ],
};

/** Must be called in EVERY workspace test — the layout needs OrgDetail to render */
export async function mockOrgDetail(page: Page): Promise<void> {
  await page.route(`**/api/v1/admin/organizations/${TEST_ORG_ID}`, (route) => {
    // Only match exact org detail, not sub-routes
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/admin/organizations/${TEST_ORG_ID}`) {
      return fulfill(route, apiResponse(MOCK_ORG_DETAIL));
    }
    return route.fallback();
  });
  // Also mock hierarchy for SiteTree
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/hierarchy*`,
    (route) => fulfill(route, apiResponse(MOCK_ORG_DETAIL.sites)),
  );
}

export async function mockOrgDetailError(page: Page): Promise<void> {
  await page.route(`**/api/v1/admin/organizations/${TEST_ORG_ID}`, (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === `/api/v1/admin/organizations/${TEST_ORG_ID}`) {
      return fulfillError(route, "Organisation introuvable");
    }
    return route.fallback();
  });
}

// ── Vue Client ──────────────────

export const MOCK_MIRROR_DATA = {
  coverageHuman: 87.3,
  activeAlertsCount: 5,
  lastForecastDate: "2026-02-07",
  ingestionSuccessRate: 96.5,
  avgAbsenceRate: 5.2,
};

export const MOCK_BILLING_DATA = {
  plan: "professional",
  monthlyFee: 2500,
  activeSince: "2026-01-15",
  nextBillingDate: "2026-03-15",
  paymentStatus: "current",
};

export async function mockVueClientApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/monitoring/organizations/${TEST_ORG_ID}/mirror*`,
    (route) => fulfill(route, apiResponse(MOCK_MIRROR_DATA)),
  );
  await page.route(
    `**/api/v1/admin/billing/organizations/${TEST_ORG_ID}*`,
    (route) => fulfill(route, apiResponse(MOCK_BILLING_DATA)),
  );
  // Mock suspend/reactivate endpoints
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/suspend*`,
    (route) => fulfill(route, apiResponse({ status: "suspended" })),
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/reactivate*`,
    (route) => fulfill(route, apiResponse({ status: "active" })),
  );
}

// ── Donnees ──────────────────

export const MOCK_CANONICAL_DATA = [
  {
    id: "can-001",
    siteId: "Lyon-Sat",
    date: "2026-02-07",
    shift: "am",
    capacitePlanH: 120,
    realiseH: 112,
    absH: 8,
  },
  {
    id: "can-002",
    siteId: "Paris-CDG",
    date: "2026-02-07",
    shift: "pm",
    capacitePlanH: 95,
    realiseH: 91,
    absH: 4,
  },
];

export const MOCK_QUALITY_DATA = {
  totalRecords: 54000,
  coveragePct: 87.3,
  sites: ["Lyon-Sat", "Paris-CDG"],
  missingShiftsPct: 2.1,
};

export const MOCK_INGESTION_LOG = [
  {
    id: "ing-001",
    fileName: "planning_feb.csv",
    status: "completed",
    rowsProcessed: 1200,
    createdAt: TS,
  },
  {
    id: "ing-002",
    fileName: "absences_feb.xlsx",
    status: "failed",
    rowsProcessed: 0,
    errorMessage: "Invalid format",
    createdAt: TS,
  },
];

export async function mockDonneesApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/canonical/quality*`,
    (route) => fulfill(route, apiResponse(MOCK_QUALITY_DATA)),
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/canonical*`,
    (route) => {
      const url = new URL(route.request().url());
      if (
        url.pathname.endsWith("/canonical") ||
        url.pathname.endsWith("/canonical/")
      ) {
        return fulfill(route, apiResponse(MOCK_CANONICAL_DATA));
      }
      return route.fallback();
    },
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/ingestion-log*`,
    (route) => fulfill(route, apiResponse(MOCK_INGESTION_LOG)),
  );
}

// ── Previsions ──────────────────

export const MOCK_SCENARIOS = [
  {
    id: "scn-001",
    name: "Scenario base",
    type: "baseline",
    status: "completed",
    createdAt: TS,
  },
  {
    id: "scn-002",
    name: "Scenario optimiste",
    type: "custom",
    status: "running",
    createdAt: TS,
  },
];

export const MOCK_ML_MONITORING_SUMMARY = {
  modelVersion: "sarimax-v12",
  mape: 8.7,
  mae: 4.1,
  driftScore: 0.12,
  status: "healthy" as const,
  lastTrainingAt: TS,
};

export const MOCK_ML_MONITORING_DRIFT = [
  {
    id: "drift-001",
    feature: "abs_h",
    driftScore: 0.14,
    pValue: 0.0123,
    detectedAt: TS,
  },
  {
    id: "drift-002",
    feature: "realise_h",
    driftScore: 0.08,
    pValue: 0.1042,
    detectedAt: TS,
  },
];

export async function mockPrevisionsApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/scenarios*`,
    (route) => fulfill(route, apiResponse(MOCK_SCENARIOS)),
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/ml-monitoring/summary*`,
    (route) => fulfill(route, apiResponse(MOCK_ML_MONITORING_SUMMARY)),
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/ml-monitoring/drift*`,
    (route) => fulfill(route, apiResponse(MOCK_ML_MONITORING_DRIFT)),
  );
}

// ── Alertes ──────────────────

export const MOCK_ORG_ALERTS = [
  {
    id: "alert-001",
    date: "2026-02-10",
    type: "coverage",
    severity: "CRITICAL",
    siteName: "Lyon-Sat",
    status: "open",
    message: "Couverture insuffisante",
  },
  {
    id: "alert-002",
    date: "2026-02-11",
    type: "absence",
    severity: "WARNING",
    siteName: "Paris-CDG",
    status: "open",
    message: "Pic absences",
  },
  {
    id: "alert-003",
    date: "2026-02-12",
    type: "forecast",
    severity: "INFO",
    siteName: "Lyon-Sat",
    status: "acknowledged",
    message: "Deviation prevision",
  },
];

export async function mockAlertesApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/alerts*`,
    (route) => fulfill(route, apiResponse(MOCK_ORG_ALERTS)),
  );
}

// ── Config ──────────────────

export const MOCK_ORG_COST_PARAMS = [
  {
    id: "cp-001",
    category: "c_int",
    value: 25,
    effectiveFrom: "2026-01-01",
    siteName: null,
  },
  {
    id: "cp-002",
    category: "maj_hs",
    value: 1.25,
    effectiveFrom: "2026-01-15",
    siteName: "Lyon-Sat",
  },
];

export const MOCK_ORG_PROOF_PACKS = [
  { id: "pp-001", name: "Pack Lyon Jan", status: "generated", generatedAt: TS },
  { id: "pp-002", name: "Pack CDG Jan", status: "pending", generatedAt: null },
];

export async function mockConfigApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/cost-params*`,
    (route) => fulfill(route, apiResponse(MOCK_ORG_COST_PARAMS)),
  );
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/proof-packs*`,
    (route) => fulfill(route, apiResponse(MOCK_ORG_PROOF_PACKS)),
  );
}

// ── Equipe ──────────────────

export const MOCK_ORG_USERS = [
  {
    id: "usr-001",
    fullName: "Alice Dupont",
    email: "alice@acme.fr",
    role: "org_admin",
    status: "active",
    lastLoginAt: TS,
  },
  {
    id: "usr-002",
    fullName: "Bob Martin",
    email: "bob@acme.fr",
    role: "manager",
    status: "active",
    lastLoginAt: null,
  },
  {
    id: "usr-003",
    fullName: "Carol Leroy",
    email: "carol@acme.fr",
    role: "viewer",
    status: "deactivated",
    lastLoginAt: TS,
  },
];

export async function mockEquipeApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/users*`,
    (route) => {
      if (route.request().method() === "POST") {
        return fulfill(
          route,
          apiResponse({
            id: "usr-new",
            email: "new@acme.fr",
            role: "viewer",
            status: "invited",
          }),
        );
      }
      return fulfill(route, apiResponse(MOCK_ORG_USERS));
    },
  );
}

// ── Messages ──────────────────

export const MOCK_ORG_CONVERSATIONS = [
  {
    id: "conv-001",
    organizationId: TEST_ORG_ID,
    subject: "Question facturation",
    status: "open",
    initiatedBy: "client",
    lastMessageAt: TS,
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: "conv-002",
    organizationId: TEST_ORG_ID,
    subject: "Probleme import",
    status: "resolved",
    initiatedBy: "admin",
    lastMessageAt: TS,
    createdAt: TS,
    updatedAt: TS,
  },
];

export const MOCK_CONV_MESSAGES = [
  {
    id: "msg-001",
    conversationId: "conv-001",
    senderUserId: "usr-001",
    senderRole: "org_admin",
    content: "Bonjour, question sur la facture",
    isRead: true,
    createdAt: TS,
    updatedAt: TS,
  },
  {
    id: "msg-002",
    conversationId: "conv-001",
    senderUserId: "sa-00000000-0000-0000-0000-000000000001",
    senderRole: "super_admin",
    content: "Bonjour, nous regardons cela",
    isRead: true,
    createdAt: TS,
    updatedAt: TS,
  },
];

export async function mockMessagesApis(page: Page): Promise<void> {
  await mockOrgDetail(page);
  await page.route(
    `**/api/v1/admin/organizations/${TEST_ORG_ID}/conversations*`,
    (route) => fulfill(route, apiResponse(MOCK_ORG_CONVERSATIONS)),
  );
  await page.route(
    "**/api/v1/admin/conversations/conv-001/messages*",
    (route) => fulfill(route, apiResponse(MOCK_CONV_MESSAGES)),
  );
  await page.route(
    "**/api/v1/admin/conversations/conv-002/messages*",
    (route) => fulfill(route, apiResponse([])),
  );
  // Mock status patch
  await page.route("**/api/v1/admin/conversations/conv-001", (route) => {
    if (route.request().method() === "PATCH") {
      return fulfill(
        route,
        apiResponse({ id: "conv-001", status: "resolved" }),
      );
    }
    return route.fallback();
  });
}

// ── Catch-all for unmatched API routes ──────────────

export async function mockCatchAll(page: Page): Promise<void> {
  await page.route("**/api/v1/**", (route) => {
    return fulfill(route, apiResponse([]));
  });
}
