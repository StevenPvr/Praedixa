import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProblemBlockSection } from "../ProblemBlockSection";
import { FinalCtaSection } from "../FinalCtaSection";

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

describe("Homepage FR messaging", () => {
  it("renders the problem section with 3 tension cards", () => {
    render(<ProblemBlockSection locale="fr" />);

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
    expect(screen.getByText(/arbitrage reste dispers/)).toBeInTheDocument();
  });

  it("renders the final CTA section with heading and promise items", () => {
    render(<FinalCtaSection locale="fr" />);

    expect(
      screen.getByText(/Cadrons le premier arbitrage/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Retour qualifié sous 48h ouvrées/),
    ).toBeInTheDocument();
  });
});
