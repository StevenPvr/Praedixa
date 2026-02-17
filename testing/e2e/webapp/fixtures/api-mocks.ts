import type { Page } from "@playwright/test";

// ─────────────────────────────────────────────────
// Consistent IDs used across all mocks
// ─────────────────────────────────────────────────

export const IDS = {
  org: "org-00000000-0000-0000-0000-000000000001",
  siteA: "site-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  siteB: "site-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  deptA1: "dept-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
  deptA2: "dept-a2a2-a2a2-a2a2-a2a2a2a2a2a2",
  deptB1: "dept-b1b1-b1b1-b1b1-b1b1b1b1b1b1",
  alert1: "alert-1111-1111-1111-111111111111",
  alert2: "alert-2222-2222-2222-222222222222",
  alert3: "alert-3333-3333-3333-333333333333",
  alert4: "alert-4444-4444-4444-444444444444",
  alert5: "alert-5555-5555-5555-555555555555",
  scenarioOpt1: "opt-1111-1111-1111-111111111111",
  scenarioOpt2: "opt-2222-2222-2222-222222222222",
  scenarioOpt3: "opt-3333-3333-3333-333333333333",
  scenarioOpt4: "opt-4444-4444-4444-444444444444",
  decision1: "dec-1111-1111-1111-111111111111",
  decision2: "dec-2222-2222-2222-222222222222",
  decision3: "dec-3333-3333-3333-333333333333",
  decision4: "dec-4444-4444-4444-444444444444",
  costParam1: "cp-1111-1111-1111-111111111111",
  costParam2: "cp-2222-2222-2222-222222222222",
  proofPack1: "pp-1111-1111-1111-111111111111",
  proofPack2: "pp-2222-2222-2222-222222222222",
} as const;

const NOW = "2026-02-07T12:00:00Z";

// ─────────────────────────────────────────────────
// Coverage Alerts
// ─────────────────────────────────────────────────

const coverageAlerts = [
  {
    id: IDS.alert1,
    organizationId: IDS.org,
    siteId: "Lyon-Sat",
    alertDate: "2026-02-10",
    shift: "am",
    horizon: "j7",
    pRupture: 0.72,
    gapH: 14,
    impactEur: 3500,
    severity: "critical",
    status: "open",
    driversJson: ["Absenteisme", "Surcharge"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.alert2,
    organizationId: IDS.org,
    siteId: "Paris-CDG",
    alertDate: "2026-02-11",
    shift: "pm",
    horizon: "j7",
    pRupture: 0.55,
    gapH: 8,
    impactEur: 2000,
    severity: "high",
    status: "open",
    driversJson: ["Conges"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.alert3,
    organizationId: IDS.org,
    siteId: "Marseille",
    alertDate: "2026-02-09",
    shift: "am",
    horizon: "j3",
    pRupture: 0.35,
    gapH: 4,
    impactEur: 800,
    severity: "medium",
    status: "open",
    driversJson: ["Formation"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.alert4,
    organizationId: IDS.org,
    siteId: "Lyon-Sat",
    alertDate: "2026-02-15",
    shift: "pm",
    horizon: "j14",
    pRupture: 0.25,
    gapH: 6,
    severity: "low",
    status: "open",
    driversJson: ["Saisonnier"],
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.alert5,
    organizationId: IDS.org,
    siteId: "Paris-CDG",
    alertDate: "2026-02-12",
    shift: "am",
    horizon: "j7",
    pRupture: 0.48,
    gapH: 10,
    severity: "medium",
    status: "open",
    driversJson: ["Absenteisme"],
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export { coverageAlerts as MOCK_COVERAGE_ALERTS };

export async function mockCoverageAlerts(page: Page): Promise<void> {
  await page.route("**/api/v1/**coverage-alerts*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== "/api/v1/coverage-alerts" &&
      url.pathname !== "/api/v1/live/coverage-alerts"
    ) {
      return route.fallback();
    }

    const horizon = url.searchParams.get("horizon");
    const siteId = url.searchParams.get("site_id");
    const status = url.searchParams.get("status");

    let filtered = [...coverageAlerts];
    if (horizon) {
      filtered = filtered.filter((a) => a.horizon === horizon);
    }
    if (siteId) {
      filtered = filtered.filter((a) => a.siteId === siteId);
    }
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: filtered,
        timestamp: NOW,
      }),
    });
  });
}

