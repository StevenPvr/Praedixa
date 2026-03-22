import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RouteContext, RouteDefinition } from "../types.js";

vi.mock("../services/operational-scenarios.js", () => ({
  getPersistentDecisionWorkspace: vi.fn(),
  getPersistentParetoFrontierForAlert: vi.fn(),
}));

vi.mock("../services/operational-decisions.js", () => ({
  createPersistentOperationalDecision: vi.fn(),
  getPersistentOperationalDecisionOverrideStats: vi.fn(),
  listPersistentOperationalDecisions: vi.fn(),
}));

import { routes } from "../routes.js";
import {
  createPersistentOperationalDecision,
  getPersistentOperationalDecisionOverrideStats,
  listPersistentOperationalDecisions,
} from "../services/operational-decisions.js";
import {
  getPersistentDecisionWorkspace,
  getPersistentParetoFrontierForAlert,
} from "../services/operational-scenarios.js";

const mockedGetPersistentParetoFrontierForAlert = vi.mocked(
  getPersistentParetoFrontierForAlert,
);
const mockedGetPersistentDecisionWorkspace = vi.mocked(
  getPersistentDecisionWorkspace,
);
const mockedCreatePersistentOperationalDecision = vi.mocked(
  createPersistentOperationalDecision,
);
const mockedListPersistentOperationalDecisions = vi.mocked(
  listPersistentOperationalDecisions,
);
const mockedGetPersistentOperationalDecisionOverrideStats = vi.mocked(
  getPersistentOperationalDecisionOverrideStats,
);

const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const ALERT_ID = "33333333-3333-4333-8333-333333333333";
const OPTION_ID = "44444444-4444-4444-8444-444444444444";

function buildContext(input: {
  method: RouteContext["method"];
  path: string;
  params?: Record<string, string>;
  query?: string;
  body?: unknown;
}): RouteContext {
  return {
    method: input.method,
    path: input.path,
    query: new URLSearchParams(input.query ?? ""),
    requestId: "req-test",
    telemetry: {
      requestId: "req-test",
      traceId: "trace-test",
      traceparent: null,
      tracestate: null,
      runId: null,
      connectorRunId: null,
      actionId: null,
      contractVersion: null,
      organizationId: ORGANIZATION_ID,
      siteId: null,
    },
    clientIp: "127.0.0.1",
    userAgent: "vitest",
    headers: {},
    params: input.params ?? {},
    body: input.body ?? null,
    rawBody: input.body == null ? null : JSON.stringify(input.body),
    rawBodyBytes:
      input.body == null
        ? null
        : Buffer.from(JSON.stringify(input.body), "utf8"),
    user: {
      userId: USER_ID,
      email: "planner@praedixa.test",
      organizationId: ORGANIZATION_ID,
      role: "manager",
      siteIds: ["site-lyon"],
      permissions: [],
    },
  };
}

function findRoute(method: RouteDefinition["method"], template: string) {
  const route = routes.find(
    (entry) => entry.method === method && entry.template === template,
  );
  if (!route) {
    throw new Error(`Route not found: ${method} ${template}`);
  }
  return route;
}

