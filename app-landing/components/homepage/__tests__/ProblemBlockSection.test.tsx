import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemBlockSection } from "../ProblemBlockSection";

describe("ProblemBlockSection", () => {
  it("renders the kicker text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(screen.getByText("Le problème")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Les données sont là. Le cadre de décision manque.",
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

    // Content uses curly apostrophe U+2019 — match with regex
    expect(screen.getByText(/arbitrage reste dispersé/)).toBeInTheDocument();
    expect(
      screen.getByText(/La décision arrive trop tard/),
    ).toBeInTheDocument();
    expect(screen.getByText(/impact n.est jamais relu/)).toBeInTheDocument();
  });

  it("renders each problem card consequence text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByText(
        /Le choix entre renfort, réallocation et ajustement de service se disperse/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sans lecture anticipée, l.urgence décide à la place du réseau/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Après la décision, personne ne compare ce qui était recommandé/,
      ),
    ).toBeInTheDocument();
  });

  it("renders each card as an article element", () => {
    const { container } = render(<ProblemBlockSection locale="fr" />);

    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(3);
  });
});
