import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskDistributionChart } from "../risk-distribution-chart";

vi.mock("@tremor/react", () => ({
  BarChart: (props: Record<string, unknown>) => {
    // Invoke valueFormatter to exercise the inline arrow function for coverage
    const formatter = props.valueFormatter as
      | ((v: number) => string)
      | undefined;
    const formattedSample = formatter ? formatter(5) : "";
    return (
      <div
        data-testid="bar-chart"
        data-chart-data={JSON.stringify(props.data)}
        data-categories={JSON.stringify(props.categories)}
        data-formatted-sample={formattedSample}
      />
    );
  },
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonChart: () => <div data-testid="skeleton-chart" />,
}));

function makeEntry(riskScore: number, departmentId: string | null = null) {
  return { riskScore, departmentId };
}

describe("RiskDistributionChart", () => {
  describe("loading state", () => {
    it("renders SkeletonChart when loading", () => {
      render(<RiskDistributionChart dailyData={null} loading={true} />);
      expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
    });
  });

  describe("empty states", () => {
    it("returns null when dailyData is null", () => {
      const { container } = render(
        <RiskDistributionChart dailyData={null} loading={false} />,
      );
      expect(container.innerHTML).toBe("");
    });

    it("returns null when dailyData is empty array", () => {
      const { container } = render(
        <RiskDistributionChart dailyData={[]} loading={false} />,
      );
      expect(container.innerHTML).toBe("");
    });
  });

  describe("section structure", () => {
    it("has aria-label 'Distribution du risque'", () => {
      const data = [makeEntry(0.5)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      expect(
        screen.getByLabelText("Distribution du risque"),
      ).toBeInTheDocument();
    });

    it("renders heading 'Distribution du risque par departement'", () => {
      const data = [makeEntry(0.5)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      expect(
        screen.getByText("Distribution du risque par departement"),
      ).toBeInTheDocument();
    });

    it("renders subtitle 'Nombre de jours par niveau de risque'", () => {
      const data = [makeEntry(0.5)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      expect(
        screen.getByText("Nombre de jours par niveau de risque"),
      ).toBeInTheDocument();
    });
  });

  describe("classifyRisk boundaries", () => {
    it("classifies riskScore 0.3 as low (Faible)", () => {
      const data = [makeEntry(0.3)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData[0].Faible).toBe(1);
      expect(chartData[0].Moyen).toBe(0);
      expect(chartData[0].Eleve).toBe(0);
    });

    it("classifies riskScore 0.6 as medium (Moyen)", () => {
      const data = [makeEntry(0.6)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData[0].Faible).toBe(0);
      expect(chartData[0].Moyen).toBe(1);
      expect(chartData[0].Eleve).toBe(0);
    });

    it("classifies riskScore 0.1 as low, 0.5 as medium, 0.8 as high", () => {
      const data = [makeEntry(0.1), makeEntry(0.5), makeEntry(0.8)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      // All same departmentId (null → "Global"), aggregated into one entry
      expect(chartData).toHaveLength(1);
      expect(chartData[0].Faible).toBe(1);
      expect(chartData[0].Moyen).toBe(1);
      expect(chartData[0].Eleve).toBe(1);
    });
  });

  describe("department labels in chart", () => {
    it("labels null departmentId as 'Global'", () => {
      const data = [makeEntry(0.5, null)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData[0].Departement).toBe("Global");
    });

    it("labels non-null departmentId as 'Dept. {first8chars}'", () => {
      const data = [makeEntry(0.5, "dept-001-abcd-efgh")];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData[0].Departement).toBe("Dept. dept-001");
    });
  });

  describe("chart data aggregation", () => {
    it("aggregates multiple entries per department correctly", () => {
      const data = [
        makeEntry(0.1, null),
        makeEntry(0.5, null),
        makeEntry(0.8, null),
        makeEntry(0.2, null),
        makeEntry(0.9, null),
      ];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData).toHaveLength(1);
      expect(chartData[0].Departement).toBe("Global");
      // 0.1 → low, 0.2 → low, 0.5 → medium, 0.8 → high, 0.9 → high
      expect(chartData[0].Faible).toBe(2);
      expect(chartData[0].Moyen).toBe(1);
      expect(chartData[0].Eleve).toBe(2);
    });

    it("creates separate entries for different departments", () => {
      const data = [
        makeEntry(0.2, null),
        makeEntry(0.7, "dept-aaa-00000000"),
        makeEntry(0.4, "dept-bbb-00000000"),
      ];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const chartData = JSON.parse(
        chart.getAttribute("data-chart-data") ?? "[]",
      );
      expect(chartData).toHaveLength(3);

      const global = chartData.find(
        (d: Record<string, unknown>) => d.Departement === "Global",
      );
      const deptA = chartData.find(
        (d: Record<string, unknown>) => d.Departement === "Dept. dept-aaa",
      );
      const deptB = chartData.find(
        (d: Record<string, unknown>) => d.Departement === "Dept. dept-bbb",
      );

      expect(global).toEqual({
        Departement: "Global",
        Faible: 1,
        Moyen: 0,
        Eleve: 0,
      });
      expect(deptA).toEqual({
        Departement: "Dept. dept-aaa",
        Faible: 0,
        Moyen: 0,
        Eleve: 1,
      });
      expect(deptB).toEqual({
        Departement: "Dept. dept-bbb",
        Faible: 0,
        Moyen: 1,
        Eleve: 0,
      });
    });

    it("passes correct categories to BarChart", () => {
      const data = [makeEntry(0.5)];
      render(<RiskDistributionChart dailyData={data} loading={false} />);
      const chart = screen.getByTestId("bar-chart");
      const categories = JSON.parse(
        chart.getAttribute("data-categories") ?? "[]",
      );
      expect(categories).toEqual(["Faible", "Moyen", "Eleve"]);
    });
  });
});
