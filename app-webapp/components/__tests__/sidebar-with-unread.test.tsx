import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { SidebarWithUnread } from "../sidebar-with-unread";

const sidebarSpy = vi.fn(() => <aside data-testid="sidebar" />);

vi.mock("@/components/sidebar", () => ({
  Sidebar: (props: unknown) => sidebarSpy(props),
}));

describe("SidebarWithUnread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards required props to Sidebar", () => {
    render(
      <SidebarWithUnread
        currentPath="/dashboard"
        userRole="admin"
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );

    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: "/dashboard",
        userRole: "admin",
        collapsed: false,
      }),
    );
  });

  it("forwards site scope props to Sidebar", () => {
    const onSiteChange = vi.fn();

    render(
      <SidebarWithUnread
        currentPath="/previsions"
        userRole="manager"
        collapsed
        onToggleCollapse={vi.fn()}
        siteOptions={[
          { id: "all", label: "Tous" },
          { id: "lyon", label: "Lyon" },
        ]}
        selectedSiteId="lyon"
        selectedSiteLabel="Lyon"
        siteFallbackLabel="Tous les sites"
        onSiteChange={onSiteChange}
      />,
    );

    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPath: "/previsions",
        userRole: "manager",
        siteOptions: [
          { id: "all", label: "Tous" },
          { id: "lyon", label: "Lyon" },
        ],
        selectedSiteId: "lyon",
        selectedSiteLabel: "Lyon",
        siteFallbackLabel: "Tous les sites",
        onSiteChange,
      }),
    );
  });

  it("forwards collapse handler by reference", () => {
    const onToggleCollapse = vi.fn();

    render(
      <SidebarWithUnread
        currentPath="/messages"
        userRole="viewer"
        collapsed={false}
        onToggleCollapse={onToggleCollapse}
      />,
    );

    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({ onToggleCollapse }),
    );
  });
});
