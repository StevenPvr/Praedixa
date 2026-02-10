"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  MessageSquare,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "./praedixa-logo";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hide from non-admin users */
  adminOnly?: boolean;
}

type UserRole = "admin" | "manager" | "viewer";

interface SidebarProps {
  currentPath: string;
  userRole: UserRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  siteName?: string;
  unreadCount?: number;
}

/* ────────────────────────────────────────────── */
/*  Navigation config                             */
/* ────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Donnees", href: "/donnees", icon: Database },
  { label: "Previsions", href: "/previsions", icon: TrendingUp },
  { label: "Actions", href: "/actions", icon: Zap },
  { label: "Messages", href: "/messages", icon: MessageSquare },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Rapports", href: "/rapports", icon: FileBarChart },
  { label: "Parametres", href: "/parametres", icon: Settings, adminOnly: true },
];

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export function Sidebar({
  currentPath,
  userRole,
  collapsed = false,
  onToggleCollapse,
  siteName,
  unreadCount = 0,
}: SidebarProps) {
  const isActive = (href: string) => currentPath.startsWith(href);

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.adminOnly || userRole === "admin");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/10 bg-sidebar transition-[width] duration-200",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      {/* Logo */}
      <div className="relative flex h-topbar items-center px-5 after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <PraedixaLogo size={32} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="truncate font-serif text-lg font-semibold text-white">
                Praedixa
              </span>
              <p className="truncate text-xs text-white/50">
                {siteName ?? "Tous les sites"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigation principale"
      >
        <ul className="space-y-1" role="list">
          {filterByRole(NAV_ITEMS).map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={isActive(item.href)}
              badge={
                item.href === "/messages" && unreadCount > 0
                  ? unreadCount
                  : undefined
              }
            />
          ))}
        </ul>
      </nav>

      {/* Separator + bottom items */}
      <div className="border-t border-white/10 px-3 py-4">
        <ul className="space-y-1" role="list">
          {filterByRole(BOTTOM_ITEMS).map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              collapsed={collapsed}
              active={isActive(item.href)}
            />
          ))}
        </ul>
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-t border-white/10 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label={collapsed ? "Agrandir le menu" : "Reduire le menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      )}
    </aside>
  );
}

/* ────────────────────────────────────────────── */
/*  NavItemRow                                    */
/* ────────────────────────────────────────────── */

interface NavItemRowProps {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  badge?: number;
}

function NavItemRow({ item, collapsed, active, badge }: NavItemRowProps) {
  const Icon = item.icon;

  return (
    <li>
      <a
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
          active
            ? "bg-amber-500/15 font-medium text-amber-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-full before:bg-amber-500"
            : "text-white/60 hover:bg-white/5 hover:text-white",
          collapsed && "justify-center px-0",
        )}
        aria-current={active ? "page" : undefined}
      >
        <span className="relative">
          <Icon
            className={cn(
              "h-5 w-5 shrink-0",
              active
                ? "text-amber-400"
                : "text-white/40 group-hover:text-white/70",
            )}
            aria-hidden="true"
          />
          {collapsed && badge != null && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {badge != null && badge > 0 && (
              <span
                className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white"
                aria-label={`${badge} messages non lus`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </>
        )}
      </a>
    </li>
  );
}
