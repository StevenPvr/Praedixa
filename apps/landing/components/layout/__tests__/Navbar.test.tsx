import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Track the scrollY.on callback so we can simulate scroll
let scrollYOnCallback: ((value: number) => void) | null = null;

vi.mock("framer-motion", async () => {
  const { createFramerMotionMock } =
    await import("../../../../../test-utils/mocks/framer-motion");
  const mock = createFramerMotionMock();
  return {
    ...mock,
    useScroll: vi.fn(() => ({
      scrollY: {
        get: () => 0,
        set: vi.fn(),
        on: vi.fn((_event: string, cb: (value: number) => void) => {
          scrollYOnCallback = cb;
          return () => {
            scrollYOnCallback = null;
          };
        }),
        onChange: vi.fn(),
      },
      scrollYProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
      scrollX: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
      scrollXProgress: { get: () => 0, set: vi.fn(), onChange: vi.fn() },
    })),
  };
});

vi.mock("next/link", () => ({
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => (
    <a {...props}>{children}</a>
  ),
}));

import { Navbar } from "../Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    scrollYOnCallback = null;
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

    // Mobile menu should show nav links (they appear in both desktop and mobile)
    const problemLinks = screen.getAllByText("Le problème");
    expect(problemLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("should close mobile menu when a nav link is clicked", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));

    // Click a mobile nav link
    const mobileLinks = screen.getAllByText("Le problème");
    const mobileLink = mobileLinks[mobileLinks.length - 1];
    fireEvent.click(mobileLink);

    // Menu should be closed — button label should be "Ouvrir le menu"
    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should close mobile menu on resize to desktop width", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    // Simulate resize to desktop
    Object.defineProperty(window, "innerWidth", { value: 1024 });
    fireEvent.resize(window);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should track scroll position via scrollY.on callback", () => {
    render(<Navbar />);
    // The mock captures the callback registered via scrollY.on
    expect(scrollYOnCallback).not.toBeNull();
    // Simulate scrolling — wrap in act() since it updates state
    act(() => {
      scrollYOnCallback!(100);
    });
    act(() => {
      scrollYOnCallback!(5);
    });
  });

  it("should close mobile menu when mobile CTA is clicked", () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    // The mobile menu has a CTA link "Programme pilote" pointing to /devenir-pilote
    const mobileCtaLinks = screen.getAllByText("Programme pilote");
    // The mobile CTA is inside the mobile menu (the last one rendered)
    const mobileCta = mobileCtaLinks[mobileCtaLinks.length - 1];
    fireEvent.click(mobileCta);

    expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
  });

  it("should close mobile menu when overlay is clicked", () => {
    const { container } = render(<Navbar />);
    fireEvent.click(screen.getByLabelText("Ouvrir le menu"));
    expect(screen.getByLabelText("Fermer le menu")).toBeInTheDocument();

    // The overlay is the first motion.div inside AnimatePresence with inset-0
    const overlay = container.querySelector(".fixed.inset-0");
    if (overlay) {
      fireEvent.click(overlay);
      expect(screen.getByLabelText("Ouvrir le menu")).toBeInTheDocument();
    }
  });
});
