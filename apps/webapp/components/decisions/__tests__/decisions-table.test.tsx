import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecisionsTable } from "../decisions-table";
import type { DecisionSummary } from "@praedixa/shared-types";

vi.mock("@praedixa/ui", () => ({
  DataTable: ({
    columns,
    data,
    pagination,
  }: {
    columns: Array<{
      key: string;
      label: string;
      render: (row: DecisionSummary) => React.ReactNode;
    }>;
    data: DecisionSummary[];
    pagination: { page: number; pageSize: number; total: number };
  }) => (
    <div data-testid="data-table">
      <div data-testid="column-count">{columns.length}</div>
      <div data-testid="row-count">{data.length}</div>
      <div data-testid="pagination-page">{pagination.page}</div>
      <div data-testid="pagination-total">{pagination.total}</div>
      {data.map((row) => (
        <div key={row.id} data-testid={`row-${row.id}`}>
          {columns.map((col) => (
            <div key={col.key} data-testid={`cell-${col.key}`}>
              {col.render(row)}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock("../decision-status-badge", () => ({
  DecisionStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="decision-status-badge">{status}</span>
  ),
}));

vi.mock("../decision-type-label", () => ({
  typeLabel: {
    replacement: "Remplacement",
    redistribution: "Redistribution",
    postponement: "Report",
    overtime: "Heures sup",
    external: "Externe",
    training: "Formation",
    no_action: "Sans action",
  },
}));

function makeDecision(
  overrides: Partial<DecisionSummary> = {},
): DecisionSummary {
  return {
    id: overrides.id ?? "dec-1",
    type: overrides.type ?? "overtime",
    priority: overrides.priority ?? "medium",
    status: overrides.status ?? "suggested",
    title: overrides.title ?? "Heures sup Logistique",
    targetPeriod: overrides.targetPeriod ?? {
      startDate: "2026-02-10",
      endDate: "2026-02-17",
    },
    departmentId: overrides.departmentId ?? "dept-1",
    departmentName: overrides.departmentName ?? "Logistique",
    estimatedCost:
      "estimatedCost" in overrides ? overrides.estimatedCost : 3500,
    confidenceScore: overrides.confidenceScore ?? 85,
  };
}

describe("DecisionsTable", () => {
  it("renders DataTable with correct number of columns", () => {
    render(
      <DecisionsTable
        data={[]}
        total={0}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("column-count")).toHaveTextContent("6");
  });

  it("renders rows for each decision", () => {
    const data = [
      makeDecision({ id: "dec-1" }),
      makeDecision({ id: "dec-2", title: "Externe Paris" }),
    ];
    render(
      <DecisionsTable
        data={data}
        total={2}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("row-dec-1")).toBeInTheDocument();
    expect(screen.getByTestId("row-dec-2")).toBeInTheDocument();
  });

  it("renders title column", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ title: "Test Decision" })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Test Decision")).toBeInTheDocument();
  });

  it("renders department name", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ departmentName: "Preparation" })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Preparation")).toBeInTheDocument();
  });

  it("renders type label in French", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ type: "overtime" })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Heures sup")).toBeInTheDocument();
  });

  it("renders cost in EUR format", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ estimatedCost: 3500 })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    // Match the formatted cost
    expect(screen.getByText(/3[\s\u202f]500/)).toBeInTheDocument();
  });

  it("renders dash when estimatedCost is null", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ estimatedCost: undefined })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("renders status badge", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ status: "approved" })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("decision-status-badge")).toHaveTextContent(
      "approved",
    );
  });

  it("renders confidence score", () => {
    render(
      <DecisionsTable
        data={[makeDecision({ confidenceScore: 92 })]}
        total={1}
        page={1}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("passes pagination to DataTable", () => {
    render(
      <DecisionsTable
        data={[]}
        total={25}
        page={2}
        pageSize={10}
        onPageChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("pagination-page")).toHaveTextContent("2");
    expect(screen.getByTestId("pagination-total")).toHaveTextContent("25");
  });
});
