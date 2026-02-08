import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CanoniquePage from "../page";

const mockUseApiGetPaginated = vi.fn();
const mockUseApiGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table">{data.length} rows</div>
  ),
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div data-testid={`metric-${label}`}>{value}</div>
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
    >
      <option value="all">All</option>
    </select>
  ),
  DateRangePicker: () => <div data-testid="date-range-picker" />,
  Button: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="import-btn">{children}</button>
  ),
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => (
    <div data-testid="error-fallback">{message}</div>
  ),
}));

vi.mock("lucide-react", () => ({
  Upload: () => <svg data-testid="icon-upload" />,
}));

function setupMocks() {
  mockUseApiGetPaginated.mockReturnValue({
    data: [],
    total: 0,
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUseApiGet.mockImplementation((url: string) => {
    if (url.includes("canonical/quality")) {
      return {
        data: {
          totalRecords: 500,
          coveragePct: "87.50",
          sites: 2,
          dateRange: ["2026-01-01", "2026-02-07"],
          missingShiftsPct: "1.20",
          avgAbsPct: "3.40",
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    if (url.includes("organizations/sites")) {
      return {
        data: [
          { id: "site-1", name: "Lyon" },
          { id: "site-2", name: "Paris" },
        ],
        loading: false,
        error: null,
        refetch: vi.fn(),
      };
    }
    return { data: null, loading: false, error: null, refetch: vi.fn() };
  });
}

describe("CanoniquePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("renders the heading", () => {
    render(<CanoniquePage />);
    expect(
      screen.getByRole("heading", { name: "Donnees canoniques" }),
    ).toBeInTheDocument();
  });

  it("renders metric cards section", () => {
    render(<CanoniquePage />);
    expect(screen.getByLabelText("Indicateurs canoniques")).toBeInTheDocument();
  });

  it("renders filter section", () => {
    render(<CanoniquePage />);
    expect(screen.getByLabelText("Filtres")).toBeInTheDocument();
  });

  it("renders the import button", () => {
    render(<CanoniquePage />);
    expect(screen.getByTestId("import-btn")).toBeInTheDocument();
  });

  it("shows skeleton on loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });
    render(<CanoniquePage />);
    expect(screen.getByTestId("skeleton-table")).toBeInTheDocument();
  });

  it("shows error fallback on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "API error",
      refetch: vi.fn(),
    });
    render(<CanoniquePage />);
    expect(screen.getByText("API error")).toBeInTheDocument();
  });
});
