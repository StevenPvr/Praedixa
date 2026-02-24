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

const headersMock = vi.fn(() => new Headers());

vi.mock("next/headers", () => ({
  headers: () => headersMock(),
}));

vi.mock("next/font/google", () => ({
  Manrope: () => ({ variable: "font-sans-mock" }),
}));

vi.mock("geist/font/sans", () => ({
  GeistSans: { variable: "geist-sans-mock" },
}));

vi.mock("geist/font/mono", () => ({
  GeistMono: { variable: "geist-mono-mock" },
}));

vi.mock("../../components/seo/JsonLd", () => ({
  JsonLd: () => <script type="application/ld+json" />,
}));

import RootLayout, { metadata } from "../layout";

describe("Landing RootLayout", () => {
  it("renders children", async () => {
    const node = await RootLayout({
      children: <div data-testid="child">Landing content</div>,
    });
    const { container } = render(node);
    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(container.innerHTML).toContain("Landing content");
  });

  it("has metadataBase URL", () => {
    expect(metadata.metadataBase).toBeDefined();
  });

  it("has robots configuration allowing indexing", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });

  it("uses locale header to set html lang", async () => {
    headersMock.mockReturnValueOnce(new Headers({ "x-request-locale": "en" }));
    const node = await RootLayout({
      children: <div data-testid="child">Landing content</div>,
    });
    expect(node.props.lang).toBe("en");
  });
});
