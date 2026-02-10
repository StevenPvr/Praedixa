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
      expect(screen.getByText("Accueil")).toBeInTheDocument();
      expect(screen.getByText("Donnees")).toBeInTheDocument();
      expect(screen.getByText("Previsions")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
      expect(screen.getByText("Messages")).toBeInTheDocument();
    });

    it("renders bottom items for admin (Rapports + Parametres)", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      expect(screen.getByText("Rapports")).toBeInTheDocument();
      expect(screen.getByText("Parametres")).toBeInTheDocument();
    });

    it("renders Rapports but hides Parametres for manager users", () => {
      render(<Sidebar {...defaultProps} userRole="manager" />);
      expect(screen.getByText("Rapports")).toBeInTheDocument();
      expect(screen.queryByText("Parametres")).not.toBeInTheDocument();
    });

    it("renders Rapports but hides Parametres for viewer users", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      expect(screen.getByText("Rapports")).toBeInTheDocument();
      expect(screen.queryByText("Parametres")).not.toBeInTheDocument();
    });

    it("renders correct hrefs for nav items", () => {
      render(<Sidebar {...defaultProps} />);
      expect(screen.getByText("Accueil").closest("a")).toHaveAttribute(
        "href",
        "/dashboard",
      );
      expect(screen.getByText("Donnees").closest("a")).toHaveAttribute(
        "href",
        "/donnees",
      );
      expect(screen.getByText("Previsions").closest("a")).toHaveAttribute(
        "href",
        "/previsions",
      );
      expect(screen.getByText("Actions").closest("a")).toHaveAttribute(
        "href",
        "/actions",
      );
      expect(screen.getByText("Messages").closest("a")).toHaveAttribute(
        "href",
        "/messages",
      );
      expect(screen.getByText("Rapports").closest("a")).toHaveAttribute(
        "href",
        "/rapports",
      );
      expect(screen.getByText("Parametres").closest("a")).toHaveAttribute(
        "href",
        "/parametres",
      );
    });
  });

  /* --- Active state --- */

  describe("active state", () => {
    it("marks the current page with aria-current=page", () => {
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);
      const dashboardLink = screen.getByText("Accueil").closest("a");
      expect(dashboardLink).toHaveAttribute("aria-current", "page");
    });

    it("does not mark non-active items with aria-current", () => {
      render(<Sidebar {...defaultProps} currentPath="/dashboard" />);
      const donneesLink = screen.getByText("Donnees").closest("a");
      expect(donneesLink).not.toHaveAttribute("aria-current");
    });

    it("activates Previsions when on /previsions subpath", () => {
      render(<Sidebar {...defaultProps} currentPath="/previsions/detail" />);
      const previsionsLink = screen.getByText("Previsions").closest("a");
      expect(previsionsLink).toHaveAttribute("aria-current", "page");
    });

    it("activates Actions when on /actions subpath", () => {
      render(<Sidebar {...defaultProps} currentPath="/actions/123" />);
      const actionsLink = screen.getByText("Actions").closest("a");
      expect(actionsLink).toHaveAttribute("aria-current", "page");
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
      expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
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

    it("renders 5 main nav items + 2 bottom for admin", () => {
      render(<Sidebar {...defaultProps} userRole="admin" />);
      const lists = screen.getAllByRole("list");
      const mainListItems = within(lists[0]).getAllByRole("listitem");
      const bottomListItems = within(lists[1]).getAllByRole("listitem");
      expect(mainListItems).toHaveLength(5);
      expect(bottomListItems).toHaveLength(2);
    });

    it("renders 5 main nav items + 1 bottom for non-admin", () => {
      render(<Sidebar {...defaultProps} userRole="viewer" />);
      const lists = screen.getAllByRole("list");
      const mainListItems = within(lists[0]).getAllByRole("listitem");
      const bottomListItems = within(lists[1]).getAllByRole("listitem");
      expect(mainListItems).toHaveLength(5);
      expect(bottomListItems).toHaveLength(1);
    });
  });

  /* --- Unread badge --- */

  describe("unread badge", () => {
    it("renders unread badge on Messages when unreadCount > 0", () => {
      render(<Sidebar {...defaultProps} unreadCount={3} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("does not render badge when unreadCount is 0", () => {
      render(<Sidebar {...defaultProps} unreadCount={0} />);
      expect(
        screen.queryByLabelText(/messages non lus/),
      ).not.toBeInTheDocument();
    });

    it("does not render badge when unreadCount is undefined", () => {
      render(<Sidebar {...defaultProps} />);
      expect(
        screen.queryByLabelText(/messages non lus/),
      ).not.toBeInTheDocument();
    });

    it("shows 99+ for large unread counts", () => {
      render(<Sidebar {...defaultProps} unreadCount={150} />);
      expect(screen.getByText("99+")).toBeInTheDocument();
    });

    it("renders badge with aria-label for accessibility", () => {
      render(<Sidebar {...defaultProps} unreadCount={5} />);
      expect(screen.getByLabelText("5 messages non lus")).toBeInTheDocument();
    });

    it("activates Messages when on /messages path", () => {
      render(<Sidebar {...defaultProps} currentPath="/messages" />);
      const messagesLink = screen.getByText("Messages").closest("a");
      expect(messagesLink).toHaveAttribute("aria-current", "page");
    });

    it("shows compact badge when collapsed with unread", () => {
      const { container } = render(
        <Sidebar {...defaultProps} collapsed={true} unreadCount={5} />,
      );
      // In collapsed mode, the badge should be small (3.5 height)
      const smallBadges = container.querySelectorAll(".h-3\\.5");
      expect(smallBadges.length).toBeGreaterThanOrEqual(1);
    });
  });
});
