import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  triggerIntersection,
  resetIntersectionObserver,
} from "../../../../../test-utils/mocks/intersection-observer";

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

  it("should render without errors", () => {
    // Add a hero element the component looks for
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    render(<StickyMobileCTA />);
    expect(screen.getByText("Obtenir mon diagnostic")).toBeInTheDocument();

    document.body.removeChild(heroEl);
  });

  it("should render a link to /devenir-pilote", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    render(<StickyMobileCTA />);
    const link = screen.getByText("Obtenir mon diagnostic").closest("a");
    expect(link).toHaveAttribute("href", "/devenir-pilote");

    document.body.removeChild(heroEl);
  });

  it("should be hidden by default (aria-hidden true)", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    const { container } = render(<StickyMobileCTA />);
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");

    document.body.removeChild(heroEl);
  });

  it("should become visible when hero scrolls out of view", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    const { container } = render(<StickyMobileCTA />);

    // Simulate hero going out of view using the project's mock
    act(() => {
      triggerIntersection(false, heroEl);
    });

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveAttribute("aria-hidden", "false");

    document.body.removeChild(heroEl);
  });

  it("should hide again when hero comes back into view", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    const { container } = render(<StickyMobileCTA />);

    // Hero leaves viewport
    act(() => {
      triggerIntersection(false, heroEl);
    });
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "false");

    // Hero re-enters viewport
    act(() => {
      triggerIntersection(true, heroEl);
    });
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");

    document.body.removeChild(heroEl);
  });

  it("should set tabIndex=-1 when not visible", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    render(<StickyMobileCTA />);
    const link = screen.getByText("Obtenir mon diagnostic").closest("a");
    expect(link).toHaveAttribute("tabindex", "-1");

    document.body.removeChild(heroEl);
  });

  it("should set tabIndex=0 when visible", () => {
    const heroEl = document.createElement("div");
    heroEl.id = "hero";
    document.body.appendChild(heroEl);

    render(<StickyMobileCTA />);

    act(() => {
      triggerIntersection(false, heroEl);
    });

    const link = screen.getByText("Obtenir mon diagnostic").closest("a");
    expect(link).toHaveAttribute("tabindex", "0");

    document.body.removeChild(heroEl);
  });
});
