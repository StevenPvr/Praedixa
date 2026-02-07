import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DimensionPage, { generateMetadata } from "../page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/previsions/humaine",
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

// Mock useApiGet — return loading state
vi.mock("@/hooks/use-api", () => ({
  useApiGet: () => ({
    data: null,
    loading: true,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock @tremor/react
vi.mock("@tremor/react", () => ({
  AreaChart: () => <div data-testid="area-chart" />,
}));

// Mock @praedixa/ui
vi.mock("@praedixa/ui", () => ({
  cn: (...inputs: unknown[]) => inputs.filter(Boolean).join(" "),
  DataTable: () => <div>table</div>,
  SkeletonChart: () => <div>Loading chart...</div>,
  SkeletonTable: () => <div>Loading table...</div>,
  useMediaQuery: () => false,
}));

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

  it("renders the correct label for unknown dimensions", async () => {
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

  it("renders loading state for dimension detail", async () => {
    const params = Promise.resolve({ dimension: "humaine" });
    const Component = await DimensionPage({ params });
    render(Component);
    // DimensionDetail shows SkeletonTable while loading
    expect(screen.getByText("Loading table...")).toBeInTheDocument();
  });
});
