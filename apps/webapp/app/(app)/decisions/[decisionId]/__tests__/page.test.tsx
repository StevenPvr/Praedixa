import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DecisionDetailPage from "../page";

const mockUseApiGet = vi.fn();
const mockUseApiPatch = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ decisionId: "dec-123" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
  useApiPatch: (...args: unknown[]) => mockUseApiPatch(...args),
}));

vi.mock("@praedixa/ui", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  Input: (props: Record<string, unknown>) => <input {...props} />,
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("DecisionDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiPatch.mockReturnValue({
      mutate: vi.fn(),
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
    render(<DecisionDetailPage />);
    expect(
      screen.getByRole("heading", { name: "Detail de la decision" }),
    ).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionDetailPage />);
    expect(screen.getByTestId("skeleton-card")).toBeInTheDocument();
  });

  it("shows error on error", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: "Not found",
      refetch: vi.fn(),
    });
    render(<DecisionDetailPage />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("renders decision details when loaded", () => {
    mockUseApiGet.mockReturnValue({
      data: {
        id: "dec-123",
        siteId: "Lyon",
        decisionDate: "2026-02-10",
        shift: "am",
        horizon: "j7",
        isOverride: false,
        gapH: 8,
        decidedBy: "user-1",
        coverageAlertId: "alert-1",
        organizationId: "org-1",
        createdAt: "2026-02-07T00:00:00Z",
        updatedAt: "2026-02-07T00:00:00Z",
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionDetailPage />);
    expect(screen.getByText("Lyon")).toBeInTheDocument();
    expect(screen.getByText("Resultat observe")).toBeInTheDocument();
  });
});
