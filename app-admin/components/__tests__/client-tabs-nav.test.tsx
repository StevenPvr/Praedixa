import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClientTabsNav } from "../client-tabs-nav";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

const mockPathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockUseCurrentUserState = vi.fn();
vi.mock("@/lib/auth/client", () => ({
  useCurrentUserState: () => mockUseCurrentUserState(),
}));

const FULL_PERMISSIONS = [
  "admin:org:read",
  "admin:org:write",
  "admin:users:read",
  "admin:users:write",
  "admin:billing:read",
  "admin:onboarding:read",
  "admin:onboarding:write",
  "admin:messages:read",
];

describe("ClientTabsNav", () => {
  it("renders all workspace tabs", () => {
    mockPathname.mockReturnValue("/clients/org-1/dashboard");
    mockUseCurrentUserState.mockReturnValue({
      user: { permissions: FULL_PERMISSIONS },
      loading: false,
    });
    render(<ClientTabsNav basePath="/clients/org-1" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Vue client")).toBeInTheDocument();
    expect(screen.getByText("Donnees")).toBeInTheDocument();
    expect(screen.getByText("Previsions")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
    expect(screen.getByText("Alertes")).toBeInTheDocument();
    expect(screen.getByText("Rapports")).toBeInTheDocument();
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText("Contrats")).toBeInTheDocument();
    expect(screen.getByText("Config")).toBeInTheDocument();
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("highlights the active tab", () => {
    mockPathname.mockReturnValue("/clients/org-1/donnees");
    mockUseCurrentUserState.mockReturnValue({
      user: { permissions: FULL_PERMISSIONS },
      loading: false,
    });
    render(<ClientTabsNav basePath="/clients/org-1" />);
    const donneesLink = screen.getByText("Donnees").closest("a");
    expect(donneesLink?.className).toContain("text-primary");
  });

  it("renders correct hrefs", () => {
    mockPathname.mockReturnValue("/clients/org-1/dashboard");
    mockUseCurrentUserState.mockReturnValue({
      user: { permissions: FULL_PERMISSIONS },
      loading: false,
    });
    render(<ClientTabsNav basePath="/clients/org-1" />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/clients/org-1/dashboard");
    expect(hrefs).toContain("/clients/org-1/vue-client");
    expect(hrefs).toContain("/clients/org-1/actions");
    expect(hrefs).toContain("/clients/org-1/rapports");
    expect(hrefs).toContain("/clients/org-1/contrats");
    expect(hrefs).toContain("/clients/org-1/donnees");
    expect(hrefs).toContain("/clients/org-1/messages");
  });

  it("hides tabs without permissions", () => {
    mockPathname.mockReturnValue("/clients/org-1/dashboard");
    mockUseCurrentUserState.mockReturnValue({
      user: { permissions: ["admin:org:read"] },
      loading: false,
    });
    render(<ClientTabsNav basePath="/clients/org-1" />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Donnees")).toBeInTheDocument();
    expect(screen.queryByText("Contrats")).not.toBeInTheDocument();
    expect(screen.queryByText("Config")).not.toBeInTheDocument();
    expect(screen.queryByText("Messages")).not.toBeInTheDocument();
  });

  it("has aria-label for navigation", () => {
    mockPathname.mockReturnValue("/clients/org-1/dashboard");
    mockUseCurrentUserState.mockReturnValue({
      user: { permissions: FULL_PERMISSIONS },
      loading: false,
    });
    render(<ClientTabsNav basePath="/clients/org-1" />);
    expect(screen.getByLabelText("Onglets client")).toBeInTheDocument();
  });

  it("renders nothing while permissions are still loading", () => {
    mockPathname.mockReturnValue("/clients/org-1/dashboard");
    mockUseCurrentUserState.mockReturnValue({
      user: null,
      loading: true,
    });

    const { container } = render(<ClientTabsNav basePath="/clients/org-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
