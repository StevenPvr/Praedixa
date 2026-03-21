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
      screen.getByText(/Praedixa couple Data Science, Machine Learning et IA/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Compatible avec votre stack actuelle/i),
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
