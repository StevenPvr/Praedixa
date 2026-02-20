import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
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
import { fr } from "../../../lib/i18n/dictionaries/fr";

const defaultProps = { dict: fr, locale: "fr" as const };

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

    const { container } = render(<StickyMobileCTA {...defaultProps} />);
    expect(screen.getByText(fr.stickyCta.text)).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");

    document.body.removeChild(heroEl);
  });

  it("links to pilot page", () => {
    const heroEl = setup();

    render(<StickyMobileCTA {...defaultProps} />);
    const link = screen.getByText(fr.stickyCta.text).closest("a");
    expect(link).toHaveAttribute("href", "/fr/devenir-pilote");

    document.body.removeChild(heroEl);
  });

  it("becomes visible when hero exits viewport and restores when visible", () => {
    const heroEl = setup();

    const { container } = render(<StickyMobileCTA {...defaultProps} />);

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

    render(<StickyMobileCTA {...defaultProps} />);
    const link = screen.getByText(fr.stickyCta.text).closest("a");
    expect(link).toHaveAttribute("tabindex", "-1");

    act(() => {
      triggerIntersection(false, heroEl);
    });
    expect(link).toHaveAttribute("tabindex", "0");

    document.body.removeChild(heroEl);
  });
});
