import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HomeGeoSummarySection } from "../HomeGeoSummarySection";

describe("HomeGeoSummarySection", () => {
  it("renders a canonical summary block for the French homepage", () => {
    render(<HomeGeoSummarySection locale="fr" />);

    expect(screen.getByText("Point d'entrée canonique")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Praedixa en bref" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Praedixa aide les réseaux de restauration rapide à prédire la demande et les besoins d’effectifs avant les rushs/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compatible avec POS, planning, delivery, BI et exports existants/i),
    ).toBeInTheDocument();
  });

  it("renders English labels on the English homepage", () => {
    render(<HomeGeoSummarySection locale="en" />);

    expect(screen.getByText("Canonical entry point")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Praedixa at a glance" }),
    ).toBeInTheDocument();
  });
});
