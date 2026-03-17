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

    expect(screen.getByText("Comparatif")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      /Votre stack montre des données/,
    );
  });

  it("renders 5 comparison row categories", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(screen.getAllByText("ERP").length).toBeGreaterThanOrEqual(1);
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
      screen.getByText(/Praedixa se branche au-dessus de l.existant/),
    ).toBeInTheDocument();
  });

  it("renders column labels", () => {
    render(<StackComparisonV2Section locale="fr" />);

    expect(
      screen.getAllByText(/Brique actuelle/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Ce qu.elle couvre déjà/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Ce que Praedixa ajoute/).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