describe("operational live routes", () => {
  beforeEach(() => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgres://postgres:postgres@127.0.0.1:5432/praedixa",
    );
    mockedGetPersistentParetoFrontierForAlert.mockReset();
    mockedGetPersistentDecisionWorkspace.mockReset();
    mockedCreatePersistentOperationalDecision.mockReset();
    mockedListPersistentOperationalDecisions.mockReset();
    mockedGetPersistentOperationalDecisionOverrideStats.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("serves persistent live scenarios with scoped access", async () => {
    mockedGetPersistentParetoFrontierForAlert.mockResolvedValue({
      alertId: ALERT_ID,
      options: [],
      paretoFrontier: [],
      recommended: null,
    });

    const route = findRoute("GET", "/api/v1/live/scenarios/alert/:alertId");
    const result = await route.handler(
      buildContext({
        method: "GET",
        path: `/api/v1/live/scenarios/alert/${ALERT_ID}`,
        params: { alertId: ALERT_ID },
        query: "site_id=site-lyon",
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(mockedGetPersistentParetoFrontierForAlert).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-lyon",
      },
    });
  });

  it("serves persistent decision workspace with scoped access", async () => {
    mockedGetPersistentDecisionWorkspace.mockResolvedValue({
      alert: {
        id: ALERT_ID,
        organizationId: ORGANIZATION_ID,
        siteId: "site-lyon",
        alertDate: "2026-03-13",
        shift: "am",
        horizon: "j7",
        pRupture: 0.7,
        gapH: 4,
        severity: "high",
        status: "open",
        driversJson: ["absence"],
        createdAt: "2026-03-13T08:00:00.000Z",
        updatedAt: "2026-03-13T08:05:00.000Z",
      },
      options: [],
      recommendedOptionId: null,
      diagnostic: { topDrivers: ["absence"] },
    });

    const route = findRoute("GET", "/api/v1/live/decision-workspace/:alertId");
    const result = await route.handler(
      buildContext({
        method: "GET",
        path: `/api/v1/live/decision-workspace/${ALERT_ID}`,
        params: { alertId: ALERT_ID },
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(mockedGetPersistentDecisionWorkspace).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      alertId: ALERT_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: null,
      },
    });
  });

  it("creates persistent operational decisions from the public request contract", async () => {
    mockedCreatePersistentOperationalDecision.mockResolvedValue({
      id: "decision-1",
      organizationId: ORGANIZATION_ID,
      coverageAlertId: ALERT_ID,
      chosenOptionId: OPTION_ID,
      siteId: "site-lyon",
      decisionDate: "2026-03-13",
      shift: "am",
      horizon: "j7",
      gapH: 4,
      isOverride: true,
      overrideReason: "Contrainte terrain",
      createdAt: "2026-03-13T08:00:00.000Z",
      updatedAt: "2026-03-13T08:05:00.000Z",
      decidedBy: USER_ID,
    });

    const route = findRoute("POST", "/api/v1/operational-decisions");
    const result = await route.handler(
      buildContext({
        method: "POST",
        path: "/api/v1/operational-decisions",
        body: {
          alertId: ALERT_ID,
          optionId: OPTION_ID,
          notes: "Contrainte terrain",
        },
      }),
    );

    expect(result.statusCode).toBe(201);
    expect(mockedCreatePersistentOperationalDecision).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: null,
      },
      alertId: ALERT_ID,
      optionId: OPTION_ID,
      notes: "Contrainte terrain",
      decidedBy: USER_ID,
      decidedByRole: "manager",
    });
  });

  it("lists persisted operational decisions with normalized filters", async () => {
    mockedListPersistentOperationalDecisions.mockResolvedValue({
      items: [],
      total: 0,
    });

    const route = findRoute("GET", "/api/v1/operational-decisions");
    const result = await route.handler(
      buildContext({
        method: "GET",
        path: "/api/v1/operational-decisions",
        query:
          "page=2&page_size=10&date_from=2026-03-01&date_to=2026-03-31&is_override=true&horizon=j7&site_id=site-lyon",
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(mockedListPersistentOperationalDecisions).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-lyon",
      },
      dateFrom: "2026-03-01",
      dateTo: "2026-03-31",
      isOverride: true,
      horizon: "j7",
      page: 2,
      pageSize: 10,
    });
  });

  it("returns persistent override statistics", async () => {
    mockedGetPersistentOperationalDecisionOverrideStats.mockResolvedValue({
      totalDecisions: 4,
      overrideCount: 1,
      overridePct: 25,
      topOverrideReasons: [{ reason: "Contrainte terrain", count: 1 }],
      avgCostDelta: 42,
    });

    const route = findRoute(
      "GET",
      "/api/v1/operational-decisions/override-stats",
    );
    const result = await route.handler(
      buildContext({
        method: "GET",
        path: "/api/v1/operational-decisions/override-stats",
        query: "site_id=site-lyon",
      }),
    );

    expect(result.statusCode).toBe(200);
    expect(
      mockedGetPersistentOperationalDecisionOverrideStats,
    ).toHaveBeenCalledWith({
      organizationId: ORGANIZATION_ID,
      scope: {
        orgWide: false,
        accessibleSiteIds: ["site-lyon"],
        requestedSiteId: "site-lyon",
      },
    });
  });
});
