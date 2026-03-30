import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StackComparisonV2Section } from "../StackComparisonV2Section";

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("StackComparisonV2Section", () => {
  it("has section id comparatif", () => {
    const { container } = render(<StackComparisonV2Section locale="fr" />);
    expect(container.querySelector("#comparatif")).toBeInTheDocument();
  });

  it("renders heading and kicker", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(screen.getByText("Compatibilité")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Praedixa s.ajoute à vos outils réseau. Il projette là où ils s.arrêtent/,
    );
    expect(
      screen.getByText(
        /Praedixa relie les signaux utiles pour prévoir plus tôt la demande, les tensions stock et les besoins d.effectifs/,
      ),
    ).toBeInTheDocument();
  });

  it("renders 5 comparison row categories", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(screen.getAllByText("POS / ERP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BI / reporting").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText("Planning / WFM").length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Excel \/ comités/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Praedixa").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the bottom note", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(
      screen.getByText(
        /Compatible avec POS, planning, stock, delivery, BI et exports existants/,
      ),
    ).toBeInTheDocument();
  });

  it("explains the ERP limitation against averages", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(
      screen.getAllByText(
        /Montre le passé mais ne dit pas où la demande, le stock ou les effectifs vont se tendre avant le prochain rush/,
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(
        /Projette la demande, les tensions stock et les besoins d.effectifs, puis compare les arbitrages avant que la marge ne glisse/,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("renders column labels", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(screen.getAllByText(/Outil/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Ce qu.il fait/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Ce que Praedixa ajoute/).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
