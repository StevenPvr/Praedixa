"use client";

import * as React from "react";
import {
  Home,
  Building2,
  Mail,
  BookOpen,
  Settings,
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  BarChart3,
  ClipboardCheck,
  Users,
  MessageSquare,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  ADMIN_GLOBAL_NAV_ITEMS,
  canAccessPath,
  CLIENT_WORKSPACE_TABS,
  resolveWorkspaceBasePath,
} from "@/lib/auth/admin-route-policies";

export interface CommandItem {
  id: string;
  label: string;
  section: "global" | "workspace";
  href: string;
  icon: LucideIcon;
  keywords: string[];
  shortcut?: string;
}

const GLOBAL_COMMAND_ICONS: Record<string, LucideIcon> = {
  home: Home,
  clients: Building2,
  contact: Mail,
  journal: BookOpen,
  settings: Settings,
};

const WORKSPACE_ICONS: Record<string, LucideIcon> = {
  actions: Zap,
  alerts: Bell,
  "client-overview": LayoutDashboard,
  dashboard: LayoutDashboard,
  data: Database,
  forecasts: TrendingUp,
  messages: MessageSquare,
  onboarding: ClipboardCheck,
  reports: BarChart3,
  settings: Settings,
  team: Users,
};

const GLOBAL_COMMAND_ITEMS: CommandItem[] = ADMIN_GLOBAL_NAV_ITEMS.map(
  (item) => ({
    id: item.id,
    label: item.label === "Accueil" ? "Accueil admin" : item.label,
    section: "global",
    href: item.href,
    icon: GLOBAL_COMMAND_ICONS[item.icon] ?? Home,
    keywords: [...item.keywords],
    ...(item.shortcut ? { shortcut: item.shortcut } : {}),
  }),
);

export { resolveWorkspaceBasePath } from "@/lib/auth/admin-route-policies";

export function buildWorkspaceCommandItems(pathname: string): CommandItem[] {
  const basePath = resolveWorkspaceBasePath(pathname);
  if (basePath) {
    return CLIENT_WORKSPACE_TABS.map((tab) => ({
      id: `workspace-${tab.href}`,
      label: `Workspace • ${tab.label}`,
      section: "workspace",
      href: `${basePath}/${tab.href}`,
      icon: WORKSPACE_ICONS[tab.icon] ?? LayoutDashboard,
      keywords: [...tab.keywords],
    }));
  }

  return [];
}

function filterCommandItems(
  items: CommandItem[],
  query: string,
): CommandItem[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 0) {
    const normalized = trimmedQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.keywords.some((keyword) => keyword.includes(normalized)),
    );
  }

  return items;
}

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isCommandPaletteShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isCommandPaletteShortcut) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

export function useCommandPaletteItems({
  pathname,
  permissions,
  query,
}: Readonly<{
  pathname: string;
  permissions: readonly string[] | null | undefined;
  query: string;
}>) {
  const commandItems = React.useMemo(
    () => [...GLOBAL_COMMAND_ITEMS, ...buildWorkspaceCommandItems(pathname)],
    [pathname],
  );

  const availableItems = React.useMemo(
    () =>
      permissions == null
        ? commandItems
        : commandItems.filter((item) => canAccessPath(item.href, permissions)),
    [commandItems, permissions],
  );

  return React.useMemo(
    () => filterCommandItems(availableItems, query),
    [availableItems, query],
  );
}
