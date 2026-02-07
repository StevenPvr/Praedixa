import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "../sidebar";

// Mock @praedixa/ui cn utility
vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

// Mock PraedixaLogo component
vi.mock("../praedixa-logo", () => ({
  PraedixaLogo: (props: Record<string, unknown>) => (
    <svg data-testid="praedixa-logo" {...props} />
  ),
}));

describe("Sidebar", () => {
  const defaultProps = {
    currentPath: "/dashboard",
    userRole: "admin" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── Rendering ─────────────────────────── */

  describe("rendering", () => {
    it("renders the aside element", () => {
      const { container } = render(<Sidebar {...defaultProps} />);
      expect(container.querySelector("aside")).toBeInTheDocument();
    });

    it("renders the Praedixa logo text when not collapsed", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Praedixa")).toBeInTheDocument();
    });

    it("renders the PraedixaLogo SVG", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
    });

    it("hides the Praedixa text when collapsed", () => {
      render(<Sidebar {...defaultProps} collapsed={true} />);
      expect(screen.queryByText("Praedixa")).not.toBeInTheDocument();
    });

    it("renders the main navigation with correct aria-label", () => {
      render(<Sidebar {...defaultProps} />);
      expect(
        screen.getByRole("navigation", { name: /navigation principale/i }),
      ).toBeInTheDocument();
    });
  });

  /* ─── Navigation items ──────────────────── */

  describe("navigation items", () => {
    it("renders all main nav items for admin", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Donnees")).toBeInTheDocument();
      expect(screen.getByText("Previsions")).toBeInTheDocument();
      expect(screen.getByText("Arbitrage")).toBeInTheDocument();
      expect(screen.getByText("Decisions")).toBeInTheDocument();
      expect(screen.getByText("Rapports")).toBeInTheDocument();
    });

    it("renders Parametres for admin users", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      expect(screen.getByText("Parametres")).toBeInTheDocument();
    });

    it("hides Parametres for manager users", () => {
      render(<Sidebar {...defaultProps} userRole="manager" />);
      expect(screen.queryByText("Parametres")).not.toBeInTheDocument();
    });

    it("hides Parametres for viewer users", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      expect(screen.queryByText("Parametres")).not.toBeInTheDocument();
    });

    it("renders correct hrefs for nav items", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute(
        "href",
        "/dashboard",
      );
      expect(screen.getByText("Donnees").closest("a")).toHaveAttribute(
        "href",
        "/donnees",
      );
      expect(screen.getByText("Arbitrage").closest("a")).toHaveAttribute(
        "href",
        "/arbitrage",
      );
      expect(screen.getByText("Decisions").closest("a")).toHaveAttribute(
        "href",
        "/decisions",
      );
      expect(screen.getByText("Rapports").closest("a")).toHaveAttribute(
        "href",
        "/rapports",
      );
    });
  });

  /* ─── Active state ──────────────────────── */

  describe("active state", () => {
    it("marks the current page with aria-current=page", () => {
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);
      const dashboardLink = screen.getByText("Dashboard").closest("a");
      expect(dashboardLink).toHaveAttribute("aria-current", "page");
    });

    it("does not mark non-active items with aria-current", () => {
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);
      const donneesLink = screen.getByText("Donnees").closest("a");
      expect(donneesLink).not.toHaveAttribute("aria-current");
    });

    it("marks Donnees as active when currentPath is /donnees", () => {
      render(<Sidebar {...defaultProps} currentPath="/donnees" />);
      const donneesLink = screen.getByText("Donnees").closest("a");
      expect(donneesLink).toHaveAttribute("aria-current", "page");
    });
  });

  /* ─── Submenu (Previsions children) ─────── */

  describe("submenu behavior", () => {
    it("does not show sub-items when parent is not expanded", () => {
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);
      expect(screen.queryByText("Capacite humaine")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Capacite marchandise"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Vue globale")).not.toBeInTheDocument();
    });

    it("toggles sub-items when clicking Previsions", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      // Click Previsions to expand
      await user.click(screen.getByText("Previsions"));

      expect(screen.getByText("Capacite humaine")).toBeInTheDocument();
      expect(screen.getByText("Capacite marchandise")).toBeInTheDocument();
      expect(screen.getByText("Vue globale")).toBeInTheDocument();
    });

    it("collapses sub-items when clicking Previsions again", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Previsions"));
      expect(screen.getByText("Capacite humaine")).toBeInTheDocument();

      await user.click(screen.getByText("Previsions"));
      expect(screen.queryByText("Capacite humaine")).not.toBeInTheDocument();
    });

    it("auto-expands the section containing the current path", () => {
      render(<Sidebar {...defaultProps} currentPath="/previsions/humaine" />);
      expect(screen.getByText("Capacite humaine")).toBeInTheDocument();
      expect(screen.getByText("Capacite marchandise")).toBeInTheDocument();
      expect(screen.getByText("Vue globale")).toBeInTheDocument();
    });

    it("marks child as active when path starts with child href", () => {
      render(<Sidebar {...defaultProps} currentPath="/previsions/humaine" />);
      const childLink = screen.getByText("Capacite humaine").closest("a");
      expect(childLink).toHaveAttribute("aria-current", "page");
    });

    it("does not show sub-items when sidebar is collapsed even after click", async () => {
      const user = userEvent.setup();
      render(
        <Sidebar {...defaultProps} currentPath="/dashboard" collapsed={true} />,
      );

      // When collapsed, labels are hidden but links still exist with href
      const previsionsLink = screen
        .getAllByRole("link")
        .find((el) => el.getAttribute("href") === "/previsions");

      expect(previsionsLink).toBeDefined();
      if (previsionsLink) {
        await user.click(previsionsLink);
      }

      // Sub-items should remain hidden because collapsed=true
      expect(screen.queryByText("Capacite humaine")).not.toBeInTheDocument();
    });

    it("renders sub-item links with correct hrefs", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Previsions"));

      expect(screen.getByText("Capacite humaine").closest("a")).toHaveAttribute(
        "href",
        "/previsions/humaine",
      );
      expect(
        screen.getByText("Capacite marchandise").closest("a"),
      ).toHaveAttribute("href", "/previsions/marchandise");
      expect(screen.getByText("Vue globale").closest("a")).toHaveAttribute(
        "href",
        "/previsions/globale",
      );
    });
  });

  /* ─── Collapse toggle ───────────────────── */

  describe("collapse toggle", () => {
    it("renders collapse button when onToggleCollapse is provided", () => {
      const onToggle = vi.fn();
      render(<Sidebar {...defaultProps} onToggleCollapse={onToggle} />);
      expect(
        screen.getByRole("button", { name: /reduire le menu/i }),
      ).toBeInTheDocument();
    });

    it("does not render collapse button when onToggleCollapse is not provided", () => {
      render(<Sidebar {...defaultProps} />);
      expect(
        screen.queryByRole("button", { name: /reduire le menu/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /agrandir le menu/i }),
      ).not.toBeInTheDocument();
    });

    it("calls onToggleCollapse when button is clicked", async () => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      render(<Sidebar {...defaultProps} onToggleCollapse={onToggle} />);

      await user.click(
        screen.getByRole("button", { name: /reduire le menu/i }),
      );
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("shows 'Agrandir le menu' label when collapsed", () => {
      const onToggle = vi.fn();
      render(
        <Sidebar
          {...defaultProps}
          collapsed={true}
          onToggleCollapse={onToggle}
        />,
      );
      expect(
        screen.getByRole("button", { name: /agrandir le menu/i }),
      ).toBeInTheDocument();
    });

    it("hides nav item labels when collapsed", () => {
      render(<Sidebar {...defaultProps} collapsed={true} />);
      // Text labels should be hidden when collapsed
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Donnees")).not.toBeInTheDocument();
    });
  });

  /* ─── Role-based list structure ─────────── */

  describe("accessibility", () => {
    it("renders nav lists with role=list", () => {
      render(<Sidebar {...defaultProps} />);
      const lists = screen.getAllByRole("list");
      // Main nav list + bottom items list
      expect(lists.length).toBeGreaterThanOrEqual(2);
    });

    it("renders 7 nav items for admin (6 main + 1 bottom)", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      // Count all top-level list items
      const lists = screen.getAllByRole("list");
      const mainListItems = within(lists[0]).getAllByRole("listitem");
      const bottomListItems = within(lists[1]).getAllByRole("listitem");
      expect(mainListItems).toHaveLength(6);
      expect(bottomListItems).toHaveLength(1);
    });

    it("renders 6 nav items for non-admin (no Parametres)", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      const lists = screen.getAllByRole("list");
      const mainListItems = within(lists[0]).getAllByRole("listitem");
      expect(mainListItems).toHaveLength(6);
      // Bottom list should be empty for viewers
      const bottomListItems = within(lists[1]).queryAllByRole("listitem");
      expect(bottomListItems).toHaveLength(0);
    });
  });
});
