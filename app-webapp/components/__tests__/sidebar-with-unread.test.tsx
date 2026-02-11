/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SidebarWithUnread } from "../sidebar-with-unread";

const mockUseApiGet = vi.fn();

vi.mock("@/hooks/use-api", () => ({
  useApiGet: (...args: unknown[]) => mockUseApiGet(...args),
}));

vi.mock("@/components/sidebar", () => ({
  Sidebar: ({
    unreadCount,
    currentPath,
  }: {
    unreadCount: number;
    currentPath: string;
    [key: string]: any;
  }) => (
    <aside
      data-testid="sidebar"
      data-unread={unreadCount}
      data-path={currentPath}
    />
  ),
}));

vi.mock("@/lib/chat-config", () => ({
  CHAT_POLL_INTERVAL_MS: 30000,
  LIVE_DATA_POLL_INTERVAL_MS: 10000,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("SidebarWithUnread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Sidebar with unreadCount from API", () => {
    mockUseApiGet.mockReturnValue({
      data: { unreadCount: 5 },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <SidebarWithUnread
        currentPath="/dashboard"
        userRole="admin"
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-unread", "5");
  });

  it("renders 0 unread when API returns null", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <SidebarWithUnread
        currentPath="/messages"
        userRole="viewer"
        collapsed={true}
        onToggleCollapse={vi.fn()}
      />,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-unread", "0");
  });

  it("passes poll interval to useApiGet", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <SidebarWithUnread
        currentPath="/dashboard"
        userRole="admin"
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/conversations/unread-count",
      { pollInterval: 30000 },
    );
    expect(mockUseApiGet).toHaveBeenCalledWith(
      "/api/v1/live/coverage-alerts?status=open&page_size=200",
      { pollInterval: 10000 },
    );
  });

  it("passes currentPath to Sidebar", () => {
    mockUseApiGet.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    render(
      <SidebarWithUnread
        currentPath="/previsions"
        userRole="manager"
        collapsed={false}
        onToggleCollapse={vi.fn()}
      />,
    );
    const sidebar = screen.getByTestId("sidebar");
    expect(sidebar).toHaveAttribute("data-path", "/previsions");
  });
});
