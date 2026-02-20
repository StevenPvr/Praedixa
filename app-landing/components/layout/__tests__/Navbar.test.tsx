import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../testing/utils/mocks/framer-motion");
  return createFramerMotionMock();
});

vi.mock("next/link", () => ({
  default: ({
    children,
    onClick,
    ...props
  }: React.PropsWithChildren<
    {
      onClick?: (e: React.MouseEvent) => void;
    } & Record<string, unknown>
  >) => (
    <a
      {...props}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  ),
}));

import { Navbar } from "../Navbar";
import { fr } from "../../../lib/i18n/dictionaries/fr";

const defaultProps = { dict: fr, locale: "fr" as const };

describe("Navbar", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  it("renders the navigation with brand", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("renders the desktop information architecture links", () => {
    render(<Navbar {...defaultProps} />);
    expect(screen.getAllByText("Solution").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Sécurité").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FAQ").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the main CTA link to pilot page", () => {
    render(<Navbar {...defaultProps} />);
    const cta = screen.getByText(fr.nav.ctaPrimary).closest("a");
    expect(cta).toHaveAttribute("href", "/fr/devenir-pilote");
  });

  it("toggles mobile menu state", () => {
    render(<Navbar {...defaultProps} />);
    const menuButton = screen.getByLabelText("Open menu");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    expect(screen.getByLabelText("Close menu")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes mobile menu when resizing to desktop", () => {
    render(<Navbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Open menu"));
    expect(screen.getByLabelText("Close menu")).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", { value: 1024 });
    fireEvent.resize(window);

    expect(screen.getByLabelText("Open menu")).toBeInTheDocument();
  });

  it("handles scroll event changes", () => {
    render(<Navbar {...defaultProps} />);

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100 });
      fireEvent.scroll(window);
    });

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 0 });
      fireEvent.scroll(window);
    });
  });
});
