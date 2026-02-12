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
  it("renders title and subtitle", () => {
    const { container } = render(<TrustBand />);
    expect(container.querySelector("section")).toHaveAttribute(
      "aria-label",
      trustBandTitle,
    );
    expect(screen.getByText(trustBandTitle)).toBeInTheDocument();
    expect(screen.getByText(trustBandSubtitle)).toBeInTheDocument();
  });

  it("renders all sector chips and duplicate marquee set", () => {
    const { container } = render(<TrustBand />);

    for (const logo of trustLogos) {
      const matches = screen.getAllByText(logo.label);
      expect(matches.length).toBe(2);
    }

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    expect(container.querySelector(".marquee-track")).toBeInTheDocument();
  });
});
