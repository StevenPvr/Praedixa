import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AlertDetailPage, { generateMetadata } from "../page";

describe("generateMetadata", () => {
  it("returns title with alertId", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ alertId: "42" }),
    });
    expect(metadata.title).toBe("Alerte 42 — Arbitrage — Praedixa");
  });

  it("handles different alertId values", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ alertId: "abc-123" }),
    });
    expect(metadata.title).toBe("Alerte abc-123 — Arbitrage — Praedixa");
  });
});

describe("AlertDetailPage", () => {
  it("renders the alert detail heading", async () => {
    const params = Promise.resolve({ alertId: "42" });
    const Component = await AlertDetailPage({ params });
    render(Component);
    expect(
      screen.getByRole("heading", { name: "Detail de l'alerte" }),
    ).toBeInTheDocument();
  });

  it("renders the alert ID in the description", async () => {
    const params = Promise.resolve({ alertId: "42" });
    const Component = await AlertDetailPage({ params });
    render(Component);
    expect(screen.getByText("Alerte #42")).toBeInTheDocument();
  });

  it("renders correctly with a different alert ID", async () => {
    const params = Promise.resolve({ alertId: "abc-123" });
    const Component = await AlertDetailPage({ params });
    render(Component);
    expect(screen.getByText("Alerte #abc-123")).toBeInTheDocument();
  });

  it("shows the construction placeholder", async () => {
    const params = Promise.resolve({ alertId: "1" });
    const Component = await AlertDetailPage({ params });
    render(Component);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
