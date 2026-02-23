import type { Page, Route } from "@playwright/test";
import {
  getTimelineScenario,
  type TimelineCoverageAlert,
  type TimelineDecisionQueueItem,
  type TimelineScenarioDefinition,
  type TimelineScenarioId,
  type TimelineScenarioOption,
  type TimelineTickId,
} from "./timeline-scenarios";

const DEFAULT_SCENARIO_ID: TimelineScenarioId = "ops-rollover";

function parsePositiveInt(raw: string | null, fallback: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function buildPaginatedBody<T>({
  items,
  page,
  pageSize,
  timestamp,
}: {
  items: T[];
  page: number;
  pageSize: number;
  timestamp: string;
}): string {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return JSON.stringify({
    success: true,
    data: pageItems,
    pagination: {
      total,
      page,
      pageSize,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
    timestamp,
  });
}

function withCoverageFilters(
  alerts: TimelineCoverageAlert[],
  url: URL,
): TimelineCoverageAlert[] {
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");
  const horizon = url.searchParams.get("horizon");
  const siteId = url.searchParams.get("site_id");

  return alerts.filter((alert) => {
    if (status && alert.status !== status) return false;
    if (severity && alert.severity !== severity) return false;
    if (horizon && alert.horizon !== horizon) return false;
    if (siteId && alert.siteId !== siteId) return false;
    return true;
  });
}

function withQueueFilters(
  queue: TimelineDecisionQueueItem[],
  url: URL,
): TimelineDecisionQueueItem[] {
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");
  const horizon = url.searchParams.get("horizon");
  const siteId = url.searchParams.get("site_id");
  const limit = parsePositiveInt(url.searchParams.get("limit"), 50);

  const filtered = queue.filter((item) => {
    if (status && status !== "open") return false;
    if (severity && item.severity !== severity) return false;
    if (horizon && item.horizon !== horizon) return false;
    if (siteId && item.siteId !== siteId) return false;
    return true;
  });
  return filtered.slice(0, limit);
}

function isCoverageAlertsPath(pathname: string): boolean {
  return (
    pathname === "/api/v1/live/coverage-alerts" ||
    pathname === "/api/v1/coverage-alerts"
  );
}

function isQueuePath(pathname: string): boolean {
  return (
    pathname === "/api/v1/live/coverage-alerts/queue" ||
    pathname === "/api/v1/coverage-alerts/queue"
  );
}

function isDecisionWorkspacePath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1/live/decision-workspace/") ||
    pathname.startsWith("/api/v1/decision-workspace/")
  );
}

function isScenariosPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/v1/live/scenarios/alert/") ||
    pathname.startsWith("/api/v1/scenarios/alert/")
  );
}

function isLatestForecastsPath(pathname: string): boolean {
  return pathname === "/api/v1/live/forecasts/latest/daily";
}

function getAlertOptions(
  optionsByAlertId: Record<string, TimelineScenarioOption[]>,
  alertId: string,
): TimelineScenarioOption[] {
  return optionsByAlertId[alertId] ?? [];
}

export interface TimelineController {
  getTick: () => TimelineTickId;
  setTick: (nextTick: TimelineTickId) => void;
  getScenarioId: () => TimelineScenarioId;
}

interface InstallTimelineMocksOptions {
  scenarioId?: TimelineScenarioId;
  initialTick?: TimelineTickId;
}

