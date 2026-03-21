import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("Greekia proposal site", () => {
  it("renders the core wedge and audit-to-subscription framing", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Savoir plus tot/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: /Ou Greekia perd de la marge/i,
      }),
    ).toBeDefined();
    expect(
      screen.getByText(/Voir les services ou Greekia perd le plus/i),
    ).toBeDefined();
    expect(
      screen.getAllByText(/audit sur historique en 5 jours ouvres/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /D'abord un audit de 5 jours/i,
      }),
    ).toBeDefined();
    expect(screen.getByText(/Ouvertures et ramp-up/i)).toBeDefined();
    expect(
      screen.getAllByRole("link", {
        name: /Demander l'audit 5 jours/i,
      }),
    ).toHaveLength(2);
  });

  it("renders stakeholder views for multi-buyer positioning", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /Marque/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Operations/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finance/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Reseau/i })).toBeDefined();
  });
});
