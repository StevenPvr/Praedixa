import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { createRef } from "react";
import { TabBar } from "../components/tab-bar";
import type { Tab } from "../components/tab-bar";

const tabs: Tab[] = [
  { id: "overview", label: "Vue d'ensemble" },
  { id: "details", label: "Details", count: 3 },
  { id: "settings", label: "Parametres", count: 0 },
];

describe("TabBar", () => {
  it("renders all tabs", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("renders tab labels", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Parametres")).toBeInTheDocument();
  });

  it("marks active tab with aria-selected=true", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const activeTab = screen.getByText("Vue d'ensemble").closest("button");
    expect(activeTab).toHaveAttribute("aria-selected", "true");
  });

  it("marks inactive tabs with aria-selected=false", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const inactiveTab = screen.getByText("Details").closest("button");
    expect(inactiveTab).toHaveAttribute("aria-selected", "false");
  });

  it("applies active tab styling", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const activeTab = screen.getByText("Vue d'ensemble").closest("button");
    expect(activeTab).toHaveClass("bg-amber-500", "text-white");
  });

  it("applies inactive tab styling", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const inactiveTab = screen.getByText("Details").closest("button");
    expect(inactiveTab).toHaveClass("bg-gray-100", "text-gray-600");
  });

  it("renders count badge when provided", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders count badge for zero count", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("does not render count badge when undefined", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    // "Vue d'ensemble" tab has no count — its button should have only the label text
    const overviewTab = screen.getByText("Vue d'ensemble").closest("button");
    const spans = overviewTab?.querySelectorAll("span");
    expect(spans?.length ?? 0).toBe(0);
  });

  it("calls onTabChange when tab is clicked", () => {
    const onTabChange = vi.fn();
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText("Details"));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith("details");
  });

  it("has tablist role on container", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(
      <TabBar
        tabs={tabs}
        activeTab="overview"
        onTabChange={() => {}}
        className="my-class"
      />,
    );
    expect(screen.getByRole("tablist")).toHaveClass("my-class");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <TabBar ref={ref} tabs={tabs} activeTab="overview" onTabChange={() => {}} />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it("applies active badge styling for active tab count", () => {
    render(<TabBar tabs={tabs} activeTab="details" onTabChange={() => {}} />);
    const badge = screen.getByText("3");
    expect(badge).toHaveClass("bg-white/20", "text-white");
  });

  it("applies inactive badge styling for inactive tab count", () => {
    render(<TabBar tabs={tabs} activeTab="overview" onTabChange={() => {}} />);
    const badge = screen.getByText("3");
    expect(badge).toHaveClass("bg-gray-200", "text-gray-500");
  });
});
