"use client";

import { Sidebar } from "@/components/sidebar";

interface SidebarWithUnreadProps {
  currentPath: string;
  userRole: "admin" | "manager" | "viewer";
  collapsed: boolean;
  onToggleCollapse: () => void;
  siteOptions?: Array<{ id: string; label: string }>;
  selectedSiteId?: string | null;
  selectedSiteLabel?: string;
  siteFallbackLabel?: string;
  onSiteChange?: (siteId: string | null) => void;
}

export function SidebarWithUnread({
  currentPath,
  userRole,
  collapsed,
  onToggleCollapse,
  siteOptions,
  selectedSiteId,
  selectedSiteLabel,
  siteFallbackLabel,
  onSiteChange,
}: SidebarWithUnreadProps) {
  return (
    <Sidebar
      currentPath={currentPath}
      userRole={userRole}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      siteOptions={siteOptions}
      selectedSiteId={selectedSiteId}
      selectedSiteLabel={selectedSiteLabel}
      siteFallbackLabel={siteFallbackLabel}
      onSiteChange={onSiteChange}
    />
  );
}
