import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DecisionsPage from "../page";

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
  SelectDropdown: ({
    label,
    onChange,
  }: {
    label?: string;
    onChange: (v: string) => void;
  }) => (
    <select
      data-testid={`select-${label}`}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  DateRangePicker: () => <div data-testid="date-range-picker" />,
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    variant,
  }: {
    message?: string;
    variant?: string;
  }) => (
    <div data-testid="error-fallback" data-variant={variant}>
      {message}
    </div>
  ),
}));

describe("DecisionsPage", () => {
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
    render(<DecisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Decisions" }),
    ).toBeInTheDocument();
  });

  it("renders the description", () => {
    render(<DecisionsPage />);
    expect(
      screen.getByText("Journal des decisions operationnelles"),
    ).toBeInTheDocument();
  });

  it("renders filter section", () => {
    render(<DecisionsPage />);
    expect(screen.getByLabelText("Filtres")).toBeInTheDocument();
  });

  it("shows skeleton on loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<DecisionsPage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Server error",
      refetch: vi.fn(),
    });
    render(<DecisionsPage />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<DecisionsPage />);
    const fallback = screen.getByTestId("error-fallback");
    expect(fallback).toHaveAttribute("data-variant", "empty");
  });
});
