import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/font/google
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
    expect(metadata.title).toBe("Praedixa — Dashboard");
    expect(metadata.description).toContain("Forecast");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
