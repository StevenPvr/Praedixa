import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArbitrageSkeleton } from "../arbitrage-skeleton";

vi.mock("@praedixa/ui", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

describe("ArbitrageSkeleton", () => {
  it("renders container with aria-busy='true'", () => {
    const { container } = render(<ArbitrageSkeleton />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
  });

  it("renders container with aria-label describing loading state", () => {
    const { container } = render(<ArbitrageSkeleton />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper).toHaveAttribute(
      "aria-label",
      "Chargement des options d'arbitrage",
    );
  });

  it("renders 4 OptionCardSkeleton cards with role='status'", () => {
    render(<ArbitrageSkeleton />);
    const statusElements = screen.getAllByRole("status");
    expect(statusElements).toHaveLength(4);
  });

  it("each OptionCardSkeleton has aria-label='Chargement'", () => {
    render(<ArbitrageSkeleton />);
    const statusElements = screen.getAllByRole("status");
    for (const el of statusElements) {
      expect(el).toHaveAttribute("aria-label", "Chargement");
    }
  });

  it("renders context card skeleton (first child with border class)", () => {
    const { container } = render(<ArbitrageSkeleton />);
    // The context card is the first direct child div inside the wrapper
    const wrapper = container.firstElementChild as HTMLElement;
    const contextCard = wrapper.children[0] as HTMLElement;
    expect(contextCard.className).toContain("rounded-card");
    expect(contextCard.className).toContain("border");
  });

  it("renders 2x2 grid container for option cards", () => {
    const { container } = render(<ArbitrageSkeleton />);
    const wrapper = container.firstElementChild as HTMLElement;
    const grid = wrapper.children[1] as HTMLElement;
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("renders multiple Skeleton elements for visual structure", () => {
    render(<ArbitrageSkeleton />);
    const skeletons = screen.getAllByTestId("skeleton");
    // Context card has multiple skeletons + each of 4 option cards has many skeletons
    expect(skeletons.length).toBeGreaterThan(10);
  });
});
