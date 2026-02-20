"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  MessageSquare,
  FileBarChart,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Star,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "./praedixa-logo";
import { useI18n } from "@/lib/i18n/provider";

interface NavChildItem {
  id: string;
  href: string;
  labelKey: string;
  adminOnly?: boolean;
}

interface NavItem {
  id: string;
  href: string;
  icon: LucideIcon;
  group: "pilotage" | "donnees" | "anticipation" | "traitement" | "support";
  labelKey: string;
  accentClass: string;
  adminOnly?: boolean;
  children?: NavChildItem[];
}

type UserRole = "admin" | "manager" | "viewer";

interface SidebarProps {
  currentPath: string;
  userRole: UserRole;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  unreadCount?: number;
  priorityCount?: number;
  starredItems?: string[];
  recentItems?: string[];
  onToggleStar?: (itemId: string) => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "pilotage",
    labelKey: "sidebar.items.dashboard",
    accentClass: "sidebar-accent-dashboard",
  },
  {
    id: "donnees",
    href: "/donnees",
    icon: Database,
    group: "donnees",
    labelKey: "sidebar.items.donnees",
    accentClass: "sidebar-accent-data",
    children: [
      {
        id: "donnees-sites",
        href: "/donnees",
        labelKey: "sidebar.items.donneesSites",
      },
      {
        id: "donnees-datasets",
        href: "/donnees/datasets",
        labelKey: "sidebar.items.donneesDatasets",
        adminOnly: true,
      },
      {
        id: "donnees-canonique",
        href: "/donnees/canonique",
        labelKey: "sidebar.items.donneesCanonique",
      },
      {
        id: "donnees-gold",
        href: "/donnees/gold",
        labelKey: "sidebar.items.donneesGold",
      },
    ],
  },
  {
    id: "previsions",
    href: "/previsions",
    icon: TrendingUp,
    group: "anticipation",
    labelKey: "sidebar.items.previsions",
    accentClass: "sidebar-accent-forecast",
    children: [
      {
        id: "previsions-vue",
        href: "/previsions",
        labelKey: "sidebar.items.previsionsVue",
      },
      {
        id: "previsions-alertes",
        href: "/previsions/alertes",
        labelKey: "sidebar.items.previsionsAlertes",
      },
      {
        id: "previsions-modeles",
        href: "/previsions/modeles",
        labelKey: "sidebar.items.previsionsModeles",
      },
    ],
  },
  {
    id: "actions",
    href: "/actions",
    icon: Zap,
    group: "traitement",
    labelKey: "sidebar.items.actions",
    accentClass: "sidebar-accent-action",
    children: [
      {
        id: "actions-traitement",
        href: "/actions",
        labelKey: "sidebar.items.actionsTraitement",
      },
      {
        id: "actions-historique",
        href: "/actions/historique",
        labelKey: "sidebar.items.actionsHistorique",
      },
    ],
  },
  {
    id: "messages",
    href: "/messages",
    icon: MessageSquare,
    group: "support",
    labelKey: "sidebar.items.messages",
    accentClass: "sidebar-accent-support",
  },
  {
    id: "rapports",
    href: "/rapports",
    icon: FileBarChart,
    group: "support",
    labelKey: "sidebar.items.rapports",
    accentClass: "sidebar-accent-report",
  },
  {
    id: "onboarding",
    href: "/onboarding",
    icon: ClipboardList,
    group: "support",
    labelKey: "sidebar.items.onboarding",
    accentClass: "sidebar-accent-report",
  },
  {
    id: "parametres",
    href: "/parametres",
    icon: Settings,
    group: "support",
    labelKey: "sidebar.items.parametres",
    accentClass: "sidebar-accent-settings",
    adminOnly: true,
  },
];

const GROUP_ORDER: Array<NavItem["group"]> = [
  "pilotage",
  "donnees",
  "anticipation",
  "traitement",
  "support",
];

interface FlatNavItem {
  id: string;
  href: string;
  label: string;
}

function useFlatItemMap(t: (key: string) => string, userRole: UserRole) {
  return React.useMemo(() => {
    const map = new Map<string, FlatNavItem>();

    for (const item of NAV_ITEMS) {
      if (item.adminOnly && userRole !== "admin") continue;
      map.set(item.id, {
        id: item.id,
        href: item.href,
        label: t(item.labelKey),
      });

      for (const child of item.children ?? []) {
        if (child.adminOnly && userRole !== "admin") continue;
        map.set(child.id, {
          id: child.id,
          href: child.href,
          label: t(child.labelKey),
        });
      }
    }

    return map;
  }, [t, userRole]);
}

