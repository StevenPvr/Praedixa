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

  /* --- Rendering --- */

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

  /* --- Navigation items --- */

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
      expect(screen.getByText("Rapports").closest("a")).toHaveAttribute(
        "href",
        "/rapports",
      );
    });
  });

  /* --- Active state --- */

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
  });

  /* --- Submenu (Donnees children) --- */

  describe("submenu behavior", () => {
    it("toggles Donnees sub-items when clicking", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      // Click Donnees to expand
      await user.click(screen.getByText("Donnees"));

      expect(screen.getByText("Sites & Departements")).toBeInTheDocument();
      expect(screen.getByText("Datasets")).toBeInTheDocument();
      expect(screen.getByText("Donnees canoniques")).toBeInTheDocument();
    });

    it("auto-expands section for /donnees/canonique path", () => {
      render(<Sidebar {...defaultProps} currentPath="/donnees/canonique" />);
      expect(screen.getByText("Donnees canoniques")).toBeInTheDocument();
    });

    it("shows Previsions children: Heatmap couverture, Alertes couverture", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Previsions"));

      expect(screen.getByText("Heatmap couverture")).toBeInTheDocument();
      expect(screen.getByText("Alertes couverture")).toBeInTheDocument();
    });

    it("shows Arbitrage children: Scenarios, Historique", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Arbitrage"));

      expect(screen.getByText("Scenarios")).toBeInTheDocument();
      expect(screen.getByText("Historique")).toBeInTheDocument();
    });

    it("shows Decisions children: Journal, Statistiques", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Decisions"));

      expect(screen.getByText("Journal")).toBeInTheDocument();
      expect(screen.getByText("Statistiques")).toBeInTheDocument();
    });

    it("renders sub-item links with correct hrefs for Previsions", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Previsions"));

      expect(
        screen.getByText("Heatmap couverture").closest("a"),
      ).toHaveAttribute("href", "/previsions");
      expect(
        screen.getByText("Alertes couverture").closest("a"),
      ).toHaveAttribute("href", "/previsions/alertes");
    });
  });

  /* --- Collapse toggle --- */

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

    it("shows Agrandir label when collapsed", () => {
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
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Donnees")).not.toBeInTheDocument();
    });
  });

  /* --- Accessibility --- */

  describe("accessibility", () => {
    it("renders nav lists with role=list", () => {
      render(<Sidebar {...defaultProps} />);
      const lists = screen.getAllByRole("list");
      expect(lists.length).toBeGreaterThanOrEqual(2);
    });

    it("renders 6 nav items for admin (6 main + 1 bottom)", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
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
      const bottomListItems = within(lists[1]).queryAllByRole("listitem");
      expect(bottomListItems).toHaveLength(0);
    });
  });
});
