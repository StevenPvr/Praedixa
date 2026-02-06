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

import { PilotSection } from "../PilotSection";
import {
  pilotColumns,
  pilotUrgencyText,
  pilotCtaText,
  pilotCtaHref,
} from "../../../lib/content/pilot-benefits";

describe("PilotSection", () => {
  it("should render without errors", () => {
    const { container } = render(<PilotSection />);
    expect(container.querySelector("#pilot")).toBeInTheDocument();
  });

  it("should have id=pilot for anchor navigation", () => {
    const { container } = render(<PilotSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "pilot");
  });

  it("should render the kicker text", () => {
    render(<PilotSection />);
    expect(screen.getByText("Diagnostic 48h")).toBeInTheDocument();
  });

  it("should render the section heading", () => {
    render(<PilotSection />);
    expect(
      screen.getByText("Votre carte des risques de sous-couverture en 48h"),
    ).toBeInTheDocument();
  });

  it("should render the subheading", () => {
    render(<PilotSection />);
    expect(
      screen.getByText(
        /Envoyez vos exports existants. En 48h, recevez une carte des risques/,
      ),
    ).toBeInTheDocument();
  });

  it("should render all column titles", () => {
    render(<PilotSection />);
    for (const col of pilotColumns) {
      expect(screen.getByText(col.title)).toBeInTheDocument();
    }
  });

  it("should render column items", () => {
    render(<PilotSection />);
    for (const col of pilotColumns) {
      for (const item of col.items) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    }
  });

  it("should render the urgency callout", () => {
    render(<PilotSection />);
    expect(screen.getByText(pilotUrgencyText)).toBeInTheDocument();
  });

  it("should render the CTA button with correct text and href", () => {
    render(<PilotSection />);
    const ctaLink = screen.getByText(pilotCtaText).closest("a");
    expect(ctaLink).toHaveAttribute("href", pilotCtaHref);
  });

  it("should highlight the 'avantages' column differently", () => {
    render(<PilotSection />);
    // The avantages column title should have text-amber-400 class
    const advantagesTitle = screen.getByText("Ce que vous gagnez");
    expect(advantagesTitle).toHaveClass("text-amber-400");
  });

  it("should accept a custom className", () => {
    const { container } = render(<PilotSection className="pilot-test" />);
    expect(container.querySelector("section")).toHaveClass("pilot-test");
  });
});
