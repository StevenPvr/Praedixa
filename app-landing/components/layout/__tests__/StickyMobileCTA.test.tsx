import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  triggerIntersection,
  resetIntersectionObserver,
} from "../../../../testing/utils/mocks/intersection-observer";

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { StickyMobileCTA } from "../StickyMobileCTA";

describe("StickyMobileCTA", () => {
  beforeEach(() => {
    resetIntersectionObserver();
  });

  function setup() {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);
    return heroEl;
  }

  it("renders CTA link and default hidden state", () => {
    const heroEl = setup();

    const { container } = render(<StickyMobileCTA />);
    expect(
      screen.getByText("Qualification pilote en 4-5 min"),
    ).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");

    document.body.removeChild(heroEl);
  });

  it("links to /devenir-pilote", () => {
    const heroEl = setup();

    render(<StickyMobileCTA />);
    const link = screen
      .getByText("Qualification pilote en 4-5 min")
      .closest("a");
    expect(link).toHaveAttribute("href", "/devenir-pilote");

    document.body.removeChild(heroEl);
  });

  it("becomes visible when hero exits viewport and restores when visible", () => {
    const heroEl = setup();

    const { container } = render(<StickyMobileCTA />);

    act(() => {
      triggerIntersection(false, heroEl);
    });
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "false");

    act(() => {
      triggerIntersection(true, heroEl);
    });
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");

    document.body.removeChild(heroEl);
  });

  it("updates tabIndex based on visibility", () => {
    const heroEl = setup();

    render(<StickyMobileCTA />);
    const link = screen
      .getByText("Qualification pilote en 4-5 min")
      .closest("a");
    expect(link).toHaveAttribute("tabindex", "-1");

    act(() => {
      triggerIntersection(false, heroEl);
    });
    expect(link).toHaveAttribute("tabindex", "0");

    document.body.removeChild(heroEl);
  });
});
