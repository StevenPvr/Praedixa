import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SkeletonAdminDashboard } from "../skeleton-admin-dashboard";
import { SkeletonOrgList } from "../skeleton-org-list";
import { SkeletonOrgDetail } from "../skeleton-org-detail";
import { SkeletonStepper } from "../skeleton-stepper";

vi.mock("@praedixa/ui", () => ({
  Skeleton: ({ className, ...props }: Record<string, unknown>) => (
    <div data-testid="skeleton" className={className as string} {...props} />
  ),
  SkeletonCard: (props: Record<string, unknown>) => (
    <div data-testid="skeleton-card" {...props} />
  ),
  SkeletonTable: ({
    rows,
    columns,
    ...props
  }: {
    rows?: number;
    columns?: number;
  }) => (
    <div
      data-testid="skeleton-table"
      data-rows={rows}
      data-columns={columns}
      {...props}
    />
  ),
  SkeletonChart: (props: Record<string, unknown>) => (
    <div data-testid="skeleton-chart" {...props} />
  ),
}));

describe("SkeletonAdminDashboard", () => {
  it("renders with aria-busy and role status", () => {
    const { container } = render(<SkeletonAdminDashboard />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("role", "status");
  });

  it("renders 4 SkeletonCard components for KPIs", () => {
    render(<SkeletonAdminDashboard />);
    const cards = screen.getAllByTestId("skeleton-card");
    expect(cards).toHaveLength(4);
  });

  it("renders a SkeletonChart", () => {
    render(<SkeletonAdminDashboard />);
    expect(screen.getByTestId("skeleton-chart")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    const { container } = render(<SkeletonAdminDashboard />);
    expect(container.firstChild).toHaveAttribute(
      "aria-label",
      "Chargement du tableau de bord",
    );
  });
});

describe("SkeletonOrgList", () => {
  it("renders with aria-busy and role status", () => {
    const { container } = render(<SkeletonOrgList />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("role", "status");
  });

  it("renders a SkeletonTable with 8 rows and 7 columns", () => {
    render(<SkeletonOrgList />);
    const table = screen.getByTestId("skeleton-table");
    expect(table).toHaveAttribute("data-rows", "8");
    expect(table).toHaveAttribute("data-columns", "7");
  });

  it("renders 3 filter badge skeletons", () => {
    render(<SkeletonOrgList />);
    // Search bar (1) + 3 filter badges in a flex row
    const skeletons = screen.getAllByTestId("skeleton");
    // At least 4: search bar + 3 filters
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it("has correct aria-label", () => {
    const { container } = render(<SkeletonOrgList />);
    expect(container.firstChild).toHaveAttribute(
      "aria-label",
      "Chargement de la liste des organisations",
    );
  });
});

describe("SkeletonOrgDetail", () => {
  it("renders with aria-busy and role status", () => {
    const { container } = render(<SkeletonOrgDetail />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("role", "status");
  });

  it("renders header skeleton (name + badge)", () => {
    render(<SkeletonOrgDetail />);
    const skeletons = screen.getAllByTestId("skeleton");
    // First two skeletons are the header name and badge
    expect(skeletons.length).toBeGreaterThanOrEqual(2);
  });

  it("has correct aria-label", () => {
    const { container } = render(<SkeletonOrgDetail />);
    expect(container.firstChild).toHaveAttribute(
      "aria-label",
      "Chargement des details de l'organisation",
    );
  });
});

describe("SkeletonStepper", () => {
  it("renders with aria-busy and role status", () => {
    const { container } = render(<SkeletonStepper />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-busy", "true");
    expect(wrapper).toHaveAttribute("role", "status");
  });

  it("renders 5 step circle skeletons by default", () => {
    render(<SkeletonStepper />);
    const skeletons = screen.getAllByTestId("skeleton");
    // 5 circles + 4 connecting lines + title + subtitle + 4 fields (label+input) + button
    const roundedFullSkeletons = skeletons.filter((s) =>
      s.className?.includes("rounded-full"),
    );
    expect(roundedFullSkeletons).toHaveLength(5);
  });

  it("renders custom number of steps", () => {
    render(<SkeletonStepper steps={3} />);
    const skeletons = screen.getAllByTestId("skeleton");
    const roundedFullSkeletons = skeletons.filter((s) =>
      s.className?.includes("rounded-full"),
    );
    expect(roundedFullSkeletons).toHaveLength(3);
  });

  it("has correct aria-label", () => {
    const { container } = render(<SkeletonStepper />);
    expect(container.firstChild).toHaveAttribute(
      "aria-label",
      "Chargement de l'assistant d'onboarding",
    );
  });
});
