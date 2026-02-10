import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../client", () => ({
  apiGet: vi.fn(),
  apiGetPaginated: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public status: number,
    ) {
      super(message);
    }
  },
}));

import { apiGet, apiGetPaginated, apiPost, apiPatch } from "../client";
import {
  getHealth,
  getDashboardSummary,
  getOrganization,
  getDepartments,
  getSites,
  listForecasts,
  getForecastSummary,
  getDailyForecasts,
  requestForecast,
  runWhatIfScenario,
  listDecisions,
  getDecision,
  reviewDecision,
  recordDecisionOutcome,
  getArbitrageOptions,
  validateArbitrage,
  getAlerts,
  dismissAlert,
  getCostAnalysis,
  requestExport,
  listDatasets,
  getDataset,
  getDatasetData,
  getDatasetColumns,
  getIngestionLog,
  listCanonical,
  getCanonicalQuality,
  listCoverageAlerts,
  acknowledgeCoverageAlert,
  resolveCoverageAlert,
  getScenariosForAlert,
  generateScenarios,
  listOperationalDecisions,
  getOverrideStats,
  listCostParameters,
  getEffectiveCostParameters,
  getCostParameterHistory,
  listProofPacks,
  getProofSummary,
  generateProof,
  triggerMockForecast,
} from "../endpoints";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockToken = vi.fn(() => Promise.resolve("jwt"));

const mockApiGet = vi.mocked(apiGet);
const mockApiGetPaginated = vi.mocked(apiGetPaginated);
const mockApiPost = vi.mocked(apiPost);
const mockApiPatch = vi.mocked(apiPatch);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// qs() helper — tested indirectly via endpoint calls
// ---------------------------------------------------------------------------

describe("qs helper (via listForecasts)", () => {
  it("should produce empty string for empty params", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listForecasts({}, mockToken);

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/forecasts",
      mockToken,
    );
  });

  it("should filter out null and undefined values", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listForecasts({ status: undefined, page: undefined }, mockToken);

    // All values are null/undefined => empty qs => no query string appended
    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/forecasts",
      mockToken,
    );
  });

  it("should build URLSearchParams correctly from non-null values", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listForecasts({ page: 2, pageSize: 25 }, mockToken);

    const calledPath = mockApiGetPaginated.mock.calls[0][0];
    expect(calledPath).toContain("?");
    expect(calledPath).toContain("page=2");
    expect(calledPath).toContain("pageSize=25");
  });
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

describe("getHealth", () => {
  it("should call apiGet with /api/v1/health and no auth token", async () => {
    const healthData = {
      status: "healthy",
      version: "1.0.0",
      environment: "test",
      timestamp: "t",
      checks: [],
    };
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: healthData,
      timestamp: "t",
    });

    const result = await getHealth();

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/health",
      expect.any(Function),
    );
    // Verify the token getter returns null (no auth needed)
    const tokenGetter = mockApiGet.mock.calls[0][1];
    await expect(tokenGetter()).resolves.toBeNull();
    expect(result).toEqual(healthData);
  });
});

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

describe("getOrganization", () => {
  it("should call apiGet with correct path and token", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { id: "org-1" },
      timestamp: "t",
    });

    await getOrganization(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/organizations/me",
      mockToken,
    );
  });
});

describe("getDepartments", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getDepartments(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/departments", mockToken);
  });
});

describe("getSites", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getSites(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/sites", mockToken);
  });
});

// ---------------------------------------------------------------------------
// Forecasts
// ---------------------------------------------------------------------------

describe("getForecastSummary", () => {
  it("should interpolate forecastId in path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await getForecastSummary("fc-123", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/forecasts/fc-123/summary",
      mockToken,
    );
  });
});

describe("getDailyForecasts", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getDailyForecasts("fc-456", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/forecasts/fc-456/daily",
      mockToken,
    );
  });
});

describe("requestForecast", () => {
  it("should call apiPost with correct path and body", async () => {
    const body = { startDate: "2025-01-01", endDate: "2025-01-31" };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { id: "fc-new" },
      timestamp: "t",
    });

    await requestForecast(body as never, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/forecasts",
      body,
      mockToken,
    );
  });
});

describe("runWhatIfScenario", () => {
  it("should call apiPost with /api/v1/forecasts/what-if", async () => {
    const body = { scenario: "high-absence" };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await runWhatIfScenario(body as never, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/forecasts/what-if",
      body,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

describe("listDecisions", () => {
  it("should build query string from params", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listDecisions({ status: "pending" as never, page: 1 }, mockToken);

    const calledPath = mockApiGetPaginated.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/decisions");
    expect(calledPath).toContain("status=pending");
    expect(calledPath).toContain("page=1");
  });
});

describe("getDecision", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { id: "dec-1" },
      timestamp: "t",
    });

    await getDecision("dec-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/decisions/dec-1",
      mockToken,
    );
  });
});

describe("reviewDecision", () => {
  it("should call apiPatch with correct path and body", async () => {
    const body = { status: "approved" };
    mockApiPatch.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await reviewDecision("dec-1", body as never, mockToken);

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/decisions/dec-1/review",
      body,
      mockToken,
    );
  });
});

