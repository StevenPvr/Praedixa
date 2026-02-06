import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RiskCards } from "../risk-cards";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: Record<string, unknown>) => (
    <a href={href as string} {...props}>
      {children as React.ReactNode}
    </a>
  ),
}));

vi.mock("@praedixa/ui", () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

function makeDailyEntry(
  overrides: Partial<{
    forecastDate: string;
    dimension: string;
    predictedDemand: number;
    predictedCapacity: number;
    gap: number;
    riskScore: number;
    confidenceLower: number;
    confidenceUpper: number;
    departmentId: string | null;
  }> = {},
) {
  return {
    forecastDate: "2026-02-01",
    dimension: "human",
    predictedDemand: 100,
    predictedCapacity: 80,
    gap: -20,
    riskScore: 0.5,
    confidenceLower: 70,
    confidenceUpper: 90,
    departmentId: null,
    ...overrides,
  };
}

describe("RiskCards", () => {
  describe("loading state", () => {
    it("renders 3 skeleton cards when loading", () => {
      render(<RiskCards dailyData={null} loading={true} dimension="human" />);
      const skeletons = screen.getAllByTestId("skeleton-card");
      expect(skeletons).toHaveLength(3);
    });
  });

  describe("empty states", () => {
    it("shows empty message when dailyData is null", () => {
      render(<RiskCards dailyData={null} loading={false} dimension="human" />);
      expect(
        screen.getByText("Aucune donnee de risque disponible"),
      ).toBeInTheDocument();
    });

    it("shows empty message when dailyData is empty array", () => {
      render(<RiskCards dailyData={[]} loading={false} dimension="human" />);
      expect(
        screen.getByText("Aucune donnee de risque disponible"),
      ).toBeInTheDocument();
    });
  });

  describe("department labels", () => {
    it("displays 'Tous departements' for global entry (departmentId=null)", () => {
      const data = [makeDailyEntry({ departmentId: null, riskScore: 0.5 })];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("Tous departements")).toBeInTheDocument();
    });

    it("displays 'Dept. {first8chars}' for named department", () => {
      const data = [
        makeDailyEntry({
          departmentId: "dept-001-abcd-efgh",
          riskScore: 0.5,
        }),
      ];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("Dept. dept-001")).toBeInTheDocument();
    });
  });

  describe("risk score display", () => {
    it("displays risk score as percentage out of 100", () => {
      const data = [makeDailyEntry({ riskScore: 0.75 })];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("75")).toBeInTheDocument();
      expect(screen.getByText("/ 100")).toBeInTheDocument();
    });

    it("rounds score to nearest integer", () => {
      const data = [makeDailyEntry({ riskScore: 0.456 })];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("46")).toBeInTheDocument();
    });
  });

  describe("risk levels", () => {
    it("shows 'Faible' label and success colors for low risk (<=0.3)", () => {
      const data = [makeDailyEntry({ riskScore: 0.2 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      expect(screen.getByText("Risque Faible")).toBeInTheDocument();
      const link = container.querySelector("a");
      expect(link?.className).toContain("border-success-500");
      expect(link?.className).toContain("bg-success-50");
    });

    it("shows 'Faible' label at boundary (riskScore=0.3)", () => {
      const data = [makeDailyEntry({ riskScore: 0.3 })];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("Risque Faible")).toBeInTheDocument();
    });

    it("shows 'Moyen' label and warning colors for medium risk (0.3-0.6)", () => {
      const data = [makeDailyEntry({ riskScore: 0.5 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      expect(screen.getByText("Risque Moyen")).toBeInTheDocument();
      const link = container.querySelector("a");
      expect(link?.className).toContain("border-warning-500");
      expect(link?.className).toContain("bg-warning-50");
    });

    it("shows 'Moyen' label at boundary (riskScore=0.6)", () => {
      const data = [makeDailyEntry({ riskScore: 0.6 })];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("Risque Moyen")).toBeInTheDocument();
    });

    it("shows 'Eleve' label and danger colors for high risk (>0.6)", () => {
      const data = [makeDailyEntry({ riskScore: 0.8 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      expect(screen.getByText("Risque Eleve")).toBeInTheDocument();
      const link = container.querySelector("a");
      expect(link?.className).toContain("border-danger-500");
      expect(link?.className).toContain("bg-danger-50");
    });

    it("applies correct text color for each risk level", () => {
      const data = [
        makeDailyEntry({ riskScore: 0.2, departmentId: "low-risk-dept0000" }),
        makeDailyEntry({ riskScore: 0.5, departmentId: "med-risk-dept0000" }),
        makeDailyEntry({ riskScore: 0.8, departmentId: "high-riskdept0000" }),
      ];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      const links = container.querySelectorAll("a");
      // Sorted by avgRisk descending: high (0.8), med (0.5), low (0.2)
      const highLink = links[0];
      const medLink = links[1];
      const lowLink = links[2];

      // Check text color classes on the score spans (first span with font-serif)
      const highScore = highLink.querySelector(".font-serif");
      const medScore = medLink.querySelector(".font-serif");
      const lowScore = lowLink.querySelector(".font-serif");

      expect(highScore?.className).toContain("text-danger-700");
      expect(medScore?.className).toContain("text-warning-700");
      expect(lowScore?.className).toContain("text-success-700");
    });
  });

  describe("aggregation", () => {
    it("aggregates multiple entries for the same department", () => {
      const data = [
        makeDailyEntry({ departmentId: null, riskScore: 0.8 }),
        makeDailyEntry({ departmentId: null, riskScore: 0.4 }),
      ];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      // avgRisk = (0.8 + 0.4) / 2 = 0.6 → 60
      expect(screen.getByText("60")).toBeInTheDocument();
      expect(screen.getByText("Tous departements")).toBeInTheDocument();
    });

    it("displays correct day count per department", () => {
      const data = [
        makeDailyEntry({
          departmentId: null,
          riskScore: 0.5,
          forecastDate: "2026-02-01",
        }),
        makeDailyEntry({
          departmentId: null,
          riskScore: 0.6,
          forecastDate: "2026-02-02",
        }),
        makeDailyEntry({
          departmentId: null,
          riskScore: 0.4,
          forecastDate: "2026-02-03",
        }),
      ];
      render(<RiskCards dailyData={data} loading={false} dimension="human" />);
      expect(screen.getByText("3j")).toBeInTheDocument();
    });

    it("sorts departments by avgRisk descending", () => {
      const data = [
        makeDailyEntry({ departmentId: "low-dept-00000000", riskScore: 0.2 }),
        makeDailyEntry({ departmentId: "high-dept0000000", riskScore: 0.9 }),
        makeDailyEntry({ departmentId: "med-dept-00000000", riskScore: 0.5 }),
      ];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      const links = container.querySelectorAll("a");
      expect(links).toHaveLength(3);
      // First: high (0.9), Second: med (0.5), Third: low (0.2)
      expect(links[0].textContent).toContain("Dept. high-dep");
      expect(links[1].textContent).toContain("Dept. med-dept");
      expect(links[2].textContent).toContain("Dept. low-dept");
    });
  });

  describe("dimension links", () => {
    it("links to /previsions/humaine for dimension='human'", () => {
      const data = [makeDailyEntry({ riskScore: 0.5 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/previsions/humaine");
    });

    it("links to /previsions/marchandise for dimension='merchandise'", () => {
      const data = [makeDailyEntry({ riskScore: 0.5 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="merchandise" />,
      );
      const link = container.querySelector("a");
      expect(link?.getAttribute("href")).toBe("/previsions/marchandise");
    });
  });

  describe("layout", () => {
    it("renders grid with correct CSS classes", () => {
      const data = [makeDailyEntry({ riskScore: 0.5 })];
      const { container } = render(
        <RiskCards dailyData={data} loading={false} dimension="human" />,
      );
      const grid = container.firstElementChild;
      expect(grid?.className).toContain("grid");
      expect(grid?.className).toContain("grid-cols-2");
      expect(grid?.className).toContain("lg:grid-cols-3");
    });
  });
});
