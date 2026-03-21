import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GeoSummaryPanel } from "../GeoSummaryPanel";

describe("GeoSummaryPanel", () => {
  it("renders localized defaults and a concise answer-first summary", () => {
    render(
      <GeoSummaryPanel
        locale="fr"
        summary="Praedixa compare les options multi-sites et documente l'impact réel de chaque décision."
        takeaways={[
          "Lecture seule au démarrage sur les outils existants.",
          "Lecture seule au démarrage sur les outils existants.",
          "Les arbitrages restent lisibles pour les opérations et la finance.",
        ]}
      />,
    );

    expect(screen.getByText("Résumé canonique")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "En bref" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/compare les options multi-sites/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Lecture seule au démarrage sur les outils existants.",
      ),
    ).toHaveLength(1);
  });

  it("switches to english labels when needed", () => {
    render(
      <GeoSummaryPanel
        locale="en"
        summary="Praedixa detects risks earlier and compares the best operational options."
        takeaways={["Read-only start on top of the existing tools."]}
      />,
    );

    expect(screen.getByText("Canonical summary")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "At a glance" }),
    ).toBeInTheDocument();
  });
});
