import React from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AlertesPage from "../page";

const { mockUseApiGetPaginated, mockAppendSiteParam, mockRefetch } = vi.hoisted(
  () => ({
    mockUseApiGetPaginated: vi.fn(),
    mockAppendSiteParam: vi.fn((url: string) => url),
    mockRefetch: vi.fn(),
  }),
);

vi.mock("@/hooks/use-api", () => ({
  useApiGetPaginated: (...args: unknown[]) => mockUseApiGetPaginated(...args),
}));

vi.mock("@/lib/site-scope", () => ({
  useSiteScope: () => ({ appendSiteParam: mockAppendSiteParam }),
}));

vi.mock("@/components/page-transition", () => ({
  PageTransition: ({ children }: { children: ReactNode }) => (
    <div data-testid="page-transition">{children}</div>
  ),
}));

vi.mock("@/components/ui/page-header", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/status-banner", () => ({
  StatusBanner: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/metric-card", () => ({
  MetricCard: ({ label, value }: { label: string; value: string | number }) => (
    <div>{`${label}:${value}`}</div>
  ),
}));

vi.mock("@/components/ui/select-dropdown", () => ({
  SelectDropdown: ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/error-fallback", () => ({
  ErrorFallback: ({ message }: { message?: string }) => <div>{message}</div>,
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@praedixa/ui", () => ({
  DataTable: ({
    data,
    pagination,
  }: {
    data: unknown[];
    pagination?: { page: number; onPageChange: (page: number) => void };
  }) => (
    <div data-testid="alerts-table" data-count={data.length}>
      <span>{`page:${pagination?.page ?? 0}`}</span>
      <button
        onClick={() => pagination?.onPageChange((pagination?.page ?? 1) + 1)}
      >
        next-page
      </button>
    </div>
  ),
  SkeletonTable: () => <div>loading</div>,
}));

describe("PrevisionsAlertesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApiGetPaginated.mockReturnValue({
      data: [
        {
          id: "ca-1",
          siteId: "lyon",
          alertDate: "2026-01-01",
          shift: "am",
          horizon: "j7",
          pRupture: 0.74,
          gapH: 6.2,
          severity: "high",
          status: "open",
          driversJson: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
      total: 1,
      loading: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it("uses paginated alerts endpoint with backend-compatible page size", () => {
    render(<AlertesPage />);

    expect(mockUseApiGetPaginated).toHaveBeenCalledWith(
      "/api/v1/live/coverage-alerts?status=open",
      1,
      50,
      expect.objectContaining({ pollInterval: expect.any(Number) }),
    );
    expect(mockAppendSiteParam).toHaveBeenCalledWith(
      "/api/v1/live/coverage-alerts?status=open",
    );
  });

  it("resets to page 1 when filters change", () => {
    render(<AlertesPage />);

    fireEvent.click(screen.getByRole("button", { name: "next-page" }));
    expect(mockUseApiGetPaginated).toHaveBeenLastCalledWith(
      "/api/v1/live/coverage-alerts?status=open",
      2,
      50,
      expect.objectContaining({ pollInterval: expect.any(Number) }),
    );

    fireEvent.change(screen.getByLabelText("Severite"), {
      target: { value: "critical" },
    });

    expect(mockUseApiGetPaginated).toHaveBeenLastCalledWith(
      "/api/v1/live/coverage-alerts?status=open&severity=critical",
      1,
      50,
      expect.objectContaining({ pollInterval: expect.any(Number) }),
    );
  });
});
