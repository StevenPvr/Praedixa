import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/font/google", () => ({
  Plus_Jakarta_Sans: () => ({
    variable: "--font-sans",
    style: { fontFamily: "Plus Jakarta Sans" },
  }),
  DM_Serif_Display: () => ({
    variable: "--font-serif",
    style: { fontFamily: "DM Serif Display" },
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

  it("exports correct metadata title", () => {
    expect(metadata.title).toContain("Praedixa");
  });

  it("exports correct metadata description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(0);
  });

  it("has metadataBase URL", () => {
    expect(metadata.metadataBase).toBeDefined();
  });

  it("has openGraph metadata", () => {
    expect(metadata.openGraph).toBeDefined();
  });

  it("has robots configuration allowing indexing", () => {
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });
});
