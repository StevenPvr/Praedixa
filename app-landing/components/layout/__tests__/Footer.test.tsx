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

describe("Footer", () => {
  it("renders without crashing", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("renders brand and premium CTA", () => {
    render(<Footer />);
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
    expect(
      screen.getByText("Prenez l'avantage avant la standardisation du marché"),
    ).toBeInTheDocument();

    const ctaLink = screen.getByText(/Candidater à la cohorte/i).closest("a");
    expect(ctaLink).toHaveAttribute("href", "/devenir-pilote");
  });

  it("renders navigation and legal links", () => {
    render(<Footer />);

    const navigationLabels = ["Enjeux", "Méthode", "Cas d'usage", "Framework ROI", "FAQ"];
    for (const label of navigationLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }

    expect(screen.getByText("Mentions légales")).toBeInTheDocument();
    expect(screen.getByText("Confidentialité")).toBeInTheDocument();
    expect(screen.getByText("CGU")).toBeInTheDocument();
  });

  it("renders contact and compliance hints", () => {
    render(<Footer />);

    expect(
      screen.getByText("Gouvernance orientée COO / DAF"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Données agrégées, architecture privacy-by-design"),
    ).toBeInTheDocument();
    expect(screen.getByText("steven.poivre@outlook.com")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`© ${currentYear} Praedixa. Tous droits réservés.`),
    ).toBeInTheDocument();
  });
});
