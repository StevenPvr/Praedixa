import { describe, it, expect, vi } from "vitest";
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

// Mock @praedixa/ui cn utility
vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
}));

describe("AppLayout", () => {
  it("renders children content", () => {
    render(
      <AppLayout>
        <div data-testid="child-content">Hello World</div>
      </AppLayout>,
    );
    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Hello World")).toBeInTheDocument();
  });

  it("renders the sidebar", () => {
    const { container } = render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    expect(container.querySelector("aside")).toBeInTheDocument();
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

  it("toggles collapsed state when menu button is clicked", () => {
    render(
      <AppLayout>
        <div>Content</div>
      </AppLayout>,
    );
    const menuButton = screen.getByRole("button", { name: /ouvrir le menu/i });
    // Click to toggle collapsed
    fireEvent.click(menuButton);
    // Click again to toggle back
    fireEvent.click(menuButton);
    // Component should still render correctly
    expect(screen.getByText("Organisation")).toBeInTheDocument();
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
});
