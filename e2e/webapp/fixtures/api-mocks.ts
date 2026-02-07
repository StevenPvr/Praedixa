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
  forecastRun1: "run-1111-1111-1111-111111111111",
  decision1: "dec-1111-1111-1111-111111111111",
  decision2: "dec-2222-2222-2222-222222222222",
  decision3: "dec-3333-3333-3333-333333333333",
  decision4: "dec-4444-4444-4444-444444444444",
  decision5: "dec-5555-5555-5555-555555555555",
} as const;

// ─────────────────────────────────────────────────
// Dashboard summary
// ─────────────────────────────────────────────────

const dashboardSummary = {
  coverageHuman: 87,
  coverageMerchandise: 92,
  activeAlertsCount: 3,
  forecastAccuracy: 94,
  lastForecastDate: "2026-02-05",
};

export async function mockDashboardSummary(page: Page): Promise<void> {
  await page.route("**/api/v1/dashboard/summary*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: dashboardSummary }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────

const alerts = [
  {
    id: IDS.alert1,
    type: "risk",
    severity: "error",
    title: "Deficit critique Dept. A1",
    message:
      "La capacite humaine est en deficit de 25% pour les 7 prochains jours.",
    createdAt: "2026-02-05T10:00:00Z",
    dismissedAt: null,
  },
  {
    id: IDS.alert2,
    type: "risk",
    severity: "warning",
    title: "Risque modere Dept. B1",
    message: "La capacite marchandise risque un deficit de 12% sur 14 jours.",
    createdAt: "2026-02-04T14:30:00Z",
    dismissedAt: null,
  },
  {
    id: IDS.alert3,
    type: "forecast",
    severity: "info",
    title: "Nouvelle prevision disponible",
    message:
      "Le modele a genere de nouvelles previsions pour la semaine prochaine.",
    createdAt: "2026-02-03T09:00:00Z",
    dismissedAt: null,
  },
];

export { alerts as MOCK_ALERTS };

export async function mockAlerts(page: Page): Promise<void> {
  await page.route("**/api/v1/alerts*", (route) => {
    // Dismiss endpoint
    if (route.request().method() === "PATCH") {
      const alertId = route.request().url().split("/alerts/")[1]?.split("/")[0];
      const alert = alerts.find((a) => a.id === alertId);
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { ...alert, dismissedAt: new Date().toISOString() },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: alerts }),
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
      body: JSON.stringify({ data: sites }),
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
      body: JSON.stringify({ data: departments }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Forecasts
// ─────────────────────────────────────────────────

const forecastRuns = [
  {
    id: IDS.forecastRun1,
    status: "completed",
    accuracyScore: 94,
  },
];

const dailyForecasts = Array.from({ length: 14 }, (_, i) => ({
  forecastDate: `2026-02-${String(6 + i).padStart(2, "0")}`,
  dimension: "human",
  predictedDemand: 100 + Math.round(Math.sin(i / 2) * 20),
  predictedCapacity: 90 + Math.round(Math.cos(i / 3) * 15),
  gap: -10 + i,
  riskScore: Math.max(0, Math.min(1, 0.2 + i * 0.05)),
  confidenceLower: 80 + i,
  confidenceUpper: 110 + i,
  departmentId: i < 7 ? IDS.deptA1 : IDS.deptB1,
}));

export async function mockForecasts(page: Page): Promise<void> {
  await page.route("**/api/v1/forecasts?*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: forecastRuns }),
    }),
  );
}

export async function mockDailyForecasts(page: Page): Promise<void> {
  await page.route("**/api/v1/forecasts/*/daily*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: dailyForecasts }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Arbitrage
// ─────────────────────────────────────────────────

const arbitrageResult = {
  alertId: IDS.alert1,
  alertTitle: "Deficit critique Dept. A1",
  alertSeverity: "error",
  departmentName: "Logistique Paris",
  siteName: "Paris CDG",
  deficitPct: 25,
  horizonDays: 7,
  options: [
    {
      type: "overtime",
      label: "Heures supplementaires",
      cost: 12000,
      delayDays: 0,
      coverageImpactPct: 15,
      riskLevel: "low",
      riskDetails:
        "Risque de fatigue a moyen terme si prolonge au-dela de 2 semaines.",
      pros: ["Mise en place immediate", "Pas de recrutement"],
      cons: ["Cout eleve a long terme", "Risque de fatigue"],
    },
    {
      type: "external",
      label: "Interimaire externe",
      cost: 8500,
      delayDays: 3,
      coverageImpactPct: 20,
      riskLevel: "medium",
      riskDetails: "Delai d'integration de 3 jours avant pleine efficacite.",
      pros: ["Cout modere", "Couvre le deficit complet"],
      cons: ["Delai de 3 jours", "Formation necessaire"],
    },
    {
      type: "redistribution",
      label: "Redistribution interne",
      cost: 2000,
      delayDays: 1,
      coverageImpactPct: 10,
      riskLevel: "medium",
      riskDetails: "Impact sur les departements voisins, risque de cascade.",
      pros: ["Tres economique", "Personnel deja forme"],
      cons: ["Couverture partielle", "Impact sur autres equipes"],
    },
    {
      type: "no_action",
      label: "Aucune action",
      cost: 0,
      delayDays: 0,
      coverageImpactPct: 0,
      riskLevel: "high",
      riskDetails:
        "Le deficit de 25% persiste, risque de retard sur les engagements.",
      pros: ["Zero cout direct"],
      cons: ["Deficit non corrige", "Impact client potentiel"],
    },
  ],
  recommendationIndex: 1,
};

export async function mockArbitrageOptions(page: Page): Promise<void> {
  await page.route("**/api/v1/arbitrage/*/options*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: arbitrageResult }),
    }),
  );
}

export async function mockValidateArbitrage(
  page: Page,
  options?: { fail?: boolean },
): Promise<void> {
  await page.route("**/api/v1/arbitrage/*/validate*", (route) => {
    if (options?.fail) {
      return route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INTERNAL_ERROR",
            message: "Erreur interne du serveur",
          },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { id: IDS.decision1 } }),
    });
  });
}