const decisionQueue = [
  {
    id: IDS.alert1,
    siteId: "Lyon-Sat",
    alertDate: "2026-02-10",
    shift: "am",
    severity: "critical",
    horizon: "j7",
    gapH: 14,
    pRupture: 0.72,
    driversJson: ["Absenteisme", "Surcharge"],
    priorityScore: 99,
    estimatedImpactEur: 3500,
    timeToBreachHours: 10,
  },
  {
    id: IDS.alert2,
    siteId: "Paris-CDG",
    alertDate: "2026-02-11",
    shift: "pm",
    severity: "high",
    horizon: "j7",
    gapH: 8,
    pRupture: 0.55,
    driversJson: ["Conges"],
    priorityScore: 82,
    estimatedImpactEur: 2000,
    timeToBreachHours: 22,
  },
  {
    id: IDS.alert3,
    siteId: "Marseille",
    alertDate: "2026-02-09",
    shift: "am",
    severity: "medium",
    horizon: "j3",
    gapH: 4,
    pRupture: 0.35,
    driversJson: ["Formation"],
    priorityScore: 68,
    estimatedImpactEur: 800,
    timeToBreachHours: 44,
  },
];

export async function mockDecisionQueue(page: Page): Promise<void> {
  await page.route("**/api/v1/coverage-alerts/queue*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: decisionQueue,
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Canonical Quality Dashboard
// ─────────────────────────────────────────────────

const canonicalQuality = {
  totalRecords: 54000,
  coveragePct: 87.3,
  sites: ["Lyon-Sat", "Paris-CDG", "Marseille"],
  dateRange: { from: "2025-01-01", to: "2026-02-07" },
  missingShiftsPct: 2.1,
  avgAbsPct: 5.8,
};

export async function mockCanonicalQuality(page: Page): Promise<void> {
  await page.route("**/api/v1/**canonical/quality*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== "/api/v1/canonical/quality" &&
      url.pathname !== "/api/v1/live/canonical/quality"
    ) {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: canonicalQuality,
        timestamp: NOW,
      }),
    });
  });
}

// ─────────────────────────────────────────────────
// Dashboard Summary
// ─────────────────────────────────────────────────

const dashboardSummary = {
  coverageHuman: 87.3,
  coverageMerchandise: 90.2,
  activeAlertsCount: 5,
  forecastAccuracy: 91.0,
  lastForecastDate: "2026-02-07",
};

export async function mockDashboardSummary(page: Page): Promise<void> {
  await page.route("**/api/v1/dashboard/summary*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: dashboardSummary,
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Canonical Records (paginated)
// ─────────────────────────────────────────────────

const canonicalRecords = [
  {
    id: "canon-001",
    siteId: "Paris CDG",
    date: "2026-02-07",
    shift: "am",
    capacitePlanH: 120,
    realiseH: 112,
    absH: 8,
    hsH: 6,
    interimH: 2,
  },
  {
    id: "canon-002",
    siteId: "Lyon Saint-Exupery",
    date: "2026-02-07",
    shift: "pm",
    capacitePlanH: 95,
    realiseH: 91,
    absH: 4,
    hsH: 3,
    interimH: 1,
  },
];

export async function mockCanonicalRecords(page: Page): Promise<void> {
  await page.route("**/api/v1/**canonical*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== "/api/v1/canonical" &&
      url.pathname !== "/api/v1/live/canonical"
    ) {
      return route.fallback();
    }

    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(url.searchParams.get("page_size") ?? "20");

    const total = canonicalRecords.length;
    const start = (pageParam - 1) * pageSizeParam;
    const paged = canonicalRecords.slice(start, start + pageSizeParam);
    const totalPages = Math.max(1, Math.ceil(total / pageSizeParam));

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: paged,
        pagination: {
          total,
          page: pageParam,
          pageSize: pageSizeParam,
          totalPages,
          hasNextPage: pageParam < totalPages,
          hasPreviousPage: pageParam > 1,
        },
        timestamp: NOW,
      }),
    });
  });
}

