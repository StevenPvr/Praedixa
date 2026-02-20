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

describe("ClientTabsNav", () => {
  it("renders all 7 tabs", () => {
    mockPathname.mockReturnValue("/clients/org-1/vue-client");
    render(<ClientTabsNav basePath="/clients/org-1" />);
    expect(screen.getByText("Vue client")).toBeInTheDocument();
    expect(screen.getByText("Donnees")).toBeInTheDocument();
    expect(screen.getByText("Previsions")).toBeInTheDocument();
    expect(screen.getByText("Alertes")).toBeInTheDocument();
    expect(screen.getByText("Config")).toBeInTheDocument();
    expect(screen.getByText("Equipe")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });

  it("highlights the active tab", () => {
    mockPathname.mockReturnValue("/clients/org-1/donnees");
    render(<ClientTabsNav basePath="/clients/org-1" />);
    const donneesLink = screen.getByText("Donnees").closest("a");
    expect(donneesLink?.className).toContain("text-primary");
  });

  it("renders correct hrefs", () => {
    mockPathname.mockReturnValue("/clients/org-1/vue-client");
    render(<ClientTabsNav basePath="/clients/org-1" />);
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/clients/org-1/vue-client");
    expect(hrefs).toContain("/clients/org-1/donnees");
    expect(hrefs).toContain("/clients/org-1/messages");
  });

  it("has aria-label for navigation", () => {
    mockPathname.mockReturnValue("/clients/org-1/vue-client");
    render(<ClientTabsNav basePath="/clients/org-1" />);
    expect(screen.getByLabelText("Onglets client")).toBeInTheDocument();
  });
});