export function Sidebar({
  currentPath,
  userRole,
  collapsed = false,
  onToggleCollapse,
  unreadCount = 0,
  priorityCount = 0,
  starredItems = [],
  recentItems = [],
  onToggleStar,
}: SidebarProps) {
  const { t } = useI18n();
  const flatItemMap = useFlatItemMap(t, userRole);

  const isActive = React.useCallback(
    (href: string) =>
      currentPath === href || currentPath.startsWith(`${href}/`),
    [currentPath],
  );

  const visibleItems = React.useMemo(
    () => NAV_ITEMS.filter((item) => !item.adminOnly || userRole === "admin"),
    [userRole],
  );

  const favoriteItems = React.useMemo(
    () =>
      starredItems
        .map((id) => flatItemMap.get(id))
        .filter(Boolean) as FlatNavItem[],
    [flatItemMap, starredItems],
  );

  const recentNavItems = React.useMemo(
    () =>
      recentItems
        .map((id) => flatItemMap.get(id))
        .filter(Boolean) as FlatNavItem[],
    [flatItemMap, recentItems],
  );

  const renderQuickList = (
    title: string,
    icon: React.ReactNode,
    entries: FlatNavItem[],
  ) => {
    if (collapsed || entries.length === 0) return null;

    return (
      <section className="space-y-1.5" aria-label={title}>
        <p className="px-3 text-overline text-sidebar-muted">
          <span className="inline-flex items-center gap-1.5">
            {icon}
            {title}
          </span>
        </p>
        <ul className="space-y-0.5" role="list">
          {entries.map((entry) => {
            const active = isActive(entry.href);
            return (
              <li key={entry.id}>
                <Link
                  href={entry.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-2 text-caption transition-colors duration-fast",
                    active
                      ? "bg-sidebar-active text-sidebar-text"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                  )}
                >
                  <span className="truncate">{entry.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar",
        "transition-[width] duration-normal ease-snappy",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-primary via-primary/65 to-transparent" />

      <div
        className={cn(
          "flex h-topbar items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-5",
        )}
      >
        <Link
          href="/dashboard"
          className="group flex min-h-[44px] items-center gap-3 overflow-hidden"
          aria-label="Praedixa"
        >
          <PraedixaLogo
            size={26}
            className="shrink-0 text-primary transition-transform duration-fast group-hover:scale-110"
          />
          {!collapsed && (
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text">
                Praedixa
              </span>
              <span className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-muted">
                Client Workspace
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        aria-label="Navigation principale"
      >
        {GROUP_ORDER.map((group) => {
          const items = visibleItems.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <section key={group} className="space-y-1.5">
              {!collapsed && (
                <p className="px-3 text-overline text-sidebar-muted">
                  {t(`sidebar.groups.${group}`)}
                </p>
              )}
              <ul className="space-y-0.5" role="list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const isStarred = starredItems.includes(item.id);

                  return (
                    <li key={item.id}>
                      <div className="space-y-1">
                        <div className="group relative">
                          <span
                            aria-hidden="true"
                            className={cn(
                              "pointer-events-none absolute inset-y-1 left-1 w-1 rounded-full opacity-0 transition-opacity duration-fast",
                              item.accentClass,
                              active && "opacity-100",
                            )}
                          />
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex min-h-[44px] items-center rounded-lg px-3 py-2 text-body-sm transition-colors duration-fast",
                              collapsed ? "justify-center" : "gap-2.5",
                              active
                                ? "bg-sidebar-active text-sidebar-text"
                                : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                            )}
                          >
                            <Icon
                              className="h-4.5 w-4.5 shrink-0"
                              aria-hidden="true"
                            />
                            {!collapsed && (
                              <>
                                <span className="min-w-0 flex-1 truncate">
                                  {t(item.labelKey)}
                                </span>
                                {item.id === "messages" && unreadCount > 0 && (
                                  <span
                                    aria-label={`${unreadCount} notifications`}
                                    className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
                                  >
                                    {unreadCount}
                                  </span>
                                )}
                                {item.id === "actions" && priorityCount > 0 && (
                                  <span
                                    aria-label={`${priorityCount} notifications`}
                                    className="rounded-full bg-danger-light px-2 py-0.5 text-[10px] font-semibold text-danger-text"
                                  >
                                    {priorityCount}
                                  </span>
                                )}
                              </>
                            )}
                          </Link>

                          {!collapsed && onToggleStar && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                onToggleStar(item.id);
                              }}
                              aria-label={
                                isStarred
                                  ? t("sidebar.actions.unstar")
                                  : t("sidebar.actions.star")
                              }
                              className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity duration-fast",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                isStarred
                                  ? "opacity-100 text-primary"
                                  : "opacity-0 text-sidebar-muted group-hover:opacity-100 hover:text-sidebar-text",
                              )}
                            >
                              <Star
                                className={cn(
                                  "h-3.5 w-3.5",
                                  isStarred && "fill-current",
                                )}
                              />
                            </button>
                          )}
                        </div>

                        {!collapsed && (item.children?.length ?? 0) > 0 && (
                          <ul className="space-y-0.5 pl-10" role="list">
                            {(item.children ?? []).map((child) => {
                              if (child.adminOnly && userRole !== "admin") {
                                return null;
                              }
                              const childActive = isActive(child.href);
                              return (
                                <li key={child.id}>
                                  <Link
                                    href={child.href}
                                    aria-current={
                                      childActive ? "page" : undefined
                                    }
                                    className={cn(
                                      "block rounded-md px-2 py-1.5 text-caption transition-colors duration-fast",
                                      childActive
                                        ? "bg-sidebar-active/80 text-sidebar-text"
                                        : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                                    )}
                                  >
                                    {t(child.labelKey)}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        <div className="gradient-divider my-2" aria-hidden="true" />

        {renderQuickList(
          t("sidebar.sections.starred"),
          <Star className="h-3 w-3" aria-hidden="true" />,
          favoriteItems,
        )}

        {renderQuickList(
          t("sidebar.sections.recent"),
          <Clock3 className="h-3 w-3" aria-hidden="true" />,
          recentNavItems,
        )}
      </nav>

      {onToggleCollapse && (
        <div className="mt-auto border-t border-sidebar-border p-3">
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex min-h-[40px] items-center justify-center rounded-lg text-sidebar-muted",
              "transition-all duration-fast hover:bg-sidebar-hover hover:text-sidebar-text",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              collapsed ? "mx-auto h-9 w-9" : "h-9 w-full gap-2",
            )}
            aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
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
      )}
    </aside>
  );
}
