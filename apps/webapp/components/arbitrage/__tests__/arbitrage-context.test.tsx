import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArbitrageContext } from "../arbitrage-context";

vi.mock("@praedixa/ui", () => ({
  StatusBadge: ({ variant, label }: { variant: string; label: string }) => (
    <span data-testid="status-badge" data-variant={variant}>
      {label}
    </span>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

function makeResult(
  overrides: Partial<{
    alertTitle: string;
    alertSeverity: "info" | "warning" | "error" | "critical";
    siteName: string;
    departmentName: string;
    deficitPct: number;
    horizonDays: number;
  }> = {},
) {
  return {
    alertId: "alert-1",
    alertTitle: overrides.alertTitle ?? "Sous-couverture",
    alertSeverity: overrides.alertSeverity ?? "warning",
    departmentName: overrides.departmentName ?? "Logistique",
    siteName: overrides.siteName ?? "Lyon",
    deficitPct: overrides.deficitPct ?? 15,
    horizonDays: overrides.horizonDays ?? 7,
    options: [],
    recommendationIndex: 0,
  };
}

describe("ArbitrageContext", () => {
  it("renders skeletons when loading", () => {
    render(<ArbitrageContext result={null} loading={true} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(3);
  });

  it("renders skeletons when result is null", () => {
    render(<ArbitrageContext result={null} loading={false} />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThanOrEqual(3);
  });

  it("renders alert title and severity badge", () => {
    render(<ArbitrageContext result={makeResult()} loading={false} />);
    expect(screen.getByText("Sous-couverture")).toBeInTheDocument();
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "warning");
    expect(badge).toHaveTextContent("Attention");
  });

  it("renders site, department, deficit and horizon", () => {
    render(
      <ArbitrageContext
        result={makeResult({
          siteName: "Marseille",
          departmentName: "Preparation",
          deficitPct: 25,
          horizonDays: 14,
        })}
        loading={false}
      />,
    );
    expect(screen.getByText("Marseille")).toBeInTheDocument();
    expect(screen.getByText("Preparation")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("14 jours")).toBeInTheDocument();
  });

  it("maps error severity to danger variant", () => {
    render(
      <ArbitrageContext
        result={makeResult({ alertSeverity: "error" })}
        loading={false}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Erreur");
  });

  it("maps critical severity to danger variant", () => {
    render(
      <ArbitrageContext
        result={makeResult({ alertSeverity: "critical" })}
        loading={false}
      />,
    );
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveAttribute("data-variant", "danger");
    expect(badge).toHaveTextContent("Critique");
  });
});
