import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaggeredGrid, StaggeredItem } from "../staggered-grid";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      whileInView,
      initial,
      variants,
      viewport,
      transition,
      ...rest
    }: Record<string, unknown> & { children?: React.ReactNode }) => (
      <div
        className={className as string}
        data-while-in-view={String(whileInView ?? "")}
        data-initial={String(initial ?? "")}
        data-has-variants={String(Boolean(variants))}
        data-has-viewport={String(Boolean(viewport))}
        data-has-transition={String(Boolean(transition))}
        {...rest}
      >
        {children}
      </div>
    ),
  },
}));

vi.mock("@/lib/animations/config", () => ({
  staggerContainer: {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  },
  staggerItem: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
}));

describe("StaggeredGrid", () => {
  describe("rendering", () => {
    it("renders children inside the grid", () => {
      render(
        <StaggeredGrid>
          <div>Item 1</div>
          <div>Item 2</div>
        </StaggeredGrid>,
      );
      expect(screen.getByText("Item 1")).toBeInTheDocument();
      expect(screen.getByText("Item 2")).toBeInTheDocument();
    });

    it("applies default 3-column grid class", () => {
      const { container } = render(
        <StaggeredGrid>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-3");
    });

    it("applies custom column class", () => {
      const { container } = render(
        <StaggeredGrid columns={2}>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-2");
    });

    it("applies 4-column grid class", () => {
      const { container } = render(
        <StaggeredGrid columns={4}>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-4");
    });

    it("applies 1-column grid class", () => {
      const { container } = render(
        <StaggeredGrid columns={1}>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-1");
    });

    it("falls back to grid-cols-3 for unsupported column count", () => {
      const { container } = render(
        <StaggeredGrid columns={7}>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("grid-cols-3");
    });

    it("applies custom className to the grid container", () => {
      const { container } = render(
        <StaggeredGrid className="mt-8">
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("mt-8");
    });

    it("has gap-4 class", () => {
      const { container } = render(
        <StaggeredGrid>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain("gap-4");
    });
  });

  describe("animation props", () => {
    it("passes stagger container variants with whileInView", () => {
      const { container } = render(
        <StaggeredGrid>
          <div>Item</div>
        </StaggeredGrid>,
      );
      const grid = container.firstChild as HTMLElement;
      expect(grid).toHaveAttribute("data-initial", "hidden");
      expect(grid).toHaveAttribute("data-while-in-view", "visible");
    });
  });
});

describe("StaggeredItem", () => {
  describe("rendering", () => {
    it("renders children", () => {
      render(<StaggeredItem>Contenu item</StaggeredItem>);
      expect(screen.getByText("Contenu item")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(
        <StaggeredItem className="p-4">Contenu</StaggeredItem>,
      );
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain("p-4");
    });

    it("renders without className", () => {
      const { container } = render(<StaggeredItem>Contenu</StaggeredItem>);
      const item = container.firstChild as HTMLElement;
      expect(item).toBeInTheDocument();
    });
  });
});
