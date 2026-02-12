import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CoverageAlert } from "@praedixa/shared-types";
import { ForecastTimelineChart } from "../forecast-timeline-chart";

function makeAlert(overrides: Partial<CoverageAlert> = {}): CoverageAlert {
  return {
    id: "a1",
    organizationId: "org-1",
    siteId: "site-1",
    alertDate: "2026-02-12",
    shift: "am",
    horizon: "j3",
    pRupture: 0.5,
    gapH: 20,
    severity: "high",
    status: "open",
    driversJson: [],
    createdAt: "2026-02-12T00:00:00Z",
    updatedAt: "2026-02-12T00:00:00Z",
    ...overrides,
  };
}

describe("ForecastTimelineChart", () => {
  it("renders title and executive subtitle", () => {
    render(<ForecastTimelineChart alerts={[]} />);
    expect(
      screen.getByText("Pression capacitaire a 14 jours"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Lecture executive des ecarts entre demande previsionnelle et capacite disponible.",
      ),
    ).toBeInTheDocument();
  });

  it("renders SVG chart and legends", () => {
    render(<ForecastTimelineChart alerts={[]} />);
    expect(
      screen.getByRole("img", { name: "Courbe capacite versus demande" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Capacite disponible")).toBeInTheDocument();
    expect(screen.getByText("Demande previsionnelle")).toBeInTheDocument();
  });

  it("shows analysis block with a computed insight", () => {
    render(<ForecastTimelineChart alerts={[makeAlert({ gapH: 30 })]} />);
    expect(screen.getByText("Analyse")).toBeInTheDocument();
    expect(
      screen.getByText(/Deficit maximal estime|plan de charge/),
    ).toBeInTheDocument();
  });
});
