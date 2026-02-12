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

import { HeroSection } from "../HeroSection";
import { heroContent } from "../../../lib/content/hero-content";

describe("HeroSection", () => {
  it("renders with anchor id and headline", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("hero-section")).toHaveAttribute("id", "hero");

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain(heroContent.headlineHighlight);
  });

  it("renders key copy blocks from content source", () => {
    render(<HeroSection />);
    expect(screen.getByText(heroContent.kicker)).toBeInTheDocument();
    expect(screen.getByText(heroContent.subtitle)).toBeInTheDocument();

    for (const bullet of heroContent.bullets) {
      expect(screen.getByText(bullet.text)).toBeInTheDocument();
    }

    for (const badge of heroContent.trustBadges) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
  });

  it("renders both primary and secondary CTAs", () => {
    render(<HeroSection />);

    const primaryCta = screen
      .getByText(heroContent.ctaPrimary.text)
      .closest("a");
    const secondaryCta = screen
      .getByText(heroContent.ctaSecondary.text)
      .closest("a");

    expect(primaryCta).toHaveAttribute("href", heroContent.ctaPrimary.href);
    expect(secondaryCta).toHaveAttribute("href", heroContent.ctaSecondary.href);
  });

  it("accepts custom className", () => {
    render(<HeroSection className="hero-test" />);
    expect(screen.getByTestId("hero-section")).toHaveClass("hero-test");
  });
});
