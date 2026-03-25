import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CredibilityRibbonSection } from "../CredibilityRibbonSection";

describe("CredibilityRibbonSection", () => {
  it("renders the section with id credibilite", () => {
    const { container } = render(<CredibilityRibbonSection locale="fr" />);

    const section = container.querySelector("#credibilite");
    expect(section).toBeInTheDocument();
  });

  it("renders all stack chips", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(screen.getByText("Signaux relus")).toBeInTheDocument();
    for (const chip of [
      "POS",
      "Planning",
      "Delivery",
      "Promos",
      "BI",
      "API / CSV",
    ]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  it("renders all role chips", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(screen.getByText("Décideurs du réseau")).toBeInTheDocument();
    for (const chip of ["Franchisé", "Dir. Réseau", "Ops", "Finance", "RH"]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  it("renders role microcopy", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(
      screen.getByText(
        "Les fonctions qui arbitrent staffing, service et marge au niveau réseau.",
      ),
    ).toBeInTheDocument();
  });

  it("renders all trust markers", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(screen.getByText("Engagements")).toBeInTheDocument();
    for (const marker of [
      "Lecture seule au démarrage",
      "Aucune écriture caisse ou planning",
      "Hébergement France",
      "NDA dès le premier échange",
    ]) {
      expect(screen.getByText(marker)).toBeInTheDocument();
    }
  });
});
