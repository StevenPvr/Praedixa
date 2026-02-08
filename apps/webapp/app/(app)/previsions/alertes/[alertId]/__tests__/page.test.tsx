import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AlertDetailPage from "../page";

const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ alertId: "alert-123" }),
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
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Button: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("@/lib/formatters", () => ({
  formatSeverity: (s: string) => s,
  formatHorizon: (h: string) => h,
  formatAlertStatus: (s: string) => s,
}));

describe("AlertDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertDetailPage />);
    expect(
      screen.getByRole("heading", { name: /Detail de l.*alerte/ }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertDetailPage />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Not found",
      refetch: vi.fn(),
    });
    render(<AlertDetailPage />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("renders alert info when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        id: "alert-123",
        siteId: "Lyon",
        alertDate: "2026-02-10",
        shift: "am",
        horizon: "j7",
        pRupture: 0.65,
        gapH: 12,
        severity: "high",
        status: "open",
        driversJson: ["Absenteisme eleve", "Pic de charge"],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertDetailPage />);
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("Absenteisme eleve")).toBeInTheDocument();
    expect(screen.getByText("Trouver une solution")).toBeInTheDocument();
  });
});