// ─────────────────────────────────────────────────
// Forecast runs + daily series
// ─────────────────────────────────────────────────

const forecastRuns = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    modelType: "sarimax",
    horizonDays: 14,
    status: "completed",
    accuracyScore: 0.91,
    startedAt: "2026-02-06T08:00:00Z",
    completedAt: "2026-02-06T08:15:00Z",
  },
];

const forecastDailyHuman = [
  {
    forecastDate: "2026-02-08",
    predictedDemand: 118,
    predictedCapacity: 120,
    capacityPlannedCurrent: 115,
    capacityPlannedPredicted: 119,
    capacityOptimalPredicted: 122,
    gap: 3,
    riskScore: 0.18,
    confidenceLower: 108,
    confidenceUpper: 128,
  },
  {
    forecastDate: "2026-02-09",
    predictedDemand: 122,
    predictedCapacity: 123,
    capacityPlannedCurrent: 117,
    capacityPlannedPredicted: 121,
    capacityOptimalPredicted: 125,
    gap: 4,
    riskScore: 0.21,
    confidenceLower: 111,
    confidenceUpper: 133,
  },
  {
    forecastDate: "2026-02-10",
    predictedDemand: 126,
    predictedCapacity: 124,
    capacityPlannedCurrent: 118,
    capacityPlannedPredicted: 123,
    capacityOptimalPredicted: 127,
    gap: 4,
    riskScore: 0.24,
    confidenceLower: 114,
    confidenceUpper: 136,
  },
];

const forecastDailyMerchandise = forecastDailyHuman.map((d) => ({
  ...d,
  predictedDemand: d.predictedDemand + 10,
  predictedCapacity: d.predictedCapacity + 8,
  capacityPlannedCurrent: d.capacityPlannedCurrent + 9,
  capacityPlannedPredicted: d.capacityPlannedPredicted + 8,
  capacityOptimalPredicted: d.capacityOptimalPredicted + 7,
}));

export async function mockForecasts(page: Page): Promise<void> {
  await page.route("**/api/v1/**forecasts*", (route) => {
    const url = new URL(route.request().url());
    const { pathname, searchParams } = url;
    const dimension = searchParams.get("dimension") ?? "human";
    const series =
      dimension === "merchandise"
        ? forecastDailyMerchandise
        : forecastDailyHuman;

    if (pathname === "/api/v1/live/forecasts/latest/daily") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: series.map((row) => ({
            ...row,
            dimension,
          })),
          timestamp: NOW,
        }),
      });
    }

    if (
      pathname.startsWith("/api/v1/forecasts/") &&
      pathname.endsWith("/daily")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: series,
          timestamp: NOW,
        }),
      });
    }

    if (pathname === "/api/v1/live/forecasts") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: forecastRuns,
          timestamp: NOW,
        }),
      });
    }

    if (pathname === "/api/v1/forecasts") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: forecastRuns,
          pagination: {
            total: forecastRuns.length,
            page: 1,
            pageSize: Number(searchParams.get("page_size") ?? "50"),
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          timestamp: NOW,
        }),
      });
    }

    return route.fallback();
  });
}

// ─────────────────────────────────────────────────
// Scenario Options (Pareto frontier)
// ─────────────────────────────────────────────────

