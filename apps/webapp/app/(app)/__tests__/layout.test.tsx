import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AppLayout from "../layout";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @praedixa/ui — cn utility + useMediaQuery
const mockUseMediaQuery = vi.fn(() => false);
vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
  useMediaQuery: () => mockUseMediaQuery(),
}));

describe("AppLayout", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false);
  });

  it("renders children content", () => {
    render(
      <AppLayout>
        <div data-testid="child-content">Hello World</div>
      </AppLayout>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders the top bar header", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders the Organisation text in the top bar", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByText("Organisation")).toBeInTheDocument();
  });

  it("renders the user avatar with initial U", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("renders the mobile menu toggle button", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(
      screen.getByRole("button", { name: /ouvrir le menu/i }),
    ).toBeInTheDocument();
  });

  it("toggles mobile sidebar when menu button is clicked", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const menuButton = screen.getByRole("button", { name: /ouvrir le menu/i });
    // Click to open mobile sidebar
    fireEvent.click(menuButton);
    // Now the button label should change to "Fermer le menu"
    expect(
      screen.getByRole("button", { name: /fermer le menu/i }),
    ).toBeInTheDocument();
  });

  it("renders the main content area", () => {
    render(
      <AppLayout>
        <div>Page content here</div>
      </AppLayout>,
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByText("Page content here")).toBeInTheDocument();
  });

  it("renders sidebar visible on desktop", () => {
    mockUseMediaQuery.mockReturnValue(true);
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(container.querySelector("aside")).toBeInTheDocument();
  });

  it("hides sidebar on mobile by default", () => {
    mockUseMediaQuery.mockReturnValue(false);
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    // Sidebar wrapper is hidden
    const sidebarWrapper = container.querySelector("aside")?.parentElement;
    expect(sidebarWrapper).toHaveClass("hidden");
  });

  it("shows overlay backdrop when mobile sidebar is open", () => {
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const menuButton = screen.getByRole("button", { name: /ouvrir le menu/i });
    fireEvent.click(menuButton);
    // Overlay backdrop should be present
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay).toBeInTheDocument();
  });

  it("uses reduced padding on mobile (p-4)", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveClass("p-4");
  });
});
