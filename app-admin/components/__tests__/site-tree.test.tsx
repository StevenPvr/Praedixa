import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteTree } from "../site-tree";

vi.mock("@praedixa/ui", () => globalThis.__mocks.createUiMocks());

vi.mock("lucide-react", () => globalThis.__mocks.createLucideIconMocks());

const hierarchy = [
  {
    id: "site-1",
    name: "Paris Nord",
    city: "Paris",
    departments: [
      { id: "dept-1", name: "Logistique", employeeCount: 25 },
      { id: "dept-2", name: "Transport", employeeCount: 12 },
    ],
  },
  {
    id: "site-2",
    name: "Lyon Sud",
    departments: [],
  },
];

describe("SiteTree", () => {
  it("renders 'Tous les sites' option", () => {
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId={null}
        onSelectSite={vi.fn()}
      />,
    );
    expect(screen.getByText("Tous les sites")).toBeInTheDocument();
  });

  it("renders site names", () => {
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId={null}
        onSelectSite={vi.fn()}
      />,
    );
    expect(screen.getByText("Paris Nord")).toBeInTheDocument();
    expect(screen.getByText("Lyon Sud")).toBeInTheDocument();
  });

  it("renders city when available", () => {
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId={null}
        onSelectSite={vi.fn()}
      />,
    );
    expect(screen.getByText("Paris")).toBeInTheDocument();
  });

  it("calls onSelectSite(null) when clicking 'Tous les sites'", async () => {
    const user = userEvent.setup();
    const onSelectSite = vi.fn();
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId="site-1"
        onSelectSite={onSelectSite}
      />,
    );
    await user.click(screen.getByText("Tous les sites"));
    expect(onSelectSite).toHaveBeenCalledWith(null);
  });

  it("calls onSelectSite with site id when clicking a site", async () => {
    const user = userEvent.setup();
    const onSelectSite = vi.fn();
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId={null}
        onSelectSite={onSelectSite}
      />,
    );
    await user.click(screen.getByText("Paris Nord"));
    expect(onSelectSite).toHaveBeenCalledWith("site-1");
  });

  it("expands and collapses departments on toggle", async () => {
    const user = userEvent.setup();
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId={null}
        onSelectSite={vi.fn()}
      />,
    );

    expect(screen.queryByText("Logistique")).not.toBeInTheDocument();

    const expandButtons = screen.getAllByLabelText("Deplier");
    await user.click(expandButtons[0]);

    expect(screen.getByText("Logistique")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Replier"));
    expect(screen.queryByText("Logistique")).not.toBeInTheDocument();
  });

  it("highlights selected site", () => {
    render(
      <SiteTree
        hierarchy={hierarchy}
        selectedSiteId="site-1"
        onSelectSite={vi.fn()}
      />,
    );
    const siteButton = screen.getByText("Paris Nord").closest("button");
    expect(siteButton?.className).toContain("text-amber-700");
  });
});
