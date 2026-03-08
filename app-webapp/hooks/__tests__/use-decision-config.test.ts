import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseApiGet = vi.fn();
const mockRefetch = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

import { useDecisionConfig } from "../use-decision-config";

describe("useDecisionConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: { versionId: "ver-1" },
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("calls decision-config endpoint without site filter", () => {
    renderHook(() => useDecisionConfig());
    expect(mockUseApiGet).toHaveBeenCalledWith("/api/v1/live/decision-config", {
      pollInterval: 10000,
    });
  });

  it("adds site filter when provided", () => {
    renderHook(() => useDecisionConfig("site-lyon"));
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/decision-config?site_id=site-lyon",
      {
        pollInterval: 10000,
      },
    );
  });
});
