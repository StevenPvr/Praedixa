import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DecompositionPanel } from "../decomposition-panel";
import type { DecompositionResult } from "@/lib/forecast-decomposition";

/* ─── Mocks ──────────────────────────────────────── */

vi.mock("@tremor/react", () => ({
  AreaChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="area-chart"
        data-categories={JSON.stringify(props.categories)}
        data-formatted-sample={formattedSample}
      />
    );
  },
  BarChart: (props: Record<string, unknown>) => {
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(42) : "";
    return (
      <div
        data-testid="bar-chart"
        data-categories={JSON.stringify(props.categories)}
        data-formatted-sample={formattedSample}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

vi.mock("@/components/ui/detail-card", () => ({
  DetailCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="detail-card">{children}</div>
  ),
}));

/* ─── Test Data ──────────────────────────────────── */

const SAMPLE_DATA: DecompositionResult = {
  trend: [
    { date: "2026-02-09", value: 100 },
    { date: "2026-02-10", value: 105 },
  ],
  seasonality: [
    { day: "Lundi", value: 5 },
    { day: "Mardi", value: -3 },
    { day: "Mercredi", value: 0 },
    { day: "Jeudi", value: 2 },
    { day: "Vendredi", value: -1 },
    { day: "Samedi", value: -2 },
    { day: "Dimanche", value: -1 },
  ],
  residuals: [
    { date: "2026-02-09", value: 2 },
    { date: "2026-02-10", value: -1 },
  ],
  confidence: [
    { date: "2026-02-09", lower: 90, upper: 110, mid: 100 },
    { date: "2026-02-10", lower: 95, upper: 115, mid: 105 },
  ],
};

/* ─── Tests ──────────────────────────────────────── */

describe("DecompositionPanel", () => {
  it("renders 4 skeleton charts when loading", () => {
    render(<DecompositionPanel data={null} loading={true} />);
    const skeletons = screen.getAllByTestId("skeleton-chart");
    expect(skeletons).toHaveLength(4);
  });

  it("renders 4 skeleton-chart-wrapper divs when loading", () => {
    render(<DecompositionPanel data={null} loading={true} />);
    const wrappers = screen.getAllByTestId("skeleton-chart-wrapper");
    expect(wrappers).toHaveLength(4);
  });

  it("renders empty message when data is null and not loading", () => {
    render(<DecompositionPanel data={null} loading={false} />);
    expect(
      screen.getByText("Lancez une prevision pour voir la decomposition"),
    ).toBeInTheDocument();
  });

  it("renders empty message when data has all empty arrays", () => {
    const emptyData: DecompositionResult = {
      trend: [],
      seasonality: [],
      residuals: [],
      confidence: [],
    };
    render(<DecompositionPanel data={emptyData} loading={false} />);
    expect(
      screen.getByText("Lancez une prevision pour voir la decomposition"),
    ).toBeInTheDocument();
  });

  it("renders 4 detail cards with data", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    const cards = screen.getAllByTestId("detail-card");
    expect(cards).toHaveLength(4);
  });

  it("renders trend title and description", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    expect(screen.getByText("Tendance de fond")).toBeInTheDocument();
    expect(
      screen.getByText(/evolution generale de vos besoins/),
    ).toBeInTheDocument();
  });

  it("renders seasonality title and description", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    expect(screen.getByText("Rythme hebdomadaire")).toBeInTheDocument();
    expect(
      screen.getByText(/Certains jours sont systematiquement plus charges/),
    ).toBeInTheDocument();
  });

  it("renders residuals title and description", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    expect(screen.getByText("Evenements ponctuels")).toBeInTheDocument();
    expect(screen.getByText(/Les pics = imprevus/)).toBeInTheDocument();
  });

  it("renders confidence title and description", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    expect(screen.getByText("Fourchette de confiance")).toBeInTheDocument();
    expect(screen.getByText(/Plus la zone est etroite/)).toBeInTheDocument();
  });

  it("renders 3 AreaCharts and 1 BarChart", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    expect(screen.getAllByTestId("area-chart")).toHaveLength(3);
    expect(screen.getAllByTestId("bar-chart")).toHaveLength(1);
  });

  it("exercises value formatters on charts", () => {
    render(<DecompositionPanel data={SAMPLE_DATA} loading={false} />);
    const areaCharts = screen.getAllByTestId("area-chart");
    for (const chart of areaCharts) {
      expect(chart.getAttribute("data-formatted-sample")).toBe("42");
    }
    const barChart = screen.getByTestId("bar-chart");
    expect(barChart.getAttribute("data-formatted-sample")).toBe("42");
  });
});
