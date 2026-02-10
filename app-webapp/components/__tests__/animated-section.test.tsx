import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnimatedSection } from "../animated-section";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      whileInView,
      initial,
      exit,
      variants,
      viewport,
      transition,
      animate,
      ...rest
    }: Record<string, unknown>) => (
      <div
        data-testid="motion-div"
        className={className as string}
        data-while-in-view={String(whileInView ?? "")}
        data-initial={String(initial ?? "")}
        data-exit={String(exit ?? "")}
        data-has-variants={String(Boolean(variants))}
        data-has-viewport={String(Boolean(viewport))}
        data-has-transition={String(Boolean(transition))}
        data-has-animate={String(Boolean(animate))}
        {...rest}
      >
        {children as React.ReactNode}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/lib/animations/config", () => ({
  sectionReveal: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
}));

describe("AnimatedSection", () => {
  describe("rendering", () => {
    it("renders children when show is true (default)", () => {
      render(<AnimatedSection>Contenu visible</AnimatedSection>);
      expect(screen.getByText("Contenu visible")).toBeInTheDocument();
    });

    it("does not render children when show is false", () => {
      render(<AnimatedSection show={false}>Contenu cache</AnimatedSection>);
      expect(screen.queryByText("Contenu cache")).not.toBeInTheDocument();
    });

    it("applies className to the motion div", () => {
      render(<AnimatedSection className="mt-6">Contenu</AnimatedSection>);
      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveClass("mt-6");
    });
  });

  describe("animation props", () => {
    it("passes sectionReveal variants with whileInView", () => {
      render(<AnimatedSection>Contenu</AnimatedSection>);
      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toHaveAttribute("data-initial", "hidden");
      expect(motionDiv).toHaveAttribute("data-while-in-view", "visible");
      expect(motionDiv).toHaveAttribute("data-exit", "hidden");
    });

    it("passes delay via transition prop when delay is specified", () => {
      const { container } = render(
        <AnimatedSection delay={0.3}>Contenu</AnimatedSection>,
      );
      const motionDiv = container.querySelector("[data-testid='motion-div']");
      expect(motionDiv).toBeInTheDocument();
    });

    it("does not pass transition when delay is undefined", () => {
      render(<AnimatedSection>Contenu</AnimatedSection>);
      const motionDiv = screen.getByTestId("motion-div");
      expect(motionDiv).toBeInTheDocument();
    });
  });

  describe("show toggle", () => {
    it("renders when show changes from false to true", () => {
      const { rerender } = render(
        <AnimatedSection show={false}>Contenu</AnimatedSection>,
      );
      expect(screen.queryByText("Contenu")).not.toBeInTheDocument();

      rerender(<AnimatedSection show={true}>Contenu</AnimatedSection>);
      expect(screen.getByText("Contenu")).toBeInTheDocument();
    });

    it("removes children when show changes from true to false", () => {
      const { rerender } = render(
        <AnimatedSection show={true}>Contenu</AnimatedSection>,
      );
      expect(screen.getByText("Contenu")).toBeInTheDocument();

      rerender(<AnimatedSection show={false}>Contenu</AnimatedSection>);
      expect(screen.queryByText("Contenu")).not.toBeInTheDocument();
    });
  });
});
