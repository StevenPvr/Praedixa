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
  getAlerts,
  dismissAlert,
  getCostAnalysis,
  requestExport,
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

    expect(mockApiGet).toHaveBeenCalledWith("/api/v1/organization", mockToken);
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

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/organization/departments",
      mockToken,
    );
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

    expect(mockApiGet).toHaveBeenCalledWith(
      "/api/v1/organization/sites",
      mockToken,
    );
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
