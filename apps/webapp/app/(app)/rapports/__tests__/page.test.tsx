import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RapportsPage from "../page";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  TabBar: ({
    tabs,
    activeTab,
    onTabChange,
  }: {
    tabs: { id: string; label: string }[];
    activeTab: string;
    onTabChange: (id: string) => void;
  }) => (
    <div data-testid="tab-bar" data-active={activeTab}>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onTabChange(t.id)}
          data-testid={`tab-${t.id}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  ),
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  WaterfallChart: ({ items }: { items: unknown[] }) => (
    <div data-testid="waterfall-chart">{items.length} items</div>
  ),
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("RapportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the heading", () => {
    render(<RapportsPage />);
    expect(
      screen.getByRole("heading", { name: "Rapports" }),
    ).toBeInTheDocument();
  });

  it("renders tab bar", () => {
    render(<RapportsPage />);
    expect(screen.getByTestId("tab-bar")).toBeInTheDocument();
  });

  it("shows synthese tab by default", () => {
    render(<RapportsPage />);
    expect(screen.getByLabelText("Synthese hebdomadaire")).toBeInTheDocument();
  });

  it("switches to couts tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-couts"));
    expect(screen.getByTestId("waterfall-chart")).toBeInTheDocument();
  });

  it("switches to precision tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-precision"));
    expect(
      screen.getByLabelText("Precision des previsions"),
    ).toBeInTheDocument();
  });

  it("switches to proof tab", () => {
    render(<RapportsPage />);
    fireEvent.click(screen.getByTestId("tab-proof"));
    expect(screen.getByText("Proof Packs")).toBeInTheDocument();
  });
});
