import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { render, screen } from "@testing-library/react";

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
  Cormorant_Garamond: () => ({
    variable: "--font-serif",
    style: { fontFamily: "Cormorant Garamond" },
  }),
}));

vi.mock("../../components/seo/JsonLd", () => ({
  JsonLd: () => <script type="application/ld+json" />,
}));

import RootLayout, { metadata } from "../layout";

describe("Landing RootLayout", () => {
  it("renders children", () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="child">Landing content</div>
      </RootLayout>,
    );
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(container.innerHTML).toContain("Landing content");
  });

  it("has metadataBase URL", () => {
    expect(metadata.metadataBase).toBeDefined();
  });

  it("has robots configuration allowing indexing", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });
});
