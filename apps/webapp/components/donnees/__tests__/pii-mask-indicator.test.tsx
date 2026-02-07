import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PiiMaskIndicator } from "../pii-mask-indicator";

describe("PiiMaskIndicator", () => {
  it("renders the masked text indicator", () => {
    render(<PiiMaskIndicator />);
    expect(screen.getByText("***")).toBeInTheDocument();
  });

  it("has title attribute for PII tooltip", () => {
    const { container } = render(<PiiMaskIndicator />);
    const span = container.querySelector("span");
    expect(span).toHaveAttribute("title", "Donnee masquee (PII)");
  });

  it("renders the shield icon as aria-hidden", () => {
    const { container } = render(<PiiMaskIndicator />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies mono font class to mask text", () => {
    render(<PiiMaskIndicator />);
    const maskText = screen.getByText("***");
    expect(maskText.className).toContain("font-mono");
  });
});
