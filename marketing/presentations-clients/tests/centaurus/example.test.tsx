import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Index from "@/pages/Index";

describe("centaurus one-page proposal", () => {
  it("renders the focused prospect positioning", () => {
    render(<Index />);

    expect(
      screen.getByRole("heading", {
        name: /Protéger la marge sans dégrader le service/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getAllByText(/5 jours ouvrés/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Net RevPAR \+ staffing-to-service/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/prévisions/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/cellule data/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/EuraTechnologies/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/preuve sur historique/i).length,
    ).toBeGreaterThan(0);
  });

  it("makes the narrow pilot scope explicit", () => {
    render(<Index />);

    expect(
      screen.getByRole("heading", {
        name: /Où le luxe perd de l'argent/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/519 USD en direct contre 320 USD via OTA/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        /42% du revenu Booking.com annulé contre 18% en direct/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/ROI défendable/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /Ce que vous achetez réellement/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /La solution, concrètement/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /Comment le pilote se déploie en 90 jours/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getAllByRole("link", {
        name: /Demander la preuve sur historique/i,
      })[1],
    ).toHaveAttribute(
      "href",
      expect.stringContaining("Preuve%20sur%20historique"),
    );
  });
});