const scenarioOptions = [
  {
    id: IDS.scenarioOpt1,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert1,
    costParameterId: IDS.costParam1,
    optionType: "hs",
    label: "Heures supplementaires",
    coutTotalEur: 2800,
    serviceAttenduPct: 85.0,
    heuresCouvertes: 10,
    isParetoOptimal: true,
    isRecommended: false,
    contraintesJson: {},
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.scenarioOpt2,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert1,
    costParameterId: IDS.costParam1,
    optionType: "interim",
    label: "Interim externe",
    coutTotalEur: 4200,
    serviceAttenduPct: 95.0,
    heuresCouvertes: 14,
    isParetoOptimal: true,
    isRecommended: true,
    contraintesJson: {},
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.scenarioOpt3,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert1,
    costParameterId: IDS.costParam1,
    optionType: "realloc_intra",
    label: "Reallocation interne",
    coutTotalEur: 1200,
    serviceAttenduPct: 78.0,
    heuresCouvertes: 8,
    isParetoOptimal: true,
    isRecommended: false,
    contraintesJson: {},
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.scenarioOpt4,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert1,
    costParameterId: IDS.costParam1,
    optionType: "service_adjust",
    label: "Ajustement service",
    coutTotalEur: 500,
    serviceAttenduPct: 65.0,
    heuresCouvertes: 4,
    isParetoOptimal: false,
    isRecommended: false,
    contraintesJson: {},
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const paretoFrontierResponse = {
  alertId: IDS.alert1,
  options: scenarioOptions,
  paretoFrontier: scenarioOptions.filter((o) => o.isParetoOptimal),
  recommended: scenarioOptions.find((o) => o.isRecommended) ?? null,
};

export async function mockDecisionWorkspace(page: Page): Promise<void> {
  await page.route("**/api/v1/decision-workspace/*", (route) => {
    const alertId = route.request().url().split("/").pop() ?? IDS.alert1;
    const alert = coverageAlerts.find((entry) => entry.id === alertId);

    if (!alert) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Alerte introuvable",
          },
          timestamp: NOW,
        }),
      });
    }

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          alert,
          options: scenarioOptions.map((option) => ({
            ...option,
            coverageAlertId: alert.id,
          })),
          recommendedOptionId:
            scenarioOptions.find((option) => option.isRecommended)?.id ?? null,
          diagnostic: {
            topDrivers: alert.driversJson,
            confidencePct: 87,
            riskTrend: "worsening",
          },
        },
        timestamp: NOW,
      }),
    });
  });
}

export async function mockScenarios(page: Page): Promise<void> {
  await page.route("**/api/v1/scenarios/alert/*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: paretoFrontierResponse,
        timestamp: NOW,
      }),
    }),
  );
}

export async function mockScenariosError(page: Page): Promise<void> {
  await page.route("**/api/v1/scenarios/alert/*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Erreur interne du serveur",
        },
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Operational Decisions
// ─────────────────────────────────────────────────

const operationalDecisions = [
  {
    id: IDS.decision1,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert1,
    recommendedOptionId: IDS.scenarioOpt2,
    chosenOptionId: IDS.scenarioOpt2,
    siteId: "Lyon-Sat",
    decisionDate: "2026-02-07",
    shift: "am",
    horizon: "j7",
    gapH: 14,
    isOverride: false,
    coutAttenduEur: 4200,
    serviceAttenduPct: 95.0,
    coutObserveEur: 4100,
    serviceObservePct: 94.5,
    decidedBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.decision2,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert2,
    recommendedOptionId: IDS.scenarioOpt1,
    chosenOptionId: IDS.scenarioOpt3,
    siteId: "Paris-CDG",
    decisionDate: "2026-02-06",
    shift: "pm",
    horizon: "j7",
    gapH: 8,
    isOverride: true,
    overrideReason: "Cout trop eleve",
    coutAttenduEur: 1200,
    serviceAttenduPct: 78.0,
    coutObserveEur: null,
    serviceObservePct: null,
    decidedBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.decision3,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert3,
    recommendedOptionId: IDS.scenarioOpt1,
    chosenOptionId: IDS.scenarioOpt1,
    siteId: "Marseille",
    decisionDate: "2026-02-05",
    shift: "am",
    horizon: "j3",
    gapH: 4,
    isOverride: false,
    coutAttenduEur: 2800,
    serviceAttenduPct: 85.0,
    coutObserveEur: 2750,
    serviceObservePct: 86.2,
    decidedBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.decision4,
    organizationId: IDS.org,
    coverageAlertId: IDS.alert4,
    recommendedOptionId: IDS.scenarioOpt2,
    chosenOptionId: IDS.scenarioOpt4,
    siteId: "Lyon-Sat",
    decisionDate: "2026-02-04",
    shift: "pm",
    horizon: "j14",
    gapH: 6,
    isOverride: true,
    overrideReason: "Pas de budget",
    coutAttenduEur: 500,
    serviceAttenduPct: 65.0,
    coutObserveEur: null,
    serviceObservePct: null,
    decidedBy: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export { operationalDecisions as MOCK_OPERATIONAL_DECISIONS };

export async function mockOperationalDecisions(page: Page): Promise<void> {
  await page.route("**/api/v1/operational-decisions*", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: { id: "dec-new-0000-0000-000000000000" },
          timestamp: NOW,
        }),
      });
    }

    const url = new URL(route.request().url());
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "15");
    const horizonParam = url.searchParams.get("horizon");
    const isOverrideParam = url.searchParams.get("is_override");

    let filtered = [...operationalDecisions];
    if (horizonParam) {
      filtered = filtered.filter((d) => d.horizon === horizonParam);
    }
    if (isOverrideParam === "true") {
      filtered = filtered.filter((d) => d.isOverride);
    }

    const total = filtered.length;
    const start = (pageParam - 1) * pageSizeParam;
    const paged = filtered.slice(start, start + pageSizeParam);
    const totalPages = Math.ceil(total / pageSizeParam);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: paged,
        pagination: {
          total,
          page: pageParam,
          pageSize: pageSizeParam,
          totalPages,
          hasNextPage: pageParam < totalPages,
          hasPreviousPage: pageParam > 1,
        },
        timestamp: NOW,
      }),
    });
  });
}

