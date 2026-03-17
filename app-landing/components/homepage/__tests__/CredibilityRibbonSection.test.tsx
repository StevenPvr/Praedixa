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

    expect(screen.getByText("Stack couverte")).toBeInTheDocument();
    for (const chip of ["ERP", "WFM", "BI", "Planning", "Excel", "API / CSV"]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  it("renders all role chips", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(screen.getByText("Décideurs concernés")).toBeInTheDocument();
    for (const chip of ["COO", "Dir. Ops", "Dir. Réseau", "Finance", "DSI"]) {
      expect(screen.getByText(chip)).toBeInTheDocument();
    }
  });

  it("renders role microcopy", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(
      screen.getByText(
        /arbitrage co.t \/ service \/ risque passe par ces fonctions/,
      ),
    ).toBeInTheDocument();
  });

  it("renders all trust markers", () => {
    render(<CredibilityRibbonSection locale="fr" />);

    expect(screen.getByText("Engagements")).toBeInTheDocument();
    for (const marker of [
      "Lecture seule au départ",
      "Hébergement France",
      "NDA dès le premier échange",
      "Données agrégées",
    ]) {
      expect(screen.getByText(marker)).toBeInTheDocument();
    }
  });
});
