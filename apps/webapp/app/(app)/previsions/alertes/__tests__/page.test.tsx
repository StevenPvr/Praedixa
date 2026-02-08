import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AlertesPage from "../page";

const mockUseApiGetPaginated = vi.fn();

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
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  SelectDropdown: ({ onChange }: { onChange: (v: string) => void }) => (
    <select
      data-testid="status-filter"
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

describe("AlertesPage", () => {
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
    render(<AlertesPage />);
    expect(
      screen.getByRole("heading", { name: "Alertes de couverture" }),
    ).toBeInTheDocument();
  });

  it("renders status filter", () => {
    render(<AlertesPage />);
    expect(screen.getByTestId("status-filter")).toBeInTheDocument();
  });

  it("shows skeleton on loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Network error",
      refetch: vi.fn(),
    });
    render(<AlertesPage />);
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