describe("recordDecisionOutcome", () => {
  it("should call apiPost with correct path and body", async () => {
    const body = { outcome: "success" };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await recordDecisionOutcome("dec-1", body as never, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/decisions/dec-1/outcome",
      body,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Arbitrage
// ---------------------------------------------------------------------------

describe("getArbitrageOptions", () => {
  it("should call apiGet with correct path including encodeURIComponent", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { alertId: "alert-1", options: [] },
      timestamp: "t",
    });

    await getArbitrageOptions("alert-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/arbitrage/alert-1/options",
      mockToken,
    );
  });
});

describe("validateArbitrage", () => {
  it("should call apiPost with correct path and body", async () => {
    const body = { selectedOptionIndex: 2 };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { id: "dec-new" },
      timestamp: "t",
    });

    await validateArbitrage("alert-1", body as never, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/arbitrage/alert-1/validate",
      body,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Alerts
// ---------------------------------------------------------------------------

describe("getAlerts", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getAlerts(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/alerts", mockToken);
  });
});

describe("dismissAlert", () => {
  it("should call apiPatch with correct path and empty body", async () => {
    mockApiPatch.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await dismissAlert("alert-1", mockToken);

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/alerts/alert-1/dismiss",
      {},
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Cost Analysis
// ---------------------------------------------------------------------------

describe("getCostAnalysis", () => {
  it("should build query string from params", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await getCostAnalysis(
      {
        startDate: "2025-01-01",
        endDate: "2025-01-31",
        departmentId: "dept-1",
      },
      mockToken,
    );

    const calledPath = mockApiGet.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/analytics/costs");
    expect(calledPath).toContain("startDate=2025-01-01");
    expect(calledPath).toContain("endDate=2025-01-31");
    expect(calledPath).toContain("departmentId=dept-1");
  });

  it("should omit undefined params", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: {},
      timestamp: "t",
    });

    await getCostAnalysis({ startDate: "2025-01-01" }, mockToken);

    const calledPath = mockApiGet.mock.calls[0][0];
    expect(calledPath).toContain("startDate=2025-01-01");
    expect(calledPath).not.toContain("endDate");
    expect(calledPath).not.toContain("departmentId");
  });
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

describe("requestExport", () => {
  it("should call apiPost with resource in path", async () => {
    const body = { format: "csv" };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { exportId: "exp-1" },
      timestamp: "t",
    });

    await requestExport("forecasts", body as never, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/exports/forecasts",
      body,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

describe("listDatasets", () => {
  it("should call apiGetPaginated with correct path", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listDatasets({}, mockToken);

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/datasets",
      mockToken,
    );
  });

  it("should build query string from params", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listDatasets({ page: 2, pageSize: 12 }, mockToken);

    const calledPath = mockApiGetPaginated.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/datasets");
    expect(calledPath).toContain("page=2");
    expect(calledPath).toContain("pageSize=12");
  });
});

describe("getDataset", () => {
  it("should call apiGet with encoded datasetId", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { id: "ds-1" },
      timestamp: "t",
    });

    await getDataset("ds-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/datasets/ds-1", mockToken);
  });

  it("should encode special characters in datasetId", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { id: "ds/special" },
      timestamp: "t",
    });

    await getDataset("ds/special", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/v1/datasets/${encodeURIComponent("ds/special")}`,
      mockToken,
    );
  });
});

describe("getDatasetData", () => {
  it("should call apiGet with correct path and query params", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { columns: [], rows: [], maskedColumns: [], total: 0 },
      timestamp: "t",
    });

    await getDatasetData("ds-1", { page: 1, pageSize: 25 }, mockToken);

    const calledPath = mockApiGet.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/datasets/ds-1/data");
    expect(calledPath).toContain("page=1");
    expect(calledPath).toContain("pageSize=25");
  });

  it("should omit undefined params", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { columns: [], rows: [], maskedColumns: [], total: 0 },
      timestamp: "t",
    });

    await getDatasetData("ds-1", {}, mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/datasets/ds-1/data",
      mockToken,
    );
  });
});

describe("getDatasetColumns", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getDatasetColumns("ds-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/datasets/ds-1/columns",
      mockToken,
    );
  });
});

describe("getIngestionLog", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { entries: [], total: 0 },
      timestamp: "t",
    });

    await getIngestionLog("ds-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/datasets/ds-1/ingestion-log",
      mockToken,
    );
  });

  it("should encode special characters in datasetId", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { entries: [], total: 0 },
      timestamp: "t",
    });

    await getIngestionLog("ds/special", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/v1/datasets/${encodeURIComponent("ds/special")}/ingestion-log`,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

describe("getDashboardSummary", () => {
  it("should call apiGet with correct path and token", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { coverageHuman: 0.85 },
      timestamp: "t",
    });

    await getDashboardSummary(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/dashboard/summary",
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Canonical Data
// ---------------------------------------------------------------------------

describe("listCanonical", () => {
  it("should call apiGetPaginated with correct path", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listCanonical({}, mockToken);

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/canonical",
      mockToken,
    );
  });

  it("should build query string from params", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listCanonical({ page: 2, siteId: "site-1" }, mockToken);

    const calledPath = mockApiGetPaginated.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/canonical");
    expect(calledPath).toContain("page=2");
    expect(calledPath).toContain("siteId=site-1");
  });
});

describe("getCanonicalQuality", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { totalRecords: 100 },
      timestamp: "t",
    });

    await getCanonicalQuality(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/canonical/quality",
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Coverage Alerts
// ---------------------------------------------------------------------------

describe("listCoverageAlerts", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await listCoverageAlerts({}, mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/coverage-alerts",
      mockToken,
    );
  });

  it("should build query string from params", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await listCoverageAlerts({ status: "open", siteId: "s1" }, mockToken);

    const calledPath = mockApiGet.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/coverage-alerts");
    expect(calledPath).toContain("status=open");
    expect(calledPath).toContain("siteId=s1");
  });
});

