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
  Home: () => <span data-testid="icon-home" />,
  Building2: () => <span data-testid="icon-clients" />,
  BookOpen: () => <span data-testid="icon-journal" />,
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
    currentPath: "/",
  };

  it("renders the Praedixa logo", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByTestId("praedixa-logo")).toBeInTheDocument();
  });

  it("renders the 'Admin' badge", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders all 4 navigation items", () => {
    render(<AdminSidebar {...defaultProps} />);
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Parametres")).toBeInTheDocument();
  });

  it("marks the active nav item with aria-current='page'", () => {
    render(<AdminSidebar currentPath="/" />);
    const accueilLink = screen.getByText("Accueil").closest("a");
    expect(accueilLink).toHaveAttribute("aria-current", "page");
  });

  it("does not mark inactive items with aria-current", () => {
    render(<AdminSidebar currentPath="/" />);
    const clientsLink = screen.getByText("Clients").closest("a");
    expect(clientsLink).not.toHaveAttribute("aria-current");
  });

  it("matches sub-routes as active", () => {
    render(<AdminSidebar currentPath="/clients/123" />);
    const clientsLink = screen.getByText("Clients").closest("a");
    expect(clientsLink).toHaveAttribute("aria-current", "page");
  });

  it("root path does not match /clients", () => {
    render(<AdminSidebar currentPath="/clients" />);
    const accueilLink = screen.getByText("Accueil").closest("a");
    expect(accueilLink).not.toHaveAttribute("aria-current");
  });

  it("marks journal as active on /journal path", () => {
    render(<AdminSidebar currentPath="/journal" />);
    const link = screen.getByText("Journal").closest("a");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("marks parametres as active on /parametres path", () => {
    render(<AdminSidebar currentPath="/parametres" />);
    const link = screen.getByText("Parametres").closest("a");
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
    expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
    expect(screen.queryByText("Clients")).not.toBeInTheDocument();
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
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/clients");
    expect(hrefs).toContain("/journal");
    expect(hrefs).toContain("/parametres");
  });
});
