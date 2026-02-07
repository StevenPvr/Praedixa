import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ArbitragePage from "../page";

vi.mock("@/components/arbitrage/alerts-arbitrage-list", () => ({
  AlertsArbitrageList: () => (
    <div data-testid="alerts-arbitrage-list">AlertsArbitrageList</div>
  ),
}));

describe("ArbitragePage", () => {
  it("renders the Arbitrage heading", () => {
    render(<ArbitragePage />);
    expect(
      screen.getByRole("heading", { name: "Arbitrage" }),
    ).toBeInTheDocument();
  });

  it("renders the page description", () => {
    render(<ArbitragePage />);
    expect(
      screen.getByText("Alertes et recommandations d'arbitrage economique"),
    ).toBeInTheDocument();
  });

  it("renders the AlertsArbitrageList component", () => {
    render(<ArbitragePage />);
    expect(screen.getByTestId("alerts-arbitrage-list")).toBeInTheDocument();
  });
});
