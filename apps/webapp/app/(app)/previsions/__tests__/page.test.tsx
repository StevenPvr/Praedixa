import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PrevisionsPage from "../page";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  TabBar: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (id: string) => void;
  }) => (
    <div data-testid="tab-bar" data-active={activeTab}>
      <button onClick={() => onTabChange("j3")} data-testid="tab-j3">
        J+3
      </button>
    </div>
  ),
  HeatmapGrid: () => <div data-testid="heatmap-grid" />,
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  SelectDropdown: () => <select data-testid="select-dropdown" />,
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("PrevisionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Previsions" }),
    ).toBeInTheDocument();
  });

  it("renders tab bar", () => {
    render(<PrevisionsPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
  });

  it("renders heatmap section heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Couverture par site" }),
    ).toBeInTheDocument();
  });

  it("renders alerts section heading", () => {
    render(<PrevisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Alertes actives" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeletons when loading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Server error",
      refetch: vi.fn(),
    });
    render(<PrevisionsPage />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });
});
