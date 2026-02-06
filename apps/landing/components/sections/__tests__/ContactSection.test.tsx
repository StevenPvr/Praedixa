import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  return createFramerMotionMock();
});

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { ContactSection } from "../ContactSection";

describe("ContactSection", () => {
  it("should render without errors", () => {
    const { container } = render(<ContactSection />);
    expect(container.querySelector("#contact")).toBeInTheDocument();
  });

  it("should have id=contact for anchor navigation", () => {
    const { container } = render(<ContactSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "contact");
  });

  it("should render the kicker text", () => {
    render(<ContactSection />);
    expect(screen.getByText(/Passez à l'action/)).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<ContactSection />);
    expect(
      screen.getByText("Demandez votre diagnostic de couverture"),
    ).toBeInTheDocument();
  });

  it("should render the section description", () => {
    render(<ContactSection />);
    expect(
      screen.getByText(/En 48h, une carte des risques de sous-couverture/),
    ).toBeInTheDocument();
  });

  it("should render the primary CTA linking to /devenir-pilote", () => {
    render(<ContactSection />);
    const ctaLink = screen.getByText("Demander un diagnostic 48h").closest("a");
    expect(ctaLink).toHaveAttribute("href", "/devenir-pilote");
  });

  it("should render the secondary mailto CTA", () => {
    render(<ContactSection />);
    const mailtoLink = screen
      .getByText("Ou écrivez-nous directement")
      .closest("a");
    expect(mailtoLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("should render all trust indicators", () => {
    render(<ContactSection />);
    const trustItems = [
      "Diagnostic gratuit",
      "Résultat en 48h",
      "Sans intégration IT",
      "Données agrégées uniquement",
      "Sans engagement",
    ];
    for (const item of trustItems) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("should accept a custom className", () => {
    const { container } = render(<ContactSection className="contact-test" />);
    expect(container.querySelector("section")).toHaveClass("contact-test");
  });
});
