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

import { PilotSection } from "../PilotSection";
import {
  pilotColumns,
  pilotUrgencyText,
  pilotCtaText,
  pilotCtaHref,
} from "../../../lib/content/pilot-benefits";

describe("PilotSection", () => {
  it("renders with id=pilot", () => {
    const { container } = render(<PilotSection />);
    expect(container.querySelector("section")).toHaveAttribute("id", "pilot");
  });

  it("renders cohort columns and urgency callout", () => {
    render(<PilotSection />);

    for (const column of pilotColumns) {
      expect(screen.getByText(column.title)).toBeInTheDocument();
      for (const item of column.items) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    }

    expect(screen.getByText(pilotUrgencyText)).toBeInTheDocument();
  });

  it("renders CTA link", () => {
    render(<PilotSection />);
    const cta = screen.getByText(pilotCtaText).closest("a");
    expect(cta).toHaveAttribute("href", pilotCtaHref);
  });
});
