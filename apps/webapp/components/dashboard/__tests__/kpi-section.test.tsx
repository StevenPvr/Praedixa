import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("@praedixa/ui", () => ({
  StatCard: (props: Record<string, unknown>) => (
    <div
      data-testid="stat-card"
      data-variant={props.variant ?? "default"}
      data-label={props.label}
      data-value={props.value}
      data-trend={props.trendDirection}
    >
      {props.icon as React.ReactNode}
    </div>
  ),
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

vi.mock("lucide-react", () => ({
  Users: (props: Record<string, unknown>) => (
    <span data-testid="icon-users" aria-hidden={props["aria-hidden"]} />
  ),
  Package: (props: Record<string, unknown>) => (
    <span data-testid="icon-package" aria-hidden={props["aria-hidden"]} />
  ),
  AlertTriangle: (props: Record<string, unknown>) => (
    <span
      data-testid="icon-alert-triangle"
      aria-hidden={props["aria-hidden"]}
    />
  ),
  TrendingUp: (props: Record<string, unknown>) => (
    <span data-testid="icon-trending-up" aria-hidden={props["aria-hidden"]} />
  ),
}));

import { KpiSection } from "../kpi-section";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

interface DashboardSummary {
  coverageHuman: number;
  coverageMerchandise: number;
  activeAlertsCount: number;
  forecastAccuracy: number | null;
}

const fullData: DashboardSummary = {
  coverageHuman: 87.4,
  coverageMerchandise: 91.8,
  activeAlertsCount: 3,
  forecastAccuracy: 94.2,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatCards() {
  return screen.getAllByTestId("stat-card");
}

function findStatCard(label: string) {
  return getStatCards().find(
    (card) => card.getAttribute("data-label") === label,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KpiSection", () => {
  describe("loading state", () => {
    it("should render section with aria-label 'Indicateurs cles'", () => {
      render(<KpiSection data={null} loading={true} />);
      expect(
        screen.getByRole("region", { name: "Indicateurs cles" }),
      ).toBeInTheDocument();
    });

    it("should render 4 SkeletonCards when loading", () => {
      render(<KpiSection data={null} loading={true} />);
      expect(screen.getAllByTestId("skeleton-card")).toHaveLength(4);
    });

    it("should not render any StatCards when loading", () => {
      render(<KpiSection data={null} loading={true} />);
      expect(screen.queryAllByTestId("stat-card")).toHaveLength(0);
    });
  });

  describe("null data, not loading", () => {
    it("should render nothing when data is null and loading is false", () => {
      const { container } = render(<KpiSection data={null} loading={false} />);
      expect(container.innerHTML).toBe("");
    });
  });

  describe("with full data", () => {
    it("should render 4 StatCards", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(getStatCards()).toHaveLength(4);
    });

    it("should render section with aria-label", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(
        screen.getByRole("region", { name: "Indicateurs cles" }),
      ).toBeInTheDocument();
    });

    it("should display human coverage as 87% with variant 'accent'", () => {
      render(<KpiSection data={fullData} loading={false} />);
      const card = findStatCard("Couverture humaine");
      expect(card).toBeDefined();
      expect(card!.getAttribute("data-value")).toBe("87%");
      expect(card!.getAttribute("data-variant")).toBe("accent");
    });

    it("should display merchandise coverage as 92% with variant 'default'", () => {
      render(<KpiSection data={fullData} loading={false} />);
      const card = findStatCard("Couverture marchandise");
      expect(card).toBeDefined();
      expect(card!.getAttribute("data-value")).toBe("92%");
      expect(card!.getAttribute("data-variant")).toBe("default");
    });

    it("should display alerts count as '3' with variant 'danger'", () => {
      render(<KpiSection data={fullData} loading={false} />);
      const card = findStatCard("Alertes actives");
      expect(card).toBeDefined();
      expect(card!.getAttribute("data-value")).toBe("3");
      expect(card!.getAttribute("data-variant")).toBe("danger");
    });

    it("should display accuracy as 94% with variant 'success'", () => {
      render(<KpiSection data={fullData} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card).toBeDefined();
      expect(card!.getAttribute("data-value")).toBe("94%");
      expect(card!.getAttribute("data-variant")).toBe("success");
    });
  });

  describe("alerts variant logic", () => {
    it("should use 'danger' variant when activeAlertsCount > 0", () => {
      const data = { ...fullData, activeAlertsCount: 1 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Alertes actives");
      expect(card!.getAttribute("data-variant")).toBe("danger");
    });

    it("should use 'default' variant when activeAlertsCount is 0", () => {
      const data = { ...fullData, activeAlertsCount: 0 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Alertes actives");
      expect(card!.getAttribute("data-variant")).toBe("default");
    });
  });

  describe("accuracy trend direction", () => {
    it("should be 'up' when accuracy >= 90", () => {
      const data = { ...fullData, forecastAccuracy: 90 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("up");
    });

    it("should be 'up' when accuracy is exactly 90", () => {
      const data = { ...fullData, forecastAccuracy: 90 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("up");
    });

    it("should be 'flat' when accuracy is between 70 and 89", () => {
      const data = { ...fullData, forecastAccuracy: 75 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("flat");
    });

    it("should be 'flat' when accuracy is exactly 70", () => {
      const data = { ...fullData, forecastAccuracy: 70 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("flat");
    });

    it("should be 'down' when accuracy < 70", () => {
      const data = { ...fullData, forecastAccuracy: 69 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("down");
    });

    it("should be 'flat' when accuracy is null", () => {
      const data = { ...fullData, forecastAccuracy: null };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("flat");
    });

    it("should display '--' when accuracy is null", () => {
      const data = { ...fullData, forecastAccuracy: null };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-value")).toBe("--");
    });
  });

  describe("accuracy variant logic", () => {
    it("should use 'success' when accuracy >= 90", () => {
      const data = { ...fullData, forecastAccuracy: 95 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-variant")).toBe("success");
    });

    it("should use 'default' when accuracy < 90", () => {
      const data = { ...fullData, forecastAccuracy: 89 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-variant")).toBe("default");
    });

    it("should use 'default' when accuracy is null", () => {
      const data = { ...fullData, forecastAccuracy: null };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-variant")).toBe("default");
    });
  });

  describe("icons", () => {
    it("should render Users icon for human coverage", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(screen.getByTestId("icon-users")).toBeInTheDocument();
    });

    it("should render Package icon for merchandise coverage", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(screen.getByTestId("icon-package")).toBeInTheDocument();
    });

    it("should render AlertTriangle icon for alerts", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(screen.getByTestId("icon-alert-triangle")).toBeInTheDocument();
    });

    it("should render TrendingUp icon for accuracy", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(screen.getByTestId("icon-trending-up")).toBeInTheDocument();
    });

    it("should mark all icons as aria-hidden", () => {
      render(<KpiSection data={fullData} loading={false} />);
      expect(screen.getByTestId("icon-users")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(screen.getByTestId("icon-package")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(screen.getByTestId("icon-alert-triangle")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      expect(screen.getByTestId("icon-trending-up")).toHaveAttribute(
        "aria-hidden",
        "true",
      );
    });
  });

  describe("coverage value formatting", () => {
    it("should round human coverage to whole number", () => {
      const data = { ...fullData, coverageHuman: 87.999 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Couverture humaine");
      expect(card!.getAttribute("data-value")).toBe("88%");
    });

    it("should round merchandise coverage to whole number", () => {
      const data = { ...fullData, coverageMerchandise: 50.4 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Couverture marchandise");
      expect(card!.getAttribute("data-value")).toBe("50%");
    });

    it("should display 0% when coverage is 0", () => {
      const data = { ...fullData, coverageHuman: 0 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Couverture humaine");
      expect(card!.getAttribute("data-value")).toBe("0%");
    });

    it("should display 100% when coverage is 100", () => {
      const data = { ...fullData, coverageMerchandise: 100 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Couverture marchandise");
      expect(card!.getAttribute("data-value")).toBe("100%");
    });
  });

  describe("human coverage always uses accent variant", () => {
    it("should always use 'accent' regardless of value", () => {
      const data = { ...fullData, coverageHuman: 10 };
      render(<KpiSection data={data} loading={false} />);
      const card = findStatCard("Couverture humaine");
      expect(card!.getAttribute("data-variant")).toBe("accent");
    });
  });

  describe("edge cases: accuracy at exact boundaries", () => {
    it("should be 'up' at accuracy=90, 'flat' at accuracy=89", () => {
      const { rerender } = render(
        <KpiSection
          data={{ ...fullData, forecastAccuracy: 90 }}
          loading={false}
        />,
      );
      let card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("up");

      rerender(
        <KpiSection
          data={{ ...fullData, forecastAccuracy: 89 }}
          loading={false}
        />,
      );
      card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("flat");
    });

    it("should be 'flat' at accuracy=70, 'down' at accuracy=69", () => {
      const { rerender } = render(
        <KpiSection
          data={{ ...fullData, forecastAccuracy: 70 }}
          loading={false}
        />,
      );
      let card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("flat");

      rerender(
        <KpiSection
          data={{ ...fullData, forecastAccuracy: 69 }}
          loading={false}
        />,
      );
      card = findStatCard("Precision forecast");
      expect(card!.getAttribute("data-trend")).toBe("down");
    });
  });
});