export async function mockOperationalDecisionsPost(
  page: Page,
  options?: { fail?: boolean },
): Promise<void> {
  await page.route("**/api/v1/operational-decisions*", (route) => {
    if (route.request().method() !== "POST") {
      return route.fallback();
    }
    if (options?.fail) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
          timestamp: NOW,
        }),
      });
    }
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { id: "dec-new-0000-0000-000000000000" },
        timestamp: NOW,
      }),
    });
  });
}

// ─────────────────────────────────────────────────
// Sites
// ─────────────────────────────────────────────────

const sites = [
  {
    id: IDS.siteA,
    name: "Paris CDG",
    code: "CDG",
    timezone: "Europe/Paris",
    headcount: 450,
  },
  {
    id: IDS.siteB,
    name: "Lyon Saint-Exupery",
    code: "LYS",
    timezone: "Europe/Paris",
    headcount: 280,
  },
];

export { sites as MOCK_SITES };

export async function mockSites(page: Page): Promise<void> {
  await page.route("**/api/v1/sites*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: sites,
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Departments
// ─────────────────────────────────────────────────

const departments = [
  {
    id: IDS.deptA1,
    name: "Logistique Paris",
    code: "LOG-P",
    siteId: IDS.siteA,
    headcount: 120,
    minStaffingLevel: 80,
    criticalRolesCount: 5,
  },
  {
    id: IDS.deptA2,
    name: "Manutention Paris",
    code: "MAN-P",
    siteId: IDS.siteA,
    headcount: 90,
    minStaffingLevel: 75,
    criticalRolesCount: 3,
  },
  {
    id: IDS.deptB1,
    name: "Logistique Lyon",
    code: "LOG-L",
    siteId: IDS.siteB,
    headcount: 85,
    minStaffingLevel: 70,
    criticalRolesCount: 4,
  },
];

export { departments as MOCK_DEPARTMENTS };

export async function mockDepartments(page: Page): Promise<void> {
  await page.route("**/api/v1/departments*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: departments,
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Cost Parameters
// ─────────────────────────────────────────────────

const costParameters = [
  {
    id: IDS.costParam1,
    organizationId: IDS.org,
    siteId: null,
    version: 1,
    cInt: 25,
    majHs: 1.25,
    cInterim: 35,
    premiumUrgence: 1.5,
    cBacklog: 50,
    capHsShift: 4,
    capInterimSite: 20,
    leadTimeJours: 2,
    effectiveFrom: "2026-01-01",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: IDS.costParam2,
    organizationId: IDS.org,
    siteId: "Lyon-Sat",
    version: 1,
    cInt: 28,
    majHs: 1.3,
    cInterim: 38,
    premiumUrgence: 1.6,
    cBacklog: 55,
    capHsShift: 5,
    capInterimSite: 25,
    leadTimeJours: 3,
    effectiveFrom: "2026-01-15",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export async function mockCostParameters(page: Page): Promise<void> {
  await page.route("**/api/v1/cost-parameters*", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/cost-parameters/effective") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: costParameters[0],
          timestamp: NOW,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: costParameters,
        timestamp: NOW,
      }),
    });
  });
}

// ─────────────────────────────────────────────────
// Proof Packs
// ─────────────────────────────────────────────────

const proofPacks = [
  {
    id: IDS.proofPack1,
    siteId: "Lyon-Sat",
    month: "2026-01",
    coutBauEur: 120000,
    cout100Eur: 95000,
    coutReelEur: 98000,
    gainNetEur: 22000,
    serviceBauPct: 88.0,
    serviceReelPct: 93.0,
    adoptionPct: 82.5,
    alertesEmises: 15,
    alertesTraitees: 13,
  },
  {
    id: IDS.proofPack2,
    siteId: "Paris-CDG",
    month: "2026-01",
    coutBauEur: 180000,
    cout100Eur: 140000,
    coutReelEur: 155000,
    gainNetEur: 25000,
    serviceBauPct: 85.0,
    serviceReelPct: 91.0,
    adoptionPct: 76.0,
    alertesEmises: 22,
    alertesTraitees: 18,
  },
];

export async function mockProofPacks(page: Page): Promise<void> {
  await page.route("**/api/v1/**proof*", (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname !== "/api/v1/proof" &&
      url.pathname !== "/api/v1/live/proof"
    ) {
      return route.fallback();
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: proofPacks,
        timestamp: NOW,
      }),
    });
  });
}

