import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBanner } from "../status-banner";

// Mock @praedixa/ui cn utility
vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

describe("StatusBanner", () => {
  /* --- Rendering --- */

  describe("rendering", () => {
    it("renders children text", () => {
      render(<StatusBanner variant="success">Message de test</StatusBanner>);
      expect(screen.getByText("Message de test")).toBeInTheDocument();
    });

    it("renders with role=status for accessibility", () => {
      render(<StatusBanner variant="success">Contenu</StatusBanner>);
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders an icon with aria-hidden", () => {
      const { container } = render(
        <StatusBanner variant="success">Contenu</StatusBanner>,
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute("aria-hidden", "true");
    });
  });

  /* --- Variants --- */

  describe("variants", () => {
    it("applies success styles", () => {
      render(<StatusBanner variant="success">Succes</StatusBanner>);
      const banner = screen.getByRole("status");
      expect(banner.className).toContain("bg-emerald-50/80");
      expect(banner.className).toContain("text-emerald-900");
    });

    it("applies warning styles", () => {
      render(<StatusBanner variant="warning">Attention</StatusBanner>);
      const banner = screen.getByRole("status");
      expect(banner.className).toContain("bg-amber-50/85");
      expect(banner.className).toContain("text-amber-900");
    });

    it("applies danger styles", () => {
      render(<StatusBanner variant="danger">Danger</StatusBanner>);
      const banner = screen.getByRole("status");
      expect(banner.className).toContain("bg-rose-50/85");
      expect(banner.className).toContain("text-rose-900");
    });
  });

  /* --- Custom className --- */

  describe("custom className", () => {
    it("appends custom className to the container", () => {
      render(
        <StatusBanner variant="success" className="mt-4">
          Test
        </StatusBanner>,
      );
      const banner = screen.getByRole("status");
      expect(banner.className).toContain("mt-4");
    });
  });
});
