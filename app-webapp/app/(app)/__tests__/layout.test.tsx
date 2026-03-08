import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AppLayout from "../layout";

// Mock next/navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
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

const mockClearAuthSession = vi.fn(async () => undefined);
vi.mock("@/lib/auth/client", () => ({
  useCurrentUser: () => ({
    id: "user-abc",
    email: "test@example.com",
    role: "admin",
  }),
  clearAuthSession: () => mockClearAuthSession(),
}));

vi.mock("@/hooks/use-ux-preferences", () => ({
  useUxPreferences: () => ({
    preferences: {
      density: "compact",
      nav: {
        sidebarCollapsed: false,
        sidebarWidth: 268,
      },
      theme: { mode: "light" },
    },
    setSidebarCollapsed: vi.fn(),
    setSidebarWidth: vi.fn(),
    setThemeMode: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-api", () => ({
  useApiGet: () => ({
    data: { name: "ACME", timezone: "Europe/Paris" },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: ({
    currentPath,
    collapsed,
    onToggleCollapse,
  }: {
    currentPath: string;
    userRole: string;
    collapsed: boolean;
    onToggleCollapse: () => void;
  }) => (
    <aside data-path={currentPath} data-collapsed={String(collapsed)}>
      <button onClick={onToggleCollapse}>Toggle</button>
    </aside>
  ),
}));

// Mock ToastProvider — passthrough
vi.mock("@/components/toast-provider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock ThemeToggle
vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Theme</button>,
}));

describe("AppLayout", () => {
  beforeEach(() => {
    mockUseMediaQuery.mockReturnValue(false);
    mockRouterPush.mockReset();
    mockRouterReplace.mockReset();
    mockClearAuthSession.mockClear();
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

  it("renders the section label in the top bar", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByText("Accueil")).toBeInTheDocument();
  });

  it("renders the user avatar with initial from email", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders the mobile menu toggle button", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(
      screen.getByRole("button", { name: /^ouvrir la navigation$/i }),
    ).toBeInTheDocument();
  });

  it("toggles mobile sidebar when menu button is clicked", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const menuButton = screen.getByRole("button", {
      name: /^ouvrir la navigation$/i,
    });
    // Click to open mobile sidebar
    fireEvent.click(menuButton);
    // Now the button label should change to "Fermer la navigation"
    expect(
      screen.getByRole("button", { name: /fermer la navigation/i }),
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
    const menuButton = screen.getByRole("button", {
      name: /^ouvrir la navigation$/i,
    });
    fireEvent.click(menuButton);
    // Overlay backdrop should be present
    const overlay = container.querySelector("[aria-hidden='true']");
    expect(overlay).toBeInTheDocument();
  });

  it("uses app content padding classes", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const main = screen.getByRole("main");
    expect(main.className).toMatch(/px-|py-|p-/);
  });

  it("opens profile menu and navigates to settings", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /ouvrir le compte/i }),
    );

    fireEvent.click(screen.getByRole("menuitem", { name: /reglages/i }));
    expect(mockRouterPush).toHaveBeenCalledWith("/parametres");
  });

  it("signs out from profile menu and redirects to login", async () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /ouvrir le compte/i }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /se deconnecter/i }));

    await waitFor(() => {
      expect(mockClearAuthSession).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith("/login");
    });
  });
});
