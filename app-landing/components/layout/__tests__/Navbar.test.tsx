import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

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

describe("Navbar", () => {
  beforeEach(() => {
    Object.defineProperty(window, "scrollY", { value: 0, writable: true });
  });

  it("renders the navigation with brand", () => {
    render(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("renders the desktop information architecture links", () => {
    render(<Navbar />);
    expect(screen.getAllByText("Enjeux").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Méthode").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cas d'usage").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Framework ROI").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FAQ").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the main CTA link to /devenir-pilote", () => {
    render(<Navbar />);
    const ctaCandidates = screen.getAllByText(/cohorte|qualification|pilote/i);
    const cta = ctaCandidates.find(
      (el) => el.closest("a")?.getAttribute("href") === "/devenir-pilote",
    );
    expect(cta).toBeDefined();
  });

  it("toggles mobile menu state", () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText("Ouvrir le menu");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    expect(screen.getByLabelText("Fermer le menu")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("closes mobile menu when resizing to desktop", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", { value: 1024 });
    fireEvent.resize(window);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("handles scroll event changes", () => {
    render(<Navbar />);

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
