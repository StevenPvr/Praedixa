import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { Footer } from "../Footer";
import { fr } from "../../../lib/i18n/dictionaries/fr";

const defaultProps = { dict: fr, locale: "fr" as const };

describe("Footer", () => {
  it("renders without crashing", () => {
    const { container } = render(<Footer {...defaultProps} />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("renders brand and CTA", () => {
    render(<Footer {...defaultProps} />);
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
    expect(
      screen.getByText(/Prenez l'?avantage avant la standardisation du marché/),
    ).toBeInTheDocument();

    const ctaLink = screen.getByText(/Candidater à la cohorte/i).closest("a");
    expect(ctaLink).toHaveAttribute("href", "/fr/devenir-pilote");
  });

  it("renders navigation and legal links", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText("Solution")).toBeInTheDocument();
    expect(screen.getAllByText("Sécurité").length).toBeGreaterThan(0);
    expect(screen.getByText("Offre pilote")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();

    expect(screen.getByText("Mentions légales")).toBeInTheDocument();
    expect(screen.getByText("Confidentialité")).toBeInTheDocument();
    expect(screen.getByText("CGU")).toBeInTheDocument();
  });

  it("renders contact and compliance hints", () => {
    render(<Footer {...defaultProps} />);

    expect(screen.getByText("Gouvernance COO / DAF")).toBeInTheDocument();
    expect(screen.getByText("Privacy-by-design")).toBeInTheDocument();
    expect(screen.getByText("hello@praedixa.com")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    render(<Footer {...defaultProps} />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`©\\s*${currentYear}\\s*Praedixa`)),
    ).toBeInTheDocument();
    expect(screen.getByText("Conçu en France")).toBeInTheDocument();
  });
});
