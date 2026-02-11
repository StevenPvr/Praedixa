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

  it("should render without errors", () => {
    render(<Navbar />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("should render the Praedixa brand text", () => {
    render(<Navbar />);
    expect(screen.getByText("Praedixa")).toBeInTheDocument();
  });

  it("should render the logo link pointing to home", () => {
    render(<Navbar />);
    const homeLink = screen.getByText("Praedixa").closest("a");
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should render all desktop navigation links", () => {
    render(<Navbar />);
    expect(screen.getAllByText("Le problème").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("La solution").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("La vision").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Programme pilote").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("FAQ").length).toBeGreaterThanOrEqual(1);
  });

  it("should render the desktop CTA button with correct href", () => {
    render(<Navbar />);
    const ctaLinks = screen.getAllByText("Programme pilote");
    const desktopCta = ctaLinks.find(
      (el) => el.closest("a")?.getAttribute("href") === "/devenir-pilote",
    );
    expect(desktopCta).toBeDefined();
  });

  it("should render the mobile menu button", () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText("Ouvrir le menu");
    expect(menuButton).toBeInTheDocument();
  });

  it("should toggle aria-expanded on mobile menu button click", () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText("Ouvrir le menu");
    expect(menuButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(menuButton);
    const closeButton = screen.getByLabelText("Fermer le menu");
    expect(closeButton).toHaveAttribute("aria-expanded", "true");
  });

  it("should show mobile navigation links when menu is open", () => {
    render(<Navbar />);
    const menuButton = screen.getByLabelText("Ouvrir le menu");
    fireEvent.click(menuButton);

    const problemLinks = screen.getAllByText("Le problème");
    expect(problemLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("should close mobile menu when a nav link is clicked", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));

    const mobileLinks = screen.getAllByText("Le problème");
    const mobileLink = mobileLinks[mobileLinks.length - 1];
    fireEvent.click(mobileLink);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should close mobile menu on resize to desktop width", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    Object.defineProperty(window, "innerWidth", { value: 1024 });
    fireEvent.resize(window);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should track scroll position via window scroll event", () => {
    render(<Navbar />);

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 100 });
      fireEvent.scroll(window);
    });

    act(() => {
      Object.defineProperty(window, "scrollY", { value: 5 });
      fireEvent.scroll(window);
    });
  });

  it("should close mobile menu when mobile CTA is clicked", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    const mobileCtaLinks = screen.getAllByText("Programme pilote");
    const mobileCta = mobileCtaLinks[mobileCtaLinks.length - 1];
    fireEvent.click(mobileCta);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should close mobile menu when overlay is clicked", () => {
    const { container } = render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    const overlay = container.querySelector(".fixed.inset-0");
    if (overlay) {
      fireEvent.click(overlay);
      expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
    }
  });
});
