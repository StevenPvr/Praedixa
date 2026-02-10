import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "../empty-state";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const TestIcon = () => <svg data-testid="test-icon" aria-hidden="true" />;

describe("EmptyState", () => {
  describe("rendering", () => {
    it("renders the icon inside a circle container", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Aucun resultat"
          description="Aucune donnee disponible."
        />,
      );
      expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    });

    it("renders the title", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Aucun resultat"
          description="Description."
        />,
      );
      expect(screen.getByText("Aucun resultat")).toBeInTheDocument();
    });

    it("renders the description", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Aucune donnee disponible."
        />,
      );
      expect(screen.getByText("Aucune donnee disponible.")).toBeInTheDocument();
    });

    it("has dashed border and rounded-xl", () => {
      const { container } = render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
        />,
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain("border-dashed");
      expect(wrapper.className).toContain("rounded-xl");
    });

    it("renders icon circle with bg-gray-100 and rounded-full", () => {
      const { container } = render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
        />,
      );
      const circle = container.querySelector(".rounded-full");
      expect(circle).toBeInTheDocument();
      expect(circle?.className).toContain("bg-gray-100");
    });
  });

  describe("CTA with link (ctaHref)", () => {
    it("renders a link when ctaHref and ctaLabel are provided", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          ctaLabel="Importer"
          ctaHref="/import"
        />,
      );
      const link = screen.getByRole("link", { name: "Importer" });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/import");
    });

    it("does not render a link when ctaLabel is missing", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          ctaHref="/import"
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("link meets 44px touch target", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          ctaLabel="Importer"
          ctaHref="/import"
        />,
      );
      const link = screen.getByRole("link", { name: "Importer" });
      expect(link).toHaveClass("min-h-[44px]");
    });
  });

  describe("CTA with button (onAction)", () => {
    it("renders a button when onAction is provided", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          onAction={onAction}
        />,
      );
      const btn = screen.getByRole("button", { name: "Commencer" });
      expect(btn).toBeInTheDocument();
    });

    it("calls onAction when the button is clicked", () => {
      const onAction = vi.fn();
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          onAction={onAction}
        />,
      );
      fireEvent.click(screen.getByRole("button"));
      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it("uses custom ctaLabel on the button", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          onAction={() => {}}
          ctaLabel="Ajouter"
        />,
      );
      expect(
        screen.getByRole("button", { name: "Ajouter" }),
      ).toBeInTheDocument();
    });

    it("uses default label 'Commencer' when ctaLabel is not provided", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          onAction={() => {}}
        />,
      );
      expect(
        screen.getByRole("button", { name: "Commencer" }),
      ).toBeInTheDocument();
    });

    it("button meets 44px touch target", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          onAction={() => {}}
        />,
      );
      const btn = screen.getByRole("button", { name: "Commencer" });
      expect(btn).toHaveClass("min-h-[44px]");
    });

    it("prefers link over button when both ctaHref and onAction are provided", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
          ctaLabel="Action"
          ctaHref="/test"
          onAction={() => {}}
        />,
      );
      expect(screen.getByRole("link", { name: "Action" })).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("no CTA", () => {
    it("does not render a button or link when no CTA props are provided", () => {
      render(
        <EmptyState
          icon={<TestIcon />}
          title="Titre"
          description="Description"
        />,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});
