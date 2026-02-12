import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DecisionQueueItem } from "@praedixa/shared-types";
import { ScenarioComparisonChart } from "../scenario-comparison-chart";

function makeQueueItem(
  overrides: Partial<DecisionQueueItem> = {},
): DecisionQueueItem {
  return {
    id: "q1",
    siteId: "Lyon",
    alertDate: "2026-02-12",
    shift: "am",
    severity: "high",
    gapH: 8,
    pRupture: 0.5,
    horizon: "j3",
    driversJson: [],
    priorityScore: 80,
    estimatedImpactEur: 3000,
    timeToBreachHours: 12,
    ...overrides,
  };
}

describe("ScenarioComparisonChart", () => {
  it("renders title and card labels", () => {
    render(<ScenarioComparisonChart queue={[]} />);
    expect(
      screen.getByText("Indice d'exposition immediate"),
    ).toBeInTheDocument();
    expect(screen.getByText("Impact financier")).toBeInTheDocument();
    expect(screen.getByText("Heures a couvrir")).toBeInTheDocument();
    expect(screen.getByText("Urgence < 24h")).toBeInTheDocument();
  });

  it("renders a no-queue insight when queue is empty", () => {
    render(<ScenarioComparisonChart queue={[]} />);
    expect(
      screen.getByText(
        "Pas de file d'urgence active. La capacite reste maitrisable sur l'horizon courant.",
      ),
    ).toBeInTheDocument();
  });

  it("renders queue-dependent helper values", () => {
    const queue = [
      makeQueueItem({
        estimatedImpactEur: 4500,
        gapH: 10,
        timeToBreachHours: 6,
      }),
      makeQueueItem({
        id: "q2",
        estimatedImpactEur: 1500,
        gapH: 4,
        timeToBreachHours: 36,
      }),
    ];

    const { container } = render(<ScenarioComparisonChart queue={queue} />);
    expect(
      screen.getByText(/2 sujet\(s\) en file de traitement/),
    ).toBeInTheDocument();
    expect(screen.getByText("6 000 EUR en jeu")).toBeInTheDocument();
    expect(screen.getByText("14.0 h a arbitrer")).toBeInTheDocument();

    const bars = container.querySelectorAll("div[aria-hidden='true']");
    expect(bars.length).toBe(3);
    expect((bars[0] as HTMLElement).style.width).toBe("100%");
  });
});
