import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { IngestionHistoryList } from "../ingestion-history-list";
import type { IngestionLogEntry } from "@praedixa/shared-types";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({
    variant,
    label,
    size,
  }: {
    variant: string;
    label: string;
    size?: string;
  }) => (
    <span data-testid="status-badge" data-variant={variant} data-size={size}>
      {label}
    </span>
  ),
}));

function makeEntry(
  overrides: Partial<IngestionLogEntry> = {},
): IngestionLogEntry {
  return {
    id: "ing-001",
    datasetId: "ds-001",
    mode: "incremental",
    rowsReceived: 500,
    rowsTransformed: 480,
    startedAt: "2026-02-05T14:00:00Z",
    completedAt: "2026-02-05T14:05:00Z",
    status: "success",
    errorMessage: null,
    triggeredBy: "shift_cron",
    requestId: "req-123",
    createdAt: "2026-02-05T14:00:00Z",
    updatedAt: "2026-02-05T14:05:00Z",
    ...overrides,
  };
}

describe("IngestionHistoryList", () => {
  it("renders empty state when no entries", () => {
    render(<IngestionHistoryList entries={[]} />);
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element?.textContent === "Aucun historique d\u2019ingestion" ||
            element?.textContent === "Aucun historique d'ingestion"),
      ),
    ).toBeInTheDocument();
  });

  it("renders a list with role='list'", () => {
    render(<IngestionHistoryList entries={[makeEntry()]} />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("renders 'Incrementiel' for incremental mode", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ mode: "incremental" })]} />,
    );
    expect(screen.getByText("Incrementiel")).toBeInTheDocument();
  });

  it("renders 'Refit complet' for full_refit mode", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ mode: "full_refit" })]} />,
    );
    expect(screen.getByText("Refit complet")).toBeInTheDocument();
  });

  it("renders StatusBadge with success variant for success status", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ status: "success" })]} />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "success");
    expect(badge).toHaveTextContent("Termine");
  });

  it("renders StatusBadge with danger variant for failed status", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ status: "failed" })]} />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Echoue");
  });

  it("renders StatusBadge with info variant for running status", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ status: "running" })]} />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "info");
    expect(badge).toHaveTextContent("En cours");
  });

  it("renders StatusBadge with sm size", () => {
    render(<IngestionHistoryList entries={[makeEntry()]} />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-size", "sm");
  });

  it("renders rows received count", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ rowsReceived: 500 })]} />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el?.textContent?.includes("500") === true &&
          el?.textContent?.includes("lignes recues") === true,
      ),
    ).toBeInTheDocument();
  });

  it("renders rows transformed count", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ rowsTransformed: 480 })]} />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" &&
          el?.textContent?.includes("480") === true &&
          el?.textContent?.includes("transformees") === true,
      ),
    ).toBeInTheDocument();
  });

  it("renders triggeredBy information", () => {
    render(
      <IngestionHistoryList entries={[makeEntry({ triggeredBy: "manual" })]} />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === "P" && el?.textContent?.includes("manual") === true,
      ),
    ).toBeInTheDocument();
  });

  it("renders icons as aria-hidden", () => {
    const { container } = render(
      <IngestionHistoryList entries={[makeEntry()]} />,
    );
    const svgs = container.querySelectorAll("svg");
    svgs.forEach((svg) => {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("renders multiple entries", () => {
    render(
      <IngestionHistoryList
        entries={[
          makeEntry({ id: "ing-001", mode: "incremental" }),
          makeEntry({ id: "ing-002", mode: "full_refit" }),
        ]}
      />,
    );
    expect(screen.getByText("Incrementiel")).toBeInTheDocument();
    expect(screen.getByText("Refit complet")).toBeInTheDocument();
  });
});
