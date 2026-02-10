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
  it("should render without errors", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("hero-section")).toBeInTheDocument();
  });

  it("should have id=hero for anchor navigation", () => {
    render(<HeroSection />);
    expect(screen.getByTestId("hero-section")).toHaveAttribute("id", "hero");
  });

  it("should render the kicker text", () => {
    render(<HeroSection />);
    expect(screen.getByText(heroContent.kicker)).toBeInTheDocument();
  });

  it("should render the headline", () => {
    render(<HeroSection />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain(heroContent.headlineHighlight);
  });

  it("should render the subtitle", () => {
    render(<HeroSection />);
    expect(screen.getByText(heroContent.subtitle)).toBeInTheDocument();
  });

  it("should render all bullet points", () => {
    render(<HeroSection />);
    for (const bullet of heroContent.bullets) {
      expect(screen.getByText(bullet.text)).toBeInTheDocument();
    }
  });

  it("should render the primary CTA with correct href", () => {
    render(<HeroSection />);
    const primaryCta = screen.getByText(heroContent.ctaPrimary.text);
    expect(primaryCta.closest("a")).toHaveAttribute(
      "href",
      heroContent.ctaPrimary.href,
    );
  });

  it("should render the secondary CTA with correct href", () => {
    render(<HeroSection />);
    const secondaryCta = screen.getByText(heroContent.ctaSecondary.text);
    expect(secondaryCta.closest("a")).toHaveAttribute(
      "href",
      heroContent.ctaSecondary.href,
    );
  });

  it("should render all trust badges", () => {
    render(<HeroSection />);
    for (const badge of heroContent.trustBadges) {
      expect(screen.getByText(badge)).toBeInTheDocument();
    }
  });

  it("should accept a custom className", () => {
    render(<HeroSection className="custom-test" />);
    expect(screen.getByTestId("hero-section")).toHaveClass("custom-test");
  });
});
