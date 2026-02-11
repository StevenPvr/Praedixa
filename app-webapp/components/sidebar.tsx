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

const ITEM_ACCENTS: Record<
  string,
  {
    activeBg: string;
    activeIcon: string;
    rail: string;
  }
> = {
  dashboard: {
    activeBg: "bg-amber-500/18",
    activeIcon: "text-amber-200",
    rail: "bg-amber-400",
  },
  donnees: {
    activeBg: "bg-blue-500/18",
    activeIcon: "text-blue-200",
    rail: "bg-blue-400",
  },
  previsions: {
    activeBg: "bg-violet-500/18",
    activeIcon: "text-violet-200",
    rail: "bg-violet-400",
  },
  actions: {
    activeBg: "bg-amber-500/22",
    activeIcon: "text-amber-100",
    rail: "bg-amber-300",
  },
  messages: {
    activeBg: "bg-emerald-500/18",
    activeIcon: "text-emerald-200",
    rail: "bg-emerald-400",
  },
  rapports: {
    activeBg: "bg-slate-400/20",
    activeIcon: "text-slate-100",
    rail: "bg-slate-200",
  },
  parametres: {
    activeBg: "bg-neutral-300/20",
    activeIcon: "text-neutral-100",
    rail: "bg-neutral-200",
  },
};

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

  const groups: Array<NavItem["group"]> = [
    "voir",
    "anticiper",
    "decider",
    "suivre",
    "gouvernance",
  ];

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-white/10 bg-sidebar text-sidebar-text transition-[width] duration-normal ease-out shadow-sidebar",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div
        className={cn(
          "relative flex h-topbar items-center border-b border-white/10",
          collapsed ? "justify-center" : "px-6",
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <PraedixaLogo
            size={32}
            className="shrink-0 text-white"
            color="white"
          />
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <span className="truncate font-heading text-xl font-medium tracking-tight text-white">
                Praedixa
              </span>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 py-5 animate-slide-up">
          <a
            href="/actions"
            className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/12 to-white/5 p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_40%)]" />
            <div className="relative z-10">
              <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">
                {t("sidebar.title")}
              </p>
              <p className="mb-3 text-xs leading-relaxed text-sidebar-text/85">
                {t("sidebar.subtitle")}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/95 group-hover:text-white">
                  {t("sidebar.cta")} &rarr;
                </span>
                {priorityCount > 0 && (
                  <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-danger px-2 text-[10px] font-bold text-white ring-2 ring-sidebar">
                    {priorityCount > 99 ? "99+" : priorityCount}
                  </span>
                )}
              </div>
            </div>
          </a>
        </div>
      )}

      <nav
        className="flex-1 space-y-6 overflow-y-auto px-4 py-2"
        aria-label="Navigation principale"
      >
        {groups.map((group) => {
          const items = visibleItems.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <div key={group}>
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted/80">
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

      {onToggleCollapse && (
        <div className="mt-auto p-4">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex items-center justify-center rounded-lg text-sidebar-muted transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
              collapsed ? "mx-auto h-10 w-10" : "h-10 w-full",
            )}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <ChevronLeft className="h-4 w-4" />
                <span>{t("sidebar.collapse")}</span>
              </div>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}

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
  const accent = ITEM_ACCENTS[item.id] ?? ITEM_ACCENTS.dashboard;

  return (
    <li>
      <a
        href={item.href}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
          active
            ? `${accent.activeBg} text-white font-medium ring-1 ring-white/10`
            : "text-sidebar-muted hover:bg-white/10 hover:text-white",
          collapsed && "mx-auto h-10 w-10 justify-center px-0",
        )}
        aria-current={active ? "page" : undefined}
      >
        {active && !collapsed && (
          <div
            className={cn(
              "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full",
              accent.rail,
            )}
          />
        )}

        <span className="relative flex items-center justify-center">
          <Icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              active
                ? accent.activeIcon
                : "text-sidebar-muted group-hover:text-white",
            )}
            aria-hidden="true"
          />
          {collapsed && badge != null && badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-sidebar">
              {badge > 9 ? "\u22c5" : badge}
            </span>
          )}
        </span>

        {!collapsed && (
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <span className="truncate">{label}</span>
            {badge != null && badge > 0 && (
              <span
                className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-xs font-bold text-white"
                aria-label={`${badge} messages non lus`}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
        )}
      </a>
    </li>
  );
}
