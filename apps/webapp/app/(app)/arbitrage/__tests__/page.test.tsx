import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ArbitragePage from "../page";

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

  it("shows the construction placeholder", () => {
    render(<ArbitragePage />);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
