import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminSidebar } from "../admin-sidebar";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    "aria-current"?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@praedixa/ui", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  LayoutDashboard: () => <span data-testid="icon-dashboard" />,
  Building2: () => <span data-testid="icon-orgs" />,
  CreditCard: () => <span data-testid="icon-billing" />,
  Rocket: () => <span data-testid="icon-onboarding" />,
  FileText: () => <span data-testid="icon-audit" />,
  Shield: () => <span data-testid="icon-rgpd" />,
  AlertTriangle: () => <span data-testid="icon-alertes" />,
  Layers: () => <span data-testid="icon-scenarios" />,
  FileCheck: () => <span data-testid="icon-proof" />,
  Settings: () => <span data-testid="icon-settings" />,
  LogOut: () => <span data-testid="icon-logout" />,
  ChevronLeft: () => <span data-testid="icon-chevron-left" />,
  ChevronRight: () => <span data-testid="icon-chevron-right" />,
}));

// Mock PraedixaLogo
vi.mock("../praedixa-logo", () => ({
  PraedixaLogo: () => <div data-testid="praedixa-logo" />,
}));

describe("AdminSidebar", () => {
  const defaultProps = {
    currentPath: "/dashboard",
  };

  it("renders the Praedixa logo", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
  });

  it("renders the 'Admin' badge", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders all 10 navigation items", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Organisations")).toBeInTheDocument();
    expect(screen.getByText("Alertes")).toBeInTheDocument();
    expect(screen.getByText("Scenarios")).toBeInTheDocument();
    expect(screen.getByText("Proof Packs")).toBeInTheDocument();
    expect(screen.getByText("Parametres")).toBeInTheDocument();
    expect(screen.getByText("Facturation")).toBeInTheDocument();
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Journal d'audit")).toBeInTheDocument();
    expect(screen.getByText("RGPD")).toBeInTheDocument();
  });

  it("marks the active nav item with aria-current='page'", () => {
    render(<AdminSidebar currentPath="/dashboard" />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark inactive items with aria-current", () => {
    render(<AdminSidebar currentPath="/dashboard" />);
    const orgsLink = screen.getByText("Organisations").closest("a");
    expect(orgsLink).not.toHaveAttribute("aria-current");
  });

  it("matches sub-routes as active", () => {
    render(<AdminSidebar currentPath="/organisations/123" />);
    const orgsLink = screen.getByText("Organisations").closest("a");
    expect(orgsLink).toHaveAttribute("aria-current", "page");
  });

  it("marks alertes as active on /alertes path", () => {
    render(<AdminSidebar currentPath="/alertes" />);
    const link = screen.getByText("Alertes").closest("a");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks scenarios as active on /scenarios path", () => {
    render(<AdminSidebar currentPath="/scenarios" />);
    const link = screen.getByText("Scenarios").closest("a");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("renders user email when provided", () => {
    render(<AdminSidebar {...defaultProps} userEmail="admin@test.com" />);
    expect(screen.getByText("admin@test.com")).toBeInTheDocument();
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
  });

  it("renders user avatar with first letter", () => {
    render(<AdminSidebar {...defaultProps} userEmail="admin@test.com" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("does not render user section when email is undefined", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.queryByText("Super Admin")).not.toBeInTheDocument();
  });

  it("renders collapse toggle when onToggleCollapse is provided", () => {
    const onToggle = vi.fn();
    render(<AdminSidebar {...defaultProps} onToggleCollapse={onToggle} />);
    expect(screen.getByLabelText("Reduire le menu")).toBeInTheDocument();
  });

  it("shows expand label when collapsed", () => {
    const onToggle = vi.fn();
    render(
      <AdminSidebar {...defaultProps} collapsed onToggleCollapse={onToggle} />,
    );
    expect(screen.getByLabelText("Agrandir le menu")).toBeInTheDocument();
  });

  it("calls onToggleCollapse when toggle button is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<AdminSidebar {...defaultProps} onToggleCollapse={onToggle} />);

    await user.click(screen.getByLabelText("Reduire le menu"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("hides nav labels when collapsed", () => {
    render(<AdminSidebar {...defaultProps} collapsed />);
    // Text content should not be visible
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Organisations")).not.toBeInTheDocument();
  });

  it("calls onLogout when logout button is clicked", async () => {
    const user = userEvent.setup();
    const onLogout = vi.fn();
    render(
      <AdminSidebar
        {...defaultProps}
        userEmail="admin@test.com"
        onLogout={onLogout}
      />,
    );

    await user.click(screen.getByLabelText("Se deconnecter"));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("has data-sidebar attribute for dark scrollbar CSS", () => {
    const { container } = render(<AdminSidebar {...defaultProps} />);
    const aside = container.querySelector("aside");
    expect(aside).toHaveAttribute("data-sidebar");
  });

  it("has nav with aria-label", () => {
    render(<AdminSidebar {...defaultProps} />);
    const nav = screen.getByLabelText("Navigation admin");
    expect(nav).toBeInTheDocument();
  });

  it("renders links with correct hrefs", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/dashboard");
    expect(hrefs).toContain("/organisations");
    expect(hrefs).toContain("/alertes");
    expect(hrefs).toContain("/scenarios");
    expect(hrefs).toContain("/proof-packs");
    expect(hrefs).toContain("/parametres");
    expect(hrefs).toContain("/facturation");
    expect(hrefs).toContain("/onboarding");
    expect(hrefs).toContain("/audit");
    expect(hrefs).toContain("/rgpd");
  });
});
