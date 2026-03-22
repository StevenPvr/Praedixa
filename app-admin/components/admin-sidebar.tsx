"use client";

import * as React from "react";
import Link from "next/link";
import {
  Home,
  Building2,
  Mail,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "./praedixa-logo";
import {
  ADMIN_GLOBAL_NAV_ITEMS,
  canAccessPath,
} from "@/lib/auth/admin-route-policies";

type AdminSidebarProps = Readonly<{
  currentPath: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userEmail?: string;
  onLogout?: () => void;
  permissions?: readonly string[] | null;
}>;

type SidebarHeaderProps = Readonly<{
  isCollapsed: boolean;
}>;

type SidebarNavSectionProps = Readonly<{
  currentPath: string;
  group: (typeof ADMIN_GLOBAL_NAV_ITEMS)[number]["group"];
  isCollapsed: boolean;
  items: typeof ADMIN_GLOBAL_NAV_ITEMS;
}>;

type SidebarAccountPanelProps = Readonly<{
  hasLogout: boolean;
  hasUserEmail: boolean;
  isCollapsed: boolean;
  onLogout: (() => void) | undefined;
  userEmail: string | undefined;
}>;

type SidebarCollapseButtonProps = Readonly<{
  hasToggleCollapse: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (() => void) | undefined;
}>;

const NAV_ICONS: Record<string, LucideIcon> = {
  clients: Building2,
  contact: Mail,
  home: Home,
  journal: BookOpen,
  settings: Settings,
};

const GROUP_LABELS: Record<
  (typeof ADMIN_GLOBAL_NAV_ITEMS)[number]["group"],
  string
> = {
  pilotage: "Pilotage",
  operations: "Operations",
  gouvernance: "Gouvernance",
};

const GROUP_ORDER: Array<(typeof ADMIN_GLOBAL_NAV_ITEMS)[number]["group"]> = [
  "pilotage",
  "operations",
  "gouvernance",
];

function isActiveSidebarPath(currentPath: string, href: string): boolean {
  if (href === "/") {
    return currentPath === "/";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
}

function getVisibleNavItems(permissions?: readonly string[] | null) {
  if (permissions === null || permissions === undefined) {
    return ADMIN_GLOBAL_NAV_ITEMS;
  }

  return ADMIN_GLOBAL_NAV_ITEMS.filter((item) =>
    canAccessPath(item.href, permissions),
  );
}

function SidebarHeader({ isCollapsed }: SidebarHeaderProps) {
  const brandContent = isCollapsed ? null : (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text">
        Praedixa
      </span>
      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-text">
        Admin
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-topbar items-center border-b border-sidebar-border",
        isCollapsed ? "justify-center" : "px-5",
      )}
    >
      <Link
        href="/"
        className="group flex min-h-[44px] items-center gap-3 overflow-hidden"
        aria-label="Praedixa Admin"
      >
        <PraedixaLogo
          size={28}
          className="shrink-0 text-sidebar-text transition-transform duration-fast group-hover:scale-110"
        />
        {brandContent}
      </Link>
    </div>
  );
}

function SidebarNavSection({
  currentPath,
  group,
  isCollapsed,
  items,
}: SidebarNavSectionProps) {
  if (items.length === 0) {
    return null;
  }

  const groupLabel = GROUP_LABELS[group];
  const heading = isCollapsed ? null : (
    <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-text-muted">
      {groupLabel}
    </p>
  );

  return (
    <section className="space-y-1.5">
      {heading}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon] ?? Home;
          const active = isActiveSidebarPath(currentPath, item.href);
          const itemLabel = isCollapsed ? null : (
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          );

          return (
            <li key={item.id}>
              <div className="group relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-y-1 left-1 w-1 rounded-full opacity-0 transition-opacity duration-fast",
                    "bg-primary",
                    active && "opacity-100",
                  )}
                />
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center rounded-lg px-3 py-2 text-sm transition-colors duration-fast",
                    isCollapsed ? "justify-center" : "gap-2.5",
                    active
                      ? "bg-sidebar-active text-sidebar-text"
                      : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  {itemLabel}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SidebarAccountPanel({
  hasLogout,
  hasUserEmail,
  isCollapsed,
  onLogout,
  userEmail,
}: SidebarAccountPanelProps) {
  if (isCollapsed || hasUserEmail === false || userEmail === undefined) {
    return null;
  }

  const logoutButton = hasLogout ? (
    <button
      onClick={onLogout}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
      aria-label="Se deconnecter"
    >
      <LogOut className="h-4 w-4" />
    </button>
  ) : null;

  return (
    <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-hover px-3 py-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-sidebar-text">{userEmail}</p>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-text-muted">
            Super Admin
          </p>
        </div>
        {logoutButton}
      </div>
    </div>
  );
}

function SidebarCollapseButton({
  hasToggleCollapse,
  isCollapsed,
  onToggleCollapse,
}: SidebarCollapseButtonProps) {
  if (hasToggleCollapse === false || onToggleCollapse === undefined) {
    return null;
  }

  const collapseLabel = isCollapsed ? "Agrandir le menu" : "Reduire le menu";
  const collapseIcon = isCollapsed ? (
    <ChevronRight className="h-4 w-4" />
  ) : (
    <>
      <ChevronLeft className="h-4 w-4" />
      <span className="text-xs font-medium">Reduire</span>
    </>
  );

  return (
    <button
      onClick={onToggleCollapse}
      className={cn(
        "flex min-h-[40px] items-center justify-center rounded-lg text-sidebar-text-muted",
        "transition-colors duration-fast hover:bg-sidebar-hover hover:text-sidebar-text",
        isCollapsed ? "mx-auto h-9 w-9" : "h-9 w-full gap-2",
      )}
      aria-label={collapseLabel}
    >
      {collapseIcon}
    </button>
  );
}

export function AdminSidebar({
  currentPath,
  collapsed = false,
  onToggleCollapse,
  userEmail,
  onLogout,
  permissions,
}: AdminSidebarProps) {
  const isCollapsed = collapsed === true;
  const hasToggleCollapse = typeof onToggleCollapse === "function";
  const hasLogout = typeof onLogout === "function";
  const hasUserEmail = typeof userEmail === "string" && userEmail.length > 0;
  const visibleNavItems = React.useMemo(
    () => getVisibleNavItems(permissions),
    [permissions],
  );

  return (
    <aside
      data-sidebar
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-normal ease-snappy",
        isCollapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <SidebarHeader isCollapsed={isCollapsed} />

      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        aria-label="Navigation admin"
      >
        {GROUP_ORDER.map((group) => {
          const items = visibleNavItems.filter((item) => item.group === group);
          return (
            <SidebarNavSection
              key={group}
              currentPath={currentPath}
              group={group}
              isCollapsed={isCollapsed}
              items={items}
            />
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-3">
        <SidebarAccountPanel
          hasLogout={hasLogout}
          hasUserEmail={hasUserEmail}
          isCollapsed={isCollapsed}
          onLogout={onLogout}
          userEmail={userEmail}
        />
        <SidebarCollapseButton
          hasToggleCollapse={hasToggleCollapse}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </div>
    </aside>
  );
}
