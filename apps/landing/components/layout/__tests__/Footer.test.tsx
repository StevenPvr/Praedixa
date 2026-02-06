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
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { Footer } from "../Footer";

describe("Footer", () => {
  it("should render without errors", () => {
    const { container } = render(<Footer />);
    expect(container.querySelector("footer")).toBeInTheDocument();
  });

  it("should render the Praedixa brand name", () => {
    render(<Footer />);
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("should render the brand tagline", () => {
    render(<Footer />);
    expect(
      screen.getByText(
        "Prévoir les trous. Chiffrer les options. Prouver le ROI.",
      ),
    ).toBeInTheDocument();
  });

  it("should render the mini CTA banner text", () => {
    render(<Footer />);
    expect(
      screen.getByText("Prêt à anticiper vos risques de sous-couverture ?"),
    ).toBeInTheDocument();
  });

  it("should render the CTA button linking to /devenir-pilote", () => {
    render(<Footer />);
    const ctaLinks = screen.getAllByText("Devenir entreprise pilote");
    const ctaLink = ctaLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/devenir-pilote",
    );
    expect(ctaLink).toBeDefined();
  });

  it("should render all navigation links", () => {
    render(<Footer />);
    const navLabels = [
      "Le problème",
      "La solution",
      "La vision",
      "Les livrables",
      "FAQ",
    ];
    for (const label of navLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // "Devenir entreprise pilote" appears in both nav link and CTA button
    expect(
      screen.getAllByText("Devenir entreprise pilote").length,
    ).toBeGreaterThanOrEqual(1);
    // "Programme pilote" appears in nav link (#pilot)
    expect(
      screen.getAllByText("Programme pilote").length,
    ).toBeGreaterThanOrEqual(1);
    // "Contact" appears as both a nav link and a column heading
    expect(screen.getAllByText("Contact").length).toBeGreaterThanOrEqual(2);
  });

  it("should render the Navigation section heading", () => {
    render(<Footer />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
  });

  it("should render all legal links", () => {
    render(<Footer />);
    expect(screen.getByText("Mentions légales")).toBeInTheDocument();
    expect(screen.getByText("Confidentialité")).toBeInTheDocument();
    expect(screen.getByText("CGU")).toBeInTheDocument();
  });

  it("should render the Legal section heading", () => {
    render(<Footer />);
    const legalHeadings = screen.getAllByText("Légal");
    expect(legalHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("should render trust indicators", () => {
    render(<Footer />);
    expect(
      screen.getByText("Hébergement Cloudflare (edge)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Données agrégées, RGPD by design"),
    ).toBeInTheDocument();
  });

  it("should render copyright text with current year", () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(
      screen.getByText(`\u00A9 ${currentYear} Praedixa. Tous droits réservés.`),
    ).toBeInTheDocument();
  });

  it('should render "Conçu en France" text', () => {
    render(<Footer />);
    expect(screen.getByText("Conçu en France")).toBeInTheDocument();
  });

  it("should render the contact email link", () => {
    render(<Footer />);
    const emailLink = screen
      .getByText("steven.poivre@outlook.com")
      .closest("a");
    expect(emailLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("should render the Contact section heading", () => {
    render(<Footer />);
    // Multiple elements may contain "Contact" text
    const contactHeadings = screen.getAllByText("Contact");
    expect(contactHeadings.length).toBeGreaterThanOrEqual(1);
  });

  it("should accept a custom className", () => {
    const { container } = render(<Footer className="custom-class" />);
    expect(container.querySelector("footer")).toHaveClass("custom-class");
  });
});
