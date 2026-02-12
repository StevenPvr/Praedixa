import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
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
import { TRUST_ITEMS } from "../../../lib/content/contact-content";

describe("ContactSection", () => {
  it("renders with id=contact", () => {
    const { container } = render(<ContactSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "contact");
  });

  it("renders contact CTAs", () => {
    render(<ContactSection />);

    const pilotLink = screen
      .getByText("Demander une qualification pilote")
      .closest("a");
    expect(pilotLink).toHaveAttribute("href", "/devenir-pilote");

    const mailtoLink = screen.getByText("Écrire à l'équipe").closest("a");
    expect(mailtoLink).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:"),
    );
  });

  it("renders all trust items", () => {
    render(<ContactSection />);

    for (const item of TRUST_ITEMS) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });
});