export async function installTimelineMocks(
  page: Page,
  options: InstallTimelineMocksOptions = {},
): Promise<TimelineController> {
  const scenarioId = options.scenarioId ?? DEFAULT_SCENARIO_ID;
  const scenario = getTimelineScenario(scenarioId);
  const initialTick = options.initialTick ?? scenario.initialTick;

  if (!(initialTick in scenario.ticks)) {
    throw new Error(`Unknown initial tick "${initialTick}" for ${scenarioId}`);
  }

  let currentTick = initialTick;
  const getSnapshot = () => scenario.ticks[currentTick];

  const fulfillCoverageAlerts = (route: Route): Promise<void> | void => {
    const url = new URL(route.request().url());
    if (!isCoverageAlertsPath(url.pathname)) {
      return route.fallback();
    }

    const pageParam = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = parsePositiveInt(url.searchParams.get("page_size"), 20);
    const filtered = withCoverageFilters(getSnapshot().coverageAlerts, url);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: buildPaginatedBody({
        items: filtered,
        page: pageParam,
        pageSize,
        timestamp: getSnapshot().now,
      }),
    });
  };

  const fulfillDecisionQueue = (route: Route): Promise<void> | void => {
    const url = new URL(route.request().url());
    if (!isQueuePath(url.pathname)) {
      return route.fallback();
    }

    const queue = withQueueFilters(getSnapshot().decisionQueue, url);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: queue,
        timestamp: getSnapshot().now,
      }),
    });
  };

  const fulfillLatestForecasts = (route: Route): Promise<void> | void => {
    const url = new URL(route.request().url());
    if (!isLatestForecastsPath(url.pathname)) {
      return route.fallback();
    }

    const dimension =
      url.searchParams.get("dimension") === "merchandise"
        ? "merchandise"
        : "human";
    const data = getSnapshot().forecasts[dimension];

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data,
        timestamp: getSnapshot().now,
      }),
    });
  };

  const fulfillDecisionWorkspace = (route: Route): Promise<void> | void => {
    const url = new URL(route.request().url());
    if (!isDecisionWorkspacePath(url.pathname)) {
      return route.fallback();
    }

    const alertId = url.pathname.split("/").pop() ?? "";
    const alert = getSnapshot().coverageAlerts.find(
      (item) => item.id === alertId,
    );
    if (!alert) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: { code: "NOT_FOUND", message: "Alerte introuvable" },
          timestamp: getSnapshot().now,
        }),
      });
    }

    const optionsForAlert = getAlertOptions(
      getSnapshot().optionsByAlertId,
      alertId,
    );
    const recommended = optionsForAlert.find((item) => item.isRecommended);

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          alert,
          options: optionsForAlert,
          recommendedOptionId: recommended?.id ?? null,
          diagnostic: {
            topDrivers: alert.driversJson,
            confidencePct: Math.round(alert.pRupture * 100),
            riskTrend: alert.pRupture >= 0.5 ? "worsening" : "stable",
          },
        },
        timestamp: getSnapshot().now,
      }),
    });
  };

  const fulfillScenarios = (route: Route): Promise<void> | void => {
    const url = new URL(route.request().url());
    if (!isScenariosPath(url.pathname)) {
      return route.fallback();
    }

    const alertId = url.pathname.split("/").pop() ?? "";
    const optionsForAlert = getAlertOptions(
      getSnapshot().optionsByAlertId,
      alertId,
    );
    const recommended =
      optionsForAlert.find((item) => item.isRecommended) ?? null;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          alertId,
          options: optionsForAlert,
          paretoFrontier: optionsForAlert.filter(
            (item) => item.isParetoOptimal,
          ),
          recommended,
        },
        timestamp: getSnapshot().now,
      }),
    });
  };

  await page.route("**/api/v1/**coverage-alerts/queue*", fulfillDecisionQueue);
  await page.route("**/api/v1/**coverage-alerts*", fulfillCoverageAlerts);
  await page.route(
    "**/api/v1/live/forecasts/latest/daily*",
    fulfillLatestForecasts,
  );
  await page.route(
    "**/api/v1/**decision-workspace/*",
    fulfillDecisionWorkspace,
  );
  await page.route("**/api/v1/**scenarios/alert/*", fulfillScenarios);

  const controller: TimelineController = {
    getTick: () => currentTick,
    setTick: (nextTick) => {
      if (!(nextTick in scenario.ticks)) {
        throw new Error(
          `Unknown tick "${nextTick}" for scenario "${scenarioId}"`,
        );
      }
      currentTick = nextTick;
    },
    getScenarioId: () => scenarioId,
  };

  return controller;
}

export function listScenarioTicks(
  scenarioId: TimelineScenarioId = DEFAULT_SCENARIO_ID,
): TimelineTickId[] {
  const scenario: TimelineScenarioDefinition = getTimelineScenario(scenarioId);
  return Object.keys(scenario.ticks) as TimelineTickId[];
}