// ─────────────────────────────────────────────────
// Organization
// ─────────────────────────────────────────────────

export async function mockOrganization(page: Page): Promise<void> {
  await page.route("**/api/v1/organization*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: IDS.org,
          name: "Praedixa Demo",
          slug: "praedixa-demo",
        },
        timestamp: NOW,
      }),
    }),
  );
}

export async function mockOrganizationMe(page: Page): Promise<void> {
  await page.route("**/api/v1/organizations/me*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          id: IDS.org,
          name: "Praedixa Demo",
          slug: "praedixa-demo",
          settings: {
            shiftDefinitions: [
              { code: "AM", start: "06:00", end: "14:00", label: "Matin" },
              {
                code: "PM",
                start: "14:00",
                end: "22:00",
                label: "Apres-midi",
              },
            ],
            workingDays: {
              monday: true,
              tuesday: true,
              wednesday: true,
              thursday: true,
              friday: true,
              saturday: false,
              sunday: false,
            },
            alertThresholds: {
              understaffingRisk: 20,
              absenceRate: 8,
              consecutiveAbsences: 3,
              forecastAccuracy: 85,
            },
          },
        },
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Conversations & Messages
// ─────────────────────────────────────────────────

export const MOCK_CONVERSATIONS = [
  {
    id: "conv-001",
    organizationId: "org-00000000-0000-0000-0000-000000000001",
    subject: "Question sur les previsions",
    status: "open" as const,
    initiatedBy: "client" as const,
    lastMessageAt: "2026-02-07T11:30:00Z",
    createdAt: "2026-02-07T10:00:00Z",
    updatedAt: "2026-02-07T11:30:00Z",
  },
  {
    id: "conv-002",
    organizationId: "org-00000000-0000-0000-0000-000000000001",
    subject: "Probleme import donnees",
    status: "resolved" as const,
    initiatedBy: "admin" as const,
    lastMessageAt: "2026-02-06T16:00:00Z",
    createdAt: "2026-02-06T09:00:00Z",
    updatedAt: "2026-02-06T16:00:00Z",
  },
];

export const MOCK_MESSAGES_CONV1 = [
  {
    id: "msg-001",
    conversationId: "conv-001",
    senderUserId: "current-user",
    senderRole: "org_admin",
    content: "Bonjour, quand les previsions seront-elles disponibles ?",
    isRead: true,
    createdAt: "2026-02-07T10:00:00Z",
    updatedAt: "2026-02-07T10:00:00Z",
  },
  {
    id: "msg-002",
    conversationId: "conv-001",
    senderUserId: "sa-00000000-0000-0000-0000-000000000001",
    senderRole: "super_admin",
    content: "Bonjour, les previsions seront disponibles demain matin.",
    isRead: true,
    createdAt: "2026-02-07T11:00:00Z",
    updatedAt: "2026-02-07T11:00:00Z",
  },
  {
    id: "msg-003",
    conversationId: "conv-001",
    senderUserId: "current-user",
    senderRole: "org_admin",
    content: "Merci pour l'information !",
    isRead: false,
    createdAt: "2026-02-07T11:30:00Z",
    updatedAt: "2026-02-07T11:30:00Z",
  },
];

export async function mockConversations(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations", (route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "conv-new",
            organizationId: "org-00000000-0000-0000-0000-000000000001",
            subject: "Nouvelle conversation",
            status: "open",
            initiatedBy: "client",
            lastMessageAt: null,
            createdAt: NOW,
            updatedAt: NOW,
          },
          timestamp: NOW,
        }),
      });
    }
    // GET list
    if (url.pathname === "/api/v1/conversations") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: MOCK_CONVERSATIONS,
          timestamp: NOW,
        }),
      });
    }
    return route.fallback();
  });
}

