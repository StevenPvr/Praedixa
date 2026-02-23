import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Suppress jsdom warning: <html> cannot be a child of <div>
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].includes("cannot be a child of"))
      return;
    originalError(...args);
  };
});
afterAll(() => {
  console.error = originalError;
});

vi.mock("next/font/google", () => ({
  Manrope: () => ({
    variable: "--font-sans",
    style: { fontFamily: "Manrope" },
  }),
}));

vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import RootLayout, { metadata } from "../layout";

describe("Webapp RootLayout", () => {
  it("renders children", () => {
    // RootLayout renders <html><body>..., but jsdom already has html/body,
    // so we test that children appear in the output
    const { container } = render(
      <RootLayout>
        <div data-testid="child">Content</div>
      </RootLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    // Verify the component structure contains html > body > children
    expect(container.innerHTML).toContain("Content");
  });

  it("exports correct metadata", () => {
    expect(metadata.title).toBe("Praedixa — War room operationnelle");
    expect(metadata.description).toContain("Plateforme executive");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
