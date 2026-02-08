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

    it("renders 'Tous les sites' when siteName is not provided", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Tous les sites")).toBeInTheDocument();
    });

    it("renders the site name when siteName is provided", () => {
      render(<Sidebar {...defaultProps} siteName="Lyon Nord" />);
      expect(screen.getByText("Lyon Nord")).toBeInTheDocument();
      expect(screen.queryByText("Tous les sites")).not.toBeInTheDocument();
    });

    it("hides site name when collapsed", () => {
      render(
        <Sidebar {...defaultProps} collapsed={true} siteName="Lyon Nord" />,
      );
      expect(screen.queryByText("Lyon Nord")).not.toBeInTheDocument();
      expect(screen.queryByText("Tous les sites")).not.toBeInTheDocument();
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
      expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      expect(screen.getByText("Donnees")).toBeInTheDocument();
      expect(screen.getByText("Anticipation")).toBeInTheDocument();
      expect(screen.getByText("Traitement")).toBeInTheDocument();
      expect(screen.getByText("Suivi")).toBeInTheDocument();
      expect(screen.getByText("Rapports")).toBeInTheDocument();
    });

    it("renders Reglages for admin users", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      expect(screen.getByText("Reglages")).toBeInTheDocument();
    });

    it("hides Reglages for manager users", () => {
      render(<Sidebar {...defaultProps} userRole="manager" />);
      expect(screen.queryByText("Reglages")).not.toBeInTheDocument();
    });

    it("hides Reglages for viewer users", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      expect(screen.queryByText("Reglages")).not.toBeInTheDocument();
    });

    it("renders correct hrefs for nav items", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Tableau de bord").closest("a")).toHaveAttribute(
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
      const dashboardLink = screen.getByText("Tableau de bord").closest("a");
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

      expect(screen.getByText("Mes sites")).toBeInTheDocument();
      expect(screen.getByText("Fichiers importes")).toBeInTheDocument();
      expect(screen.getByText("Donnees consolidees")).toBeInTheDocument();
    });

    it("auto-expands section for /donnees/canonique path", () => {
      render(<Sidebar {...defaultProps} currentPath="/donnees/canonique" />);
      expect(screen.getByText("Donnees consolidees")).toBeInTheDocument();
    });

    it("shows Anticipation children: Vue par site, Toutes les alertes", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Anticipation"));

      expect(screen.getByText("Vue par site")).toBeInTheDocument();
      expect(screen.getByText("Toutes les alertes")).toBeInTheDocument();
    });

    it("shows Traitement children: Alertes a traiter, Decisions passees", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Traitement"));

      expect(screen.getByText("Alertes a traiter")).toBeInTheDocument();
      expect(screen.getByText("Decisions passees")).toBeInTheDocument();
    });

    it("shows Suivi children: Journal des actions, Qualite des decisions", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Suivi"));

      expect(screen.getByText("Journal des actions")).toBeInTheDocument();
      expect(screen.getByText("Qualite des decisions")).toBeInTheDocument();
    });

    it("renders sub-item links with correct hrefs for Anticipation", async () => {
      const user = userEvent.setup();
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);

      await user.click(screen.getByText("Anticipation"));

      expect(screen.getByText("Vue par site").closest("a")).toHaveAttribute(
        "href",
        "/previsions",
      );
      expect(
        screen.getByText("Toutes les alertes").closest("a"),
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
      expect(screen.queryByText("Tableau de bord")).not.toBeInTheDocument();
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

    it("renders 6 nav items for non-admin (no Reglages)", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      const lists = screen.getAllByRole("list");
      const mainListItems = within(lists[0]).getAllByRole("listitem");
      expect(mainListItems).toHaveLength(6);
      const bottomListItems = within(lists[1]).queryAllByRole("listitem");
      expect(bottomListItems).toHaveLength(0);
    });
  });
});
