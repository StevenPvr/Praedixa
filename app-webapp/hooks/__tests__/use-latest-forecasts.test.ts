import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

import { useLatestForecasts } from "../use-latest-forecasts";

function setupMock(
  overrides?: Partial<{
    data: unknown;
    loading: boolean;
    error: string | null;
  }>,
) {
  mockUseApiGet.mockReturnValue({
    data:
      overrides?.data !== undefined
        ? overrides.data
        : [{ forecastDate: "2026-02-10", dimension: "human" }],
    loading: overrides?.loading ?? false,
    error: overrides?.error ?? null,
    refetch: mockRefetch,
  });
}

describe("useLatestForecasts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMock();
  });

  it("returns daily data on success", () => {
    const { result } = renderHook(() => useLatestForecasts("human"));
    expect(result.current.dailyData).toEqual([
      { forecastDate: "2026-02-10", dimension: "human" },
    ]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("forwards loading state", () => {
    setupMock({ data: null, loading: true, error: null });
    const { result } = renderHook(() => useLatestForecasts("human"));
    expect(result.current.loading).toBe(true);
  });

  it("forwards error state", () => {
    setupMock({ data: null, loading: false, error: "Daily failed" });
    const { result } = renderHook(() => useLatestForecasts("human"));
    expect(result.current.error).toBe("Daily failed");
  });

  it("calls latest daily endpoint with encoded dimension", () => {
    renderHook(() => useLatestForecasts("merchandise"));
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/forecasts/latest/daily?dimension=merchandise",
      { pollInterval: 10000 },
    );
  });

  it("encodes special characters in dimension query", () => {
    renderHook(() => useLatestForecasts("human & ops"));
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/forecasts/latest/daily?dimension=human%20%26%20ops",
      { pollInterval: 10000 },
    );
  });

  it("exposes both refetchRuns and refetchDaily aliases", () => {
    const { result } = renderHook(() => useLatestForecasts("human"));
    result.current.refetchRuns();
    result.current.refetchDaily();
    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });
});
