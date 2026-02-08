import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ArbitrageHistoriquePage from "../page";

const mockUseApiGetPaginated = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("ArbitrageHistoriquePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the heading", () => {
    render(<ArbitrageHistoriquePage />);
    expect(
      screen.getByRole("heading", { name: /Historique d.*arbitrage/ }),
    ).toBeInTheDocument();
  });

  it("shows skeleton on loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArbitrageHistoriquePage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Fetch error",
      refetch: vi.fn(),
    });
    render(<ArbitrageHistoriquePage />);
    expect(screen.getByText("Fetch error")).toBeInTheDocument();
  });
});