export async function mockConversationsEmpty(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/conversations") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: [], timestamp: NOW }),
      });
    }
    return route.fallback();
  });
}

export async function mockConversationsError(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/conversations") {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur serveur conversations",
          },
          timestamp: NOW,
        }),
      });
    }
    return route.fallback();
  });
}

export async function mockConversationMessages(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations/conv-001/messages*", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            id: "msg-new",
            conversationId: "conv-001",
            senderUserId: "current-user",
            senderRole: "org_admin",
            content: "Test",
            isRead: false,
            createdAt: NOW,
            updatedAt: NOW,
          },
          timestamp: NOW,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: MOCK_MESSAGES_CONV1,
        timestamp: NOW,
      }),
    });
  });
  await page.route("**/api/v1/conversations/conv-002/messages*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: [], timestamp: NOW }),
    }),
  );
}

export async function mockConversationMessagesError(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations/*/messages*", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Erreur serveur messages" },
        timestamp: NOW,
      }),
    }),
  );
}

export async function mockUnreadCount(page: Page): Promise<void> {
  await page.route("**/api/v1/conversations/unread-count*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { unreadCount: 3 },
        timestamp: NOW,
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Convenience: mock ALL API endpoints
// ─────────────────────────────────────────────────

export async function mockAllApis(page: Page): Promise<void> {
  // Fallback safety net for endpoints not explicitly mocked below.
  // Specific route mocks are registered after this and take precedence.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: [],
        timestamp: NOW,
      }),
    }),
  );

  await mockCoverageAlerts(page);
  await mockDecisionQueue(page);
  await mockDashboardSummary(page);
  await mockCanonicalQuality(page);
  await mockCanonicalRecords(page);
  await mockSites(page);
  await mockDepartments(page);
  await mockForecasts(page);
  await mockDecisionWorkspace(page);
  await mockScenarios(page);
  await mockOperationalDecisions(page);
  await mockCostParameters(page);
  await mockProofPacks(page);
  await mockOrganization(page);
  await mockOrganizationMe(page);
  await mockConversations(page);
  await mockConversationMessages(page);
  await mockUnreadCount(page);
}
