import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeatureImportanceBar } from "../feature-importance-bar";

/* ─── Tests ──────────────────────────────────────── */

describe("FeatureImportanceBar", () => {
  it("renders skeleton bars when loading", () => {
    render(<FeatureImportanceBar features={[]} loading={true} />);
    const skeletons = screen.getAllByTestId("skeleton-bar");
    expect(skeletons).toHaveLength(5);
  });

  it("renders empty message when features are empty and not loading", () => {
    render(<FeatureImportanceBar features={[]} loading={false} />);
    expect(screen.getByTestId("empty-features")).toBeInTheDocument();
    expect(
      screen.getByText("Aucun facteur explicatif exploitable pour le moment."),
    ).toBeInTheDocument();
  });

  it("renders feature labels", () => {
    const features = [
      { label: "Absences prevues", value: 60 },
      { label: "Pic d'activite", value: 30 },
    ];
    render(<FeatureImportanceBar features={features} loading={false} />);
    expect(screen.getByText("Absences prevues")).toBeInTheDocument();
    expect(screen.getByText("Pic d'activite")).toBeInTheDocument();
  });

  it("renders percentages", () => {
    const features = [
      { label: "Absences prevues", value: 60 },
      { label: "Pic d'activite", value: 30 },
    ];
    render(<FeatureImportanceBar features={features} loading={false} />);
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("displays max 6 features", () => {
    const features = Array.from({ length: 8 }, (_, i) => ({
      label: `Feature ${i}`,
      value: 10 + i,
    }));
    render(<FeatureImportanceBar features={features} loading={false} />);

    expect(screen.getByText("Feature 0")).toBeInTheDocument();
    expect(screen.getByText("Feature 5")).toBeInTheDocument();
    expect(screen.queryByText("Feature 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Feature 7")).not.toBeInTheDocument();
  });

  it("renders amber bars with proportional width", () => {
    const features = [
      { label: "High", value: 80 },
      { label: "Low", value: 40 },
    ];
    const { container } = render(
      <FeatureImportanceBar features={features} loading={false} />,
    );

    const bars = container.querySelectorAll(".bg-gradient-to-r");
    expect(bars).toHaveLength(2);

    // First bar should be 100% width (it's the max)
    expect((bars[0] as HTMLElement).style.width).toBe("100%");
    // Second bar should be 50% width (40/80)
    expect((bars[1] as HTMLElement).style.width).toBe("50%");
  });

  it("handles zero max value gracefully", () => {
    const features = [{ label: "Zero", value: 0 }];
    const { container } = render(
      <FeatureImportanceBar features={features} loading={false} />,
    );

    const bars = container.querySelectorAll(".bg-gradient-to-r");
    expect(bars).toHaveLength(1);
    expect((bars[0] as HTMLElement).style.width).toBe("3%");
  });
});
