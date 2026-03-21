import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";

const { mockHeaders, mockThemeProvider } = vi.hoisted(() => ({
  mockHeaders: vi.fn(),
  mockThemeProvider: vi.fn(
    ({ children, nonce }: { children: React.ReactNode; nonce?: string }) => (
      <div data-testid="theme-provider" data-nonce={nonce ?? ""}>
        {children}
      </div>
    ),
  ),
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: (props: { children: React.ReactNode; nonce?: string }) =>
    mockThemeProvider(props),
}));

vi.mock("@/components/toast-provider", () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="toast-provider">{children}</div>
  ),
}));

import RootLayout from "../layout";

describe("RootLayout", () => {
  it("forwards the CSP nonce from request headers to the theme provider", async () => {
    mockHeaders.mockResolvedValue(new Headers([["x-nonce", "nonce-test-123"]]));

    const layout = await RootLayout({
      children: <main id="main-content">Contenu</main>,
    });

    const themeProviderElement = (layout as ReactElement).props.children.props
      .children as ReactElement;
    render(themeProviderElement);

    expect(screen.getByTestId("theme-provider")).toHaveAttribute(
      "data-nonce",
      "nonce-test-123",
    );
    expect(screen.getByText("Aller au contenu principal")).toBeInTheDocument();
    expect(screen.getByText("Contenu")).toBeInTheDocument();
  });
});
