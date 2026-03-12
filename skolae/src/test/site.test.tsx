import { render, screen } from "@testing-library/react";
import App from "@/App";

describe("Skolae proposal site", () => {
  it("renders the core wedge and pilot framing", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: /Sécuriser la capacité pédagogique/i }),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /Couverture pédagogique multi-sites/i }),
    ).toBeDefined();
    expect(
      screen.getByText(
        /Voir 4 à 12 semaines à l'avance où la capacité va manquer/i,
      ),
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: /Un pilote simple à lancer, simple à défendre/i,
      }),
    ).toBeDefined();
    expect(
      screen.getAllByRole("link", { name: /Lancer le pilote sur 1 campus/i }),
    ).toHaveLength(2);
  });

  it("renders stakeholder views for multi-buyer positioning", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: /Marie Gasquet/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Opérations/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Finance/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /DSI/i })).toBeDefined();
  });
});
