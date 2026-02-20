"use client";

import { useApiGet } from "@/hooks/use-api";
import { Sidebar } from "@/components/sidebar";
import {
  CHAT_POLL_INTERVAL_MS,
  LIVE_DATA_POLL_INTERVAL_MS,
} from "@/lib/chat-config";
import { useSiteScope } from "@/lib/site-scope";

interface SidebarWithUnreadProps {
  currentPath: string;
  userRole: "admin" | "manager" | "viewer";
  collapsed: boolean;
  onToggleCollapse: () => void;
  starredItems?: string[];
  recentItems?: string[];
  onToggleStar?: (itemId: string) => void;
}

export function SidebarWithUnread({
  currentPath,
  userRole,
  collapsed,
  onToggleCollapse,
  starredItems,
  recentItems,
  onToggleStar,
}: SidebarWithUnreadProps) {
  const { appendSiteParam } = useSiteScope();
  const { data: unreadData } = useApiGet<{ unreadCount: number }>(
    "/api/v1/conversations/unread-count",
    { pollInterval: CHAT_POLL_INTERVAL_MS },
  );

  const openAlertsUrl = appendSiteParam(
    "/api/v1/live/coverage-alerts?status=open&page_size=200",
  );
  const { data: queueItems } = useApiGet<unknown[]>(openAlertsUrl, {
    pollInterval: LIVE_DATA_POLL_INTERVAL_MS,
  });

  return (
    <Sidebar
      currentPath={currentPath}
      userRole={userRole}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      unreadCount={unreadData?.unreadCount ?? 0}
      priorityCount={queueItems?.length ?? 0}
      starredItems={starredItems}
      recentItems={recentItems}
      onToggleStar={onToggleStar}
    />
  );
}
