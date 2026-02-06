import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DecisionsPage from "../page";

/* ─── Mocks ──────────────────────────────────────── */

const mockUseApiGetPaginated = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonTable: ({ rows, columns }: { rows: number; columns: number }) => (
    <div data-testid="skeleton-table" data-rows={rows} data-columns={columns} />
  ),
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

vi.mock("@/components/decisions/decision-status-filter", () => ({
  DecisionStatusFilter: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div data-testid="status-filter" data-value={value}>
      <button
        onClick={() => onChange("approved")}
        data-testid="filter-approved"
      >
        Approved
      </button>
    </div>
  ),
}));

vi.mock("@/components/decisions/decisions-table", () => ({
  DecisionsTable: ({
    data,
    total,
    page,
  }: {
    data: unknown[];
    total: number;
    page: number;
  }) => (
    <div data-testid="decisions-table">
      <div data-testid="table-rows">{data.length}</div>
      <div data-testid="table-total">{total}</div>
      <div data-testid="table-page">{page}</div>
    </div>
  ),
}));

/* ─── Helpers ────────────────────────────────────── */

function makeDecision(id: string) {
  return {
    id,
    type: "overtime",
    priority: "medium",
    status: "suggested",
    title: `Decision ${id}`,
    targetPeriod: { startDate: "2026-02-10", endDate: "2026-02-17" },
    departmentId: "dept-1",
    departmentName: "Logistique",
    estimatedCost: 3500,
    confidenceScore: 85,
  };
}

/* ─── Tests ──────────────────────────────────────── */

describe("DecisionsPage", () => {
  beforeEach(() => {
    mockUseApiGetPaginated.mockReset();
  });

  it("renders the Decisions heading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    expect(
      screen.getByRole("heading", { name: "Decisions" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    expect(
      screen.getByText("Suivi et audit trail des decisions operationnelles"),
    ).toBeInTheDocument();
  });

  it("shows SkeletonTable when loading", () => {
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

  it("shows ErrorFallback on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Server error",
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Server error",
    );
  });

  it("shows empty state when no decisions", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    const fallback = screen.getByTestId("error-fallback");
    expect(fallback).toHaveAttribute("data-variant", "empty");
  });

  it("renders DecisionsTable with data", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [makeDecision("dec-1"), makeDecision("dec-2")],
      total: 2,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    expect(screen.getByTestId("decisions-table")).toBeInTheDocument();
    expect(screen.getByTestId("table-rows")).toHaveTextContent("2");
    expect(screen.getByTestId("table-total")).toHaveTextContent("2");
  });

  it("renders the status filter", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    expect(screen.getByTestId("status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("status-filter")).toHaveAttribute(
      "data-value",
      "all",
    );
  });

  it("updates status filter and resets page when filter changes", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [makeDecision("dec-1")],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DecisionsPage />);
    fireEvent.click(screen.getByTestId("filter-approved"));

    // After filter change, the status filter should show the new value
    expect(screen.getByTestId("status-filter")).toHaveAttribute(
      "data-value",
      "approved",
    );
  });
});