describe("acknowledgeCoverageAlert", () => {
  it("should call apiPatch with correct path and empty body", async () => {
    mockApiPatch.mockResolvedValueOnce({
      success: true,
      data: { id: "ca-1" },
      timestamp: "t",
    });

    await acknowledgeCoverageAlert("ca-1", mockToken);

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/coverage-alerts/ca-1/acknowledge",
      {},
      mockToken,
    );
  });
});

describe("resolveCoverageAlert", () => {
  it("should call apiPatch with correct path and empty body", async () => {
    mockApiPatch.mockResolvedValueOnce({
      success: true,
      data: { id: "ca-1" },
      timestamp: "t",
    });

    await resolveCoverageAlert("ca-1", mockToken);

    expect(mockApiPatch).toHaveBeenCalledWith(
      "/api/v1/coverage-alerts/ca-1/resolve",
      {},
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

describe("getScenariosForAlert", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { alertId: "a-1", options: [] },
      timestamp: "t",
    });

    await getScenariosForAlert("a-1", mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/scenarios/alert/a-1",
      mockToken,
    );
  });
});

describe("generateScenarios", () => {
  it("should call apiPost with correct path and empty body", async () => {
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { alertId: "a-1", options: [] },
      timestamp: "t",
    });

    await generateScenarios("a-1", mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/scenarios/generate/a-1",
      {},
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Operational Decisions
// ---------------------------------------------------------------------------

describe("listOperationalDecisions", () => {
  it("should call apiGetPaginated with correct path", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listOperationalDecisions({}, mockToken);

    expect(mockApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/operational-decisions",
      mockToken,
    );
  });

  it("should build query string from params", async () => {
    mockApiGetPaginated.mockResolvedValueOnce({
      success: true,
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      timestamp: "t",
    });

    await listOperationalDecisions({ page: 3 }, mockToken);

    const calledPath = mockApiGetPaginated.mock.calls[0][0];
    expect(calledPath).toContain("/api/v1/operational-decisions");
    expect(calledPath).toContain("page=3");
  });
});

describe("getOverrideStats", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { totalDecisions: 10, overrideCount: 2 },
      timestamp: "t",
    });

    await getOverrideStats(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/operational-decisions/override-stats",
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Cost Parameters
// ---------------------------------------------------------------------------

describe("listCostParameters", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await listCostParameters(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/cost-parameters",
      mockToken,
    );
  });
});

describe("getEffectiveCostParameters", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { cInt: 25 },
      timestamp: "t",
    });

    await getEffectiveCostParameters(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/cost-parameters/effective",
      mockToken,
    );
  });
});

describe("getCostParameterHistory", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await getCostParameterHistory(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/cost-parameters/history",
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Proof
// ---------------------------------------------------------------------------

describe("listProofPacks", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: [],
      timestamp: "t",
    });

    await listProofPacks(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/proof", mockToken);
  });
});

describe("getProofSummary", () => {
  it("should call apiGet with correct path", async () => {
    mockApiGet.mockResolvedValueOnce({
      success: true,
      data: { totalGainNetEur: 1000 },
      timestamp: "t",
    });

    await getProofSummary(mockToken);

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/proof/summary", mockToken);
  });
});

describe("generateProof", () => {
  it("should call apiPost with correct path and body", async () => {
    const body = { siteId: "site-1", month: "2025-01-01" };
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { id: "proof-1" },
      timestamp: "t",
    });

    await generateProof(body, mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/proof/generate",
      body,
      mockToken,
    );
  });
});

// ---------------------------------------------------------------------------
// Mock Forecast
// ---------------------------------------------------------------------------

describe("triggerMockForecast", () => {
  it("should call apiPost with correct path and empty body", async () => {
    mockApiPost.mockResolvedValueOnce({
      success: true,
      data: { alertsGenerated: 5, message: "ok" },
      timestamp: "t",
    });

    await triggerMockForecast(mockToken);

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/v1/mock-forecast",
      {},
      mockToken,
    );
  });
});
