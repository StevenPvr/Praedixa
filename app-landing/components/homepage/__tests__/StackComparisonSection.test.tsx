import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StackComparisonSection } from "../StackComparisonSection";

describe("StackComparisonSection", () => {
  it("compares Praedixa against the current stack without naming brands", () => {
    render(<StackComparisonSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        name: "Votre stack montre des données. Elle n’arbitre pas le conflit économique.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("ERP")).toBeInTheDocument();
    expect(screen.getByText("BI / reporting")).toBeInTheDocument();
    expect(screen.getByText("Planning / WFM")).toBeInTheDocument();
    expect(screen.getByText("Excel / comités")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Praedixa se branche au-dessus de l’existant. Le but n’est pas de remplacer vos outils, mais d’éviter qu’un arbitrage coûteux reste dispersé entre eux.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Compare renfort, réallocation, report ou ajustement de service/i,
      ),
    ).toBeInTheDocument();
  });
});
