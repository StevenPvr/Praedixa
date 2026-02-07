import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DatasetCard } from "../dataset-card";
import type { DatasetSummary } from "@praedixa/shared-types";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../dataset-status-badge", () => ({
  DatasetStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="dataset-status-badge">{status}</span>
  ),
}));

function makeDataset(overrides: Partial<DatasetSummary> = {}): DatasetSummary {
  return {
    id: "ds-001",
    name: "effectifs",
    status: "active",
    tableName: "effectifs",
    lastIngestionAt: "2026-02-05T14:00:00Z",
    rowCount: 12500,
    columnCount: 8,
    ...overrides,
  };
}

describe("DatasetCard", () => {
  it("renders dataset name", () => {
    render(<DatasetCard dataset={makeDataset()} />);
    expect(screen.getByText("effectifs")).toBeInTheDocument();
  });

  it("hides tableName when it equals name", () => {
    const { container } = render(
      <DatasetCard
        dataset={makeDataset({ name: "effectifs", tableName: "effectifs" })}
      />,
    );
    // The subtitle <p> with tableName should not exist
    const h3 = container.querySelector("h3");
    expect(h3?.nextElementSibling).toBeNull();
  });

  it("shows tableName subtitle when it differs from name", () => {
    render(
      <DatasetCard
        dataset={makeDataset({ name: "effectifs", tableName: "tbl_effectifs" })}
      />,
    );
    expect(screen.getByText("tbl_effectifs")).toBeInTheDocument();
  });

  it("renders link to dataset detail page with encoded id", () => {
    render(<DatasetCard dataset={makeDataset({ id: "ds-001" })} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/donnees/datasets/ds-001");
  });

  it("renders the DatasetStatusBadge", () => {
    render(<DatasetCard dataset={makeDataset({ status: "pending" })} />);
    const badge = screen.getByTestId("dataset-status-badge");
    expect(badge).toHaveTextContent("pending");
  });

  it("renders row count formatted in French locale", () => {
    // toLocaleString("fr-FR") uses non-breaking space between thousands
    render(<DatasetCard dataset={makeDataset({ rowCount: 12500 })} />);
    // The formatted number will contain a separator -- match the numeric part
    const rowCountElement = screen.getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element?.textContent !== null &&
        element?.textContent.includes("12") &&
        element?.previousElementSibling?.textContent === "Lignes",
    );
    expect(rowCountElement).toBeInTheDocument();
  });

  it("renders column count", () => {
    render(<DatasetCard dataset={makeDataset({ columnCount: 8 })} />);
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders formatted last ingestion date", () => {
    render(
      <DatasetCard
        dataset={makeDataset({ lastIngestionAt: "2026-02-05T14:00:00Z" })}
      />,
    );
    // The date will be formatted with toLocaleDateString("fr-FR")
    // e.g. "5 fevr. 2026"
    const dateEl = screen.getByText(
      (_, element) =>
        element?.tagName === "P" &&
        element?.textContent !== null &&
        element?.textContent.includes("2026") &&
        element?.previousElementSibling?.textContent === "Derniere maj",
    );
    expect(dateEl).toBeInTheDocument();
  });

  it("renders 'Jamais' when lastIngestionAt is null", () => {
    render(<DatasetCard dataset={makeDataset({ lastIngestionAt: null })} />);
    expect(screen.getByText("Jamais")).toBeInTheDocument();
  });

  it("renders the database icon as aria-hidden", () => {
    const { container } = render(<DatasetCard dataset={makeDataset()} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
