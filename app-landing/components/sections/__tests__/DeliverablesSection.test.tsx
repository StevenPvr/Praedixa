import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

import { DeliverablesSection } from "../DeliverablesSection";
import {
  CHECKLIST_ITEMS,
  TRUST_SIGNALS,
} from "../../../lib/content/deliverables-content";

describe("DeliverablesSection", () => {
  it("renders with id=deliverables", () => {
    const { container } = render(<DeliverablesSection />);
    expect(container.querySelector("section")).toHaveAttribute(
      "id",
      "deliverables",
    );
  });

  it("renders checklist and trust signals", () => {
    render(<DeliverablesSection />);

    for (const item of CHECKLIST_ITEMS) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }

    for (const signal of TRUST_SIGNALS) {
      expect(screen.getByText(signal.title)).toBeInTheDocument();
      expect(screen.getByText(signal.text)).toBeInTheDocument();
    }
  });

  it("renders ROI frame markers", () => {
    render(<DeliverablesSection />);
    expect(screen.getByText("Coût de non-action")).toBeInTheDocument();
    expect(screen.getByText("Options d'intervention")).toBeInTheDocument();
    expect(screen.getByText("Impact démontré")).toBeInTheDocument();
  });
});
