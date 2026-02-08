import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatasetsPage from "../page";
import type { DatasetSummary } from "@praedixa/shared-types";

/* ─── Mocks ──────────────────────────────────────── */

const mockUseApiGetPaginated = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@praedixa/ui", () => ({
  PageHeader: ({
    title,
    breadcrumbs,
  }: {
    title: string;
    breadcrumbs?: { label: string; href: string }[];
  }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {breadcrumbs?.map((b) => (
        <span key={b.href} data-testid="breadcrumb">
          {b.label}
        </span>
      ))}
    </div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({
    message,
    variant,
    onRetry,
  }: {
    message?: string;
    variant?: string;
    onRetry?: () => void;
  }) => (
    <div data-testid="error-fallback" data-variant={variant}>
      {message}
      {onRetry && (
        <button onClick={onRetry} data-testid="retry-button">
          Retry
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/donnees/dataset-card", () => ({
  DatasetCard: ({ dataset }: { dataset: DatasetSummary }) => (
    <div data-testid="dataset-card" data-name={dataset.name}>
      {dataset.name}
    </div>
  ),
}));

/* ─── Helpers ────────────────────────────────────── */

function makeDataset(
  id: string,
  name: string = `Dataset ${id}`,
): DatasetSummary {
  return {
    id,
    name,
    status: "active",
    tableName: `table_${id}`,
    lastIngestionAt: "2026-02-05T14:00:00Z",
    rowCount: 1000,
    columnCount: 5,
  };
}

/* ─── Tests ──────────────────────────────────────── */

describe("DatasetsPage", () => {
  beforeEach(() => {
    mockUseApiGetPaginated.mockReset();
  });

  it("renders the Fichiers importes heading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(
      screen.getByRole("heading", { name: "Fichiers importes" }),
    ).toBeInTheDocument();
  });

  it("renders breadcrumbs", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    const breadcrumbs = screen.getAllByTestId("breadcrumb");
    expect(breadcrumbs).toHaveLength(2);
    expect(breadcrumbs[0]).toHaveTextContent("Donnees");
    expect(breadcrumbs[1]).toHaveTextContent("Fichiers importes");
  });

  it("shows skeleton cards when loading", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    const skeletons = screen.getAllByTestId("skeleton-card");
    expect(skeletons).toHaveLength(6);
  });

  it("shows ErrorFallback on error", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Server error",
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(screen.getByTestId("error-fallback")).toHaveTextContent(
      "Server error",
    );
  });

  it("shows empty state when no datasets", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    const fallback = screen.getByTestId("error-fallback");
    expect(fallback).toHaveAttribute("data-variant", "empty");
    expect(fallback).toHaveTextContent("Aucun fichier importe pour le moment.");
  });

  it("renders DatasetCard for each dataset", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [makeDataset("ds-1", "effectifs"), makeDataset("ds-2", "volumes")],
      total: 2,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    const cards = screen.getAllByTestId("dataset-card");
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute("data-name", "effectifs");
    expect(cards[1]).toHaveAttribute("data-name", "volumes");
  });

  it("calls useApiGetPaginated with correct URL and page 1", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(mockUseApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/datasets",
      1,
      12,
    );
  });

  it("does not show pagination when total fits on one page", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: [makeDataset("ds-1")],
      total: 1,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(screen.queryByText("Page precedente")).not.toBeInTheDocument();
    expect(screen.queryByText("Page suivante")).not.toBeInTheDocument();
  });

  it("shows pagination when total exceeds page size", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: Array.from({ length: 12 }, (_, i) => makeDataset(`ds-${i}`)),
      total: 24,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(screen.getByText("Page precedente")).toBeInTheDocument();
    expect(screen.getByText("Page suivante")).toBeInTheDocument();
    expect(screen.getByText(/Page 1 sur 2/)).toBeInTheDocument();
    expect(screen.getByText(/24 fichiers/)).toBeInTheDocument();
  });

  it("disables Precedent button on first page", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: Array.from({ length: 12 }, (_, i) => makeDataset(`ds-${i}`)),
      total: 24,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    expect(screen.getByText("Page precedente")).toBeDisabled();
    expect(screen.getByText("Page suivante")).not.toBeDisabled();
  });

  it("advances to next page when Suivant clicked", () => {
    mockUseApiGetPaginated.mockReturnValue({
      data: Array.from({ length: 12 }, (_, i) => makeDataset(`ds-${i}`)),
      total: 24,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DatasetsPage />);
    fireEvent.click(screen.getByText("Page suivante"));

    // After clicking next, the hook should be called with page 2
    // The component re-renders with page 2
    expect(mockUseApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/datasets",
      2,
      12,
    );
  });

  it("provides onRetry callback on error state", () => {
    const mockRefetch = vi.fn();
    mockUseApiGetPaginated.mockReturnValue({
      data: [],
      total: 0,
      loading: false,
      error: "Network error",
      refetch: mockRefetch,
    });

    render(<DatasetsPage />);
    fireEvent.click(screen.getByTestId("retry-button"));
    expect(mockRefetch).toHaveBeenCalledOnce();
  });
});
