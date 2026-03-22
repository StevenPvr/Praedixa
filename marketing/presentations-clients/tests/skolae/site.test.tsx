import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("Skolae proposal site", () => {
  it("renders the core wedge and pilot framing", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Objectiver les arbitrages de capacité/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: /Arbitrages multi-sites prioritaires/i,
      }),
    ).toBeDefined();
    expect(
      screen.getAllByText(/preuve sur historique en 5 jours ouvrés/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /D'abord une preuve sur historique/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByText(/Formation -> entreprises -> débouchés/i),
    ).toBeDefined();
    expect(
      screen.getAllByRole("link", {
        name: /Demander la preuve sur historique/i,
      }),
    ).toHaveLength(2);
  });

  it("renders stakeholder views for multi-buyer positioning", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: /Marie Gasquet/i }),
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /Opérations/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finance/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /DSI/i })).toBeDefined();
  });
});
