import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProblemBlockSection } from "../ProblemBlockSection";

describe("ProblemBlockSection", () => {
  it("renders the kicker text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(screen.getByText("Là où le rush vous surprend")).toBeInTheDocument();
  });

  it("renders the section heading", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Vos restaurants n\u2019ont pas un problème de données. Ils ont un problème d\u2019anticipation réseau.",
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
      screen.getByText(/La demande se lit trop tard/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Stock et équipes se recalent trop tard/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Les mêmes tensions reviennent/)).toBeInTheDocument();
  });

  it("renders each problem card consequence text", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(
      screen.getByText(
        /Quand le rush est déjà là, les seules options restantes coûtent plus cher/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sans lecture réseau partagée, chaque restaurant compense localement/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sans relecture demande, stock, effectifs et marge, le même problème revient/,
      ),
    ).toBeInTheDocument();
  });

  it("renders each card as an article element", () => {
    const { container } = render(<ProblemBlockSection locale="fr" />);

    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(3);
  });
});
