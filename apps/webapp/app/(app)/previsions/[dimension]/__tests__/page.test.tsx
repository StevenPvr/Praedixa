import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DimensionPage, { generateMetadata } from "../page";

describe("generateMetadata", () => {
  it("returns title with known dimension label", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ dimension: "humaine" }),
    });
    expect(metadata.title).toBe("Capacite humaine — Previsions — Praedixa");
  });

  it("returns title with 'marchandise' label", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ dimension: "marchandise" }),
    });
    expect(metadata.title).toBe("Capacite marchandise — Previsions — Praedixa");
  });

  it("falls back to raw dimension for unknown values", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ dimension: "unknown-dim" }),
    });
    expect(metadata.title).toBe("unknown-dim — Previsions — Praedixa");
  });
});

describe("DimensionPage", () => {
  it("renders the correct label for 'humaine' dimension", async () => {
    const params = Promise.resolve({ dimension: "humaine" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(
      screen.getByRole("heading", { name: "Capacite humaine" }),
    ).toBeInTheDocument();
  });

  it("renders the correct label for 'marchandise' dimension", async () => {
    const params = Promise.resolve({ dimension: "marchandise" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(
      screen.getByRole("heading", { name: "Capacite marchandise" }),
    ).toBeInTheDocument();
  });

  it("renders the correct label for 'globale' dimension", async () => {
    const params = Promise.resolve({ dimension: "globale" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(
      screen.getByRole("heading", { name: "Vue globale" }),
    ).toBeInTheDocument();
  });

  it("falls back to the raw dimension string for unknown dimensions", async () => {
    const params = Promise.resolve({ dimension: "custom-dim" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(
      screen.getByRole("heading", { name: "custom-dim" }),
    ).toBeInTheDocument();
  });

  it("renders the description with lowercased label", async () => {
    const params = Promise.resolve({ dimension: "humaine" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(
      screen.getByText(/previsions detaillees.*capacite humaine/i),
    ).toBeInTheDocument();
  });

  it("shows the construction placeholder", async () => {
    const params = Promise.resolve({ dimension: "humaine" });
    const Component = await DimensionPage({ params });
    render(Component);
    expect(screen.getByText("Section en construction")).toBeInTheDocument();
  });
});
