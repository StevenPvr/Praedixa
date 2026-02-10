import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { TrustBand } from "../TrustBand";
import {
  trustLogos,
  trustBandTitle,
  trustBandSubtitle,
} from "../../../lib/content/trust-logos";

describe("TrustBand", () => {
  it("should render without errors", () => {
    const { container } = render(<TrustBand />);
    expect(container.querySelector("section")).toBeInTheDocument();
  });

  it("should have aria-label set to the trust band title", () => {
    const { container } = render(<TrustBand />);
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-label",
      trustBandTitle,
    );
  });

  it("should render the trust band title text", () => {
    render(<TrustBand />);
    expect(screen.getByText(trustBandTitle)).toBeInTheDocument();
  });

  it("should render the trust band subtitle", () => {
    render(<TrustBand />);
    expect(screen.getByText(trustBandSubtitle)).toBeInTheDocument();
  });

  it("should render placeholder logos for each trust logo", () => {
    render(<TrustBand />);
    // Each logo appears twice (original + duplicate for marquee)
    const logoElements = screen.getAllByText(trustLogos[0].label);
    expect(logoElements.length).toBe(trustLogos.length * 2);
  });

  it("should render a duplicate set of logos for the marquee animation", () => {
    const { container } = render(<TrustBand />);
    // The duplicate set is inside a div with aria-hidden="true"
    const hiddenDuplicate = container.querySelector('[aria-hidden="true"]');
    expect(hiddenDuplicate).toBeInTheDocument();
  });

  it("should apply marquee animation styling", () => {
    const { container } = render(<TrustBand />);
    const marqueeTrack = container.querySelector(".marquee-track");
    expect(marqueeTrack).toBeInTheDocument();
  });
});
