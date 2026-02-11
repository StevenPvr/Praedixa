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
import { useI18n } from "@/lib/i18n/provider";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  group: "pilotage" | "decider" | "collaborer" | "admin";
  labelKey: string;
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
  priorityCount?: number;
}

/* ────────────────────────────────────────────── */
/*  Navigation config                             */
/* ────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "pilotage",
    labelKey: "sidebar.items.dashboard",
  },
  {
    id: "donnees",
    href: "/donnees",
    icon: Database,
    group: "pilotage",
    labelKey: "sidebar.items.donnees",
  },
  {
    id: "previsions",
    href: "/previsions",
    icon: TrendingUp,
    group: "pilotage",
    labelKey: "sidebar.items.previsions",
  },
  {
    id: "actions",
    href: "/actions",
    icon: Zap,
    group: "decider",
    labelKey: "sidebar.items.actions",
  },
  {
    id: "messages",
    href: "/messages",
    icon: MessageSquare,
    group: "collaborer",
    labelKey: "sidebar.items.messages",
  },
  {
    id: "rapports",
    href: "/rapports",
    icon: FileBarChart,
    group: "admin",
    labelKey: "sidebar.items.rapports",
  },
  {
    id: "parametres",
    href: "/parametres",
    icon: Settings,
    group: "admin",
    labelKey: "sidebar.items.parametres",
    adminOnly: true,
  },
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
  priorityCount = 0,
}: SidebarProps) {
  const { t } = useI18n();
  const isActive = (href: string) => currentPath.startsWith(href);

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.adminOnly || userRole === "admin");

  const visibleItems = filterByRole(NAV_ITEMS);
  const groups: Array<NavItem["group"]> = [
    "pilotage",
    "decider",
    "collaborer",
    "admin",
  ];

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
                {siteName ?? t("sidebar.siteFallback")}
              </p>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-3 py-3">
          <a
            href="/actions"
            className="block rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-white/90 transition-colors hover:bg-amber-500/15"
          >
            <p className="text-xs uppercase tracking-wide text-amber-300">
              {t("sidebar.title")}
            </p>
            <p className="mt-1 text-xs text-white/70">
              {t("sidebar.subtitle")}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-medium text-amber-300">
                {t("sidebar.cta")}
              </span>
              {priorityCount > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {priorityCount > 99 ? "99+" : priorityCount}
                </span>
              )}
            </div>
          </a>
        </div>
      )}

      {/* Grouped navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigation principale"
      >
        {groups.map((group) => {
          const items = visibleItems.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="mb-1 px-2 text-[11px] uppercase tracking-wide text-white/35">
                  {t(`sidebar.groups.${group}`)}
                </p>
              )}
              <ul className="space-y-1" role="list">
                {items.map((item) => (
                  <NavItemRow
                    key={item.href}
                    item={item}
                    label={t(item.labelKey)}
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
            </div>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-t border-white/10 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
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
  label: string;
  collapsed: boolean;
  active: boolean;
  badge?: number;
}

function NavItemRow({
  item,
  label,
  collapsed,
  active,
  badge,
}: NavItemRowProps) {
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
            <span className="truncate">{label}</span>
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
