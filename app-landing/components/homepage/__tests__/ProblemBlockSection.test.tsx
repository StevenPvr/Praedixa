import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemBlockSection } from "../ProblemBlockSection";

describe("ProblemBlockSection", () => {
  it("renders the kicker text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(screen.getByText("Le constat")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Vous avez les données. Il vous manque un cadre pour décider vite.",
      }),
    ).toBeInTheDocument();
  });

  it("renders 3 problem cards", () => {
    render(<ProblemBlockSection locale="fr" />);

    const cardHeadings = screen.getAllByRole("heading", { level: 3 });
    expect(cardHeadings).toHaveLength(3);
  });

  it("renders the card numbers 01, 02, 03", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders each problem card title", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByText(/Les signaux arrivent trop tard/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Les options ne sont pas comparées/),
    ).toBeInTheDocument();
    expect(screen.getByText(/impact n.est jamais mesuré/)).toBeInTheDocument();
  });

  it("renders each problem card consequence text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByText(
        /Quand l.information arrive, il est déjà trop tard pour agir au meilleur coût/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sous pression, on choisit la vitesse plutôt que la meilleure option/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Impossible de savoir si la décision prise était la bonne/,
      ),
    ).toBeInTheDocument();
  });

  it("renders each card as an article element", () => {
    const { container } = render(<ProblemBlockSection locale="fr" />);

    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(3);
  });
});