// ─────────────────────────────────────────────────
// Decisions
// ─────────────────────────────────────────────────

const decisions = [
  {
    id: IDS.decision1,
    type: "external",
    priority: "high",
    status: "suggested",
    title: "Recrutement interimaire Logistique Paris",
    targetPeriod: { start: "2026-02-06", end: "2026-02-13" },
    departmentId: IDS.deptA1,
    departmentName: "Logistique Paris",
    estimatedCost: 8500,
    costOfInaction: 35000,
    confidenceScore: 87,
  },
  {
    id: IDS.decision2,
    type: "overtime",
    priority: "medium",
    status: "pending_review",
    title: "Heures sup Manutention Paris",
    targetPeriod: { start: "2026-02-07", end: "2026-02-14" },
    departmentId: IDS.deptA2,
    departmentName: "Manutention Paris",
    estimatedCost: 12000,
    costOfInaction: 20000,
    confidenceScore: 72,
  },
  {
    id: IDS.decision3,
    type: "redistribution",
    priority: "low",
    status: "approved",
    title: "Redistribution equipe Lyon",
    targetPeriod: { start: "2026-02-08", end: "2026-02-15" },
    departmentId: IDS.deptB1,
    departmentName: "Logistique Lyon",
    estimatedCost: 2000,
    costOfInaction: 10000,
    confidenceScore: 91,
  },
  {
    id: IDS.decision4,
    type: "no_action",
    priority: "low",
    status: "rejected",
    title: "Aucune action Dept B1",
    targetPeriod: { start: "2026-02-09", end: "2026-02-16" },
    departmentId: IDS.deptB1,
    departmentName: "Logistique Lyon",
    estimatedCost: 0,
    costOfInaction: 5000,
    confidenceScore: 45,
  },
  {
    id: IDS.decision5,
    type: "external",
    priority: "high",
    status: "implemented",
    title: "Interimaire urgent Paris",
    targetPeriod: { start: "2026-02-01", end: "2026-02-08" },
    departmentId: IDS.deptA1,
    departmentName: "Logistique Paris",
    estimatedCost: 9200,
    costOfInaction: 40000,
    confidenceScore: 93,
  },
];

export async function mockDecisions(page: Page): Promise<void> {
  await page.route("**/api/v1/decisions*", (route) => {
    const url = new URL(route.request().url());
    const statusesParam = url.searchParams.get("statuses");
    const pageParam = Number(url.searchParams.get("page") ?? "1");
    const pageSizeParam = Number(url.searchParams.get("pageSize") ?? "10");

    let filtered = decisions;
    if (statusesParam) {
      filtered = decisions.filter((d) => d.status === statusesParam);
    }

    const start = (pageParam - 1) * pageSizeParam;
    const paged = filtered.slice(start, start + pageSizeParam);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: paged,
        pagination: {
          page: pageParam,
          pageSize: pageSizeParam,
          total: filtered.length,
          totalPages: Math.ceil(filtered.length / pageSizeParam),
        },
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
        data: {
          id: IDS.org,
          name: "Praedixa Demo",
          slug: "praedixa-demo",
        },
      }),
    }),
  );
}

// ─────────────────────────────────────────────────
// Convenience: mock ALL API endpoints
// ─────────────────────────────────────────────────

export async function mockAllApis(page: Page): Promise<void> {
  await mockDashboardSummary(page);
  await mockAlerts(page);
  await mockSites(page);
  await mockDepartments(page);
  await mockForecasts(page);
  await mockDailyForecasts(page);
  await mockArbitrageOptions(page);
  await mockValidateArbitrage(page);
  await mockDecisions(page);
  await mockOrganization(page);
}
