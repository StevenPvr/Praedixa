"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { SPRING, EASING, DURATION } from "@/lib/animations/config";

/* ── Types ── */

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  group: "voir" | "anticiper" | "decider" | "suivre" | "gouvernance";
  labelKey: string;
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

/* ── Navigation config ── */

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "voir",
    labelKey: "sidebar.items.dashboard",
  },
  {
    id: "donnees",
    href: "/donnees",
    icon: Database,
    group: "voir",
    labelKey: "sidebar.items.donnees",
  },
  {
    id: "previsions",
    href: "/previsions",
    icon: TrendingUp,
    group: "anticiper",
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
    group: "suivre",
    labelKey: "sidebar.items.messages",
  },
  {
    id: "rapports",
    href: "/rapports",
    icon: FileBarChart,
    group: "gouvernance",
    labelKey: "sidebar.items.rapports",
  },
  {
    id: "parametres",
    href: "/parametres",
    icon: Settings,
    group: "gouvernance",
    labelKey: "sidebar.items.parametres",
    adminOnly: true,
  },
];

const GROUPS: Array<NavItem["group"]> = [
  "voir",
  "anticiper",
  "decider",
  "suivre",
  "gouvernance",
];

/* ── Sidebar ── */

export function Sidebar({
  currentPath,
  userRole,
  collapsed = false,
  onToggleCollapse,
  unreadCount = 0,
  priorityCount = 0,
}: SidebarProps) {
  const { t } = useI18n();

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(`${href}/`);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === "admin",
  );

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col",
        "border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-normal ease-snappy",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      {/* Brand accent line at top */}
      <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      {/* Logo */}
      <div
        className={cn(
          "flex h-topbar items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-5",
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <PraedixaLogo
            size={26}
            className="shrink-0 text-primary transition-transform duration-fast hover:scale-110"
          />
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -6, width: 0 }}
                transition={{ duration: DURATION.fast, ease: EASING.premium }}
                className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text"
              >
                Praedixa
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigation principale"
      >
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const items = visibleItems.filter((item) => item.group === group);
            if (items.length === 0) return null;

            return (
              <div key={group} className="relative">
                {group !== GROUPS[0] && (
                  <div
                    className="gradient-divider -mx-3 mb-3 shrink-0"
                    aria-hidden="true"
                  />
                )}
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: DURATION.micro }}
                      className="mb-1.5 overflow-hidden"
                    >
                      <p className="px-3 text-overline text-sidebar-muted">
                        {t(`sidebar.groups.${group}`)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <ul className="space-y-0.5" role="list">
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
                          : item.href === "/actions" && priorityCount > 0
                            ? priorityCount
                            : undefined
                      }
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </nav>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div className="mt-auto">
          <div className="gradient-divider shrink-0" aria-hidden="true" />
          <div className="p-3">
            <button
              onClick={onToggleCollapse}
              className={cn(
                "flex items-center justify-center rounded-lg text-sidebar-muted",
                "transition-all duration-fast hover:bg-sidebar-hover hover:text-sidebar-text",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                collapsed ? "mx-auto h-9 w-9" : "h-9 w-full gap-2",
              )}
              aria-label={
                collapsed ? t("sidebar.expand") : t("sidebar.collapse")
              }
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {t("sidebar.collapse")}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── NavItem Row ── */

interface NavItemRowProps {
  item: NavItem;
  label: string;
  collapsed: boolean;
  active: boolean;
  badge?: number;
}

const NavItemRow = React.memo(function NavItemRow({
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
          "group relative flex items-center rounded-lg text-[13px]",
          "transition-all duration-fast",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          active
            ? "font-semibold text-sidebar-text"
            : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text",
          collapsed ? "mx-auto h-10 w-10 justify-center" : "gap-3 px-3 py-2",
        )}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
      >
        {/* Active pill with glow */}
        {active && (
          <motion.div
            layoutId="sidebar-active-pill"
            className={cn(
              "absolute inset-0 rounded-lg bg-sidebar-active",
              "shadow-[inset_0_0_0_1px_var(--sidebar-accent)]",
            )}
            transition={SPRING.premium}
          />
        )}

        <span className="relative z-10 flex items-center justify-center">
          <Icon
            className={cn(
              "h-[18px] w-[18px] shrink-0 transition-colors duration-fast",
              active
                ? "text-primary"
                : "text-sidebar-muted group-hover:text-sidebar-text",
            )}
            aria-hidden="true"
          />
          {/* Badge for collapsed mode */}
          {collapsed && badge != null && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white shadow-sm animate-scale-in">
              {badge > 9 ? "+" : badge}
            </span>
          )}
        </span>

        {/* Label and badge for expanded mode */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: DURATION.micro }}
              className="relative z-10 flex min-w-0 flex-1 items-center justify-between overflow-hidden"
            >
              <span className="truncate">{label}</span>
              {badge != null && badge > 0 && (
                <span
                  className={cn(
                    "ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5",
                    "text-[10px] font-bold",
                    active
                      ? "bg-primary/15 text-primary"
                      : "bg-sidebar-hover text-sidebar-muted",
                  )}
                  aria-label={`${badge} notifications`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </a>
    </li>
  );
});
