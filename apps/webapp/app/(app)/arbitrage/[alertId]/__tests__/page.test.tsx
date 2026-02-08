import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ArbitrageDetailPage from "../page";

const mockUseApiGet = vi.fn();
const mockMutate = vi.fn();
const mockUseApiPost = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ alertId: "alert-42" }),
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPost: (...args: unknown[]) => mockUseApiPost(...args),
}));

vi.mock("@praedixa/ui", () => ({
  ParetoChart: ({ points }: { points: unknown[] }) => (
    <div data-testid="pareto-chart">{points.length} points</div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid="validate-btn">
      {children}
    </button>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
  Card: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <div data-testid="card" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  CheckCircle2: () => <svg data-testid="check-icon" />,
}));

function makeFrontier() {
  return {
    alertId: "alert-42",
    options: [
      {
        id: "opt-1",
        organizationId: "org-1",
        coverageAlertId: "alert-42",
        costParameterId: "cp-1",
        optionType: "hs",
        label: "Heures sup",
        coutTotalEur: 5000,
        serviceAttenduPct: 92,
        heuresCouvertes: 10,
        isParetoOptimal: true,
        isRecommended: true,
        contraintesJson: {},
        createdAt: "2026-02-07T00:00:00Z",
        updatedAt: "2026-02-07T00:00:00Z",
      },
    ],
    paretoFrontier: [],
    recommended: null,
  };
}

describe("ArbitrageDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockResolvedValue({ id: "dec-1" });
    mockUseApiPost.mockReturnValue({
      mutate: mockMutate,
      loading: false,
      error: null,
      data: null,
      reset: vi.fn(),
    });
  });

  it("renders the heading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArbitrageDetailPage />);
    expect(
      screen.getByRole("heading", { name: "Choisir une solution" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArbitrageDetailPage />);
    expect(screen.getAllByTestId("skeleton-card").length).toBeGreaterThan(0);
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Network error",
      refetch: vi.fn(),
    });
    render(<ArbitrageDetailPage />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });

  it("renders option cards when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: makeFrontier(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArbitrageDetailPage />);
    expect(screen.getByText("Heures sup")).toBeInTheDocument();
  });

  it("renders pareto chart when options available", () => {
    mockUseApiGet.mockReturnValue({
      data: makeFrontier(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<ArbitrageDetailPage />);
    expect(screen.getByTestId("pareto-chart")).toBeInTheDocument();
  });
});
