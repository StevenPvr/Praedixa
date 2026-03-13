"use client";

import Link from "next/link";
import {
  SquaresFour,
  TrendUp,
  Lightning,
  ChatCircle,
  Gear,
  X,
} from "@phosphor-icons/react";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "./praedixa-logo";
import { useI18n } from "@/lib/i18n/provider";

interface NavItem {
  id: string;
  href: string;
  icon: PhosphorIcon;
  labelKey: string;
}

interface SidebarProps {
  currentPath: string;
  userRole: "admin" | "manager" | "viewer";
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  unreadCount?: number;
  priorityCount?: number;
  siteOptions?: Array<{ id: string; label: string }>;
  selectedSiteId?: string | null;
  selectedSiteLabel?: string;
  siteFallbackLabel?: string;
  onSiteChange?: (siteId: string | null) => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: SquaresFour,
    labelKey: "sidebar.items.dashboard",
  },
  {
    id: "previsions",
    href: "/previsions",
    icon: TrendUp,
    labelKey: "sidebar.items.previsions",
  },
  {
    id: "actions",
    href: "/actions",
    icon: Lightning,
    labelKey: "sidebar.items.actions",
  },
  {
    id: "messages",
    href: "/messages",
    icon: ChatCircle,
    labelKey: "sidebar.items.messages",
  },
  {
    id: "parametres",
    href: "/parametres",
    icon: Gear,
    labelKey: "sidebar.items.parametres",
  },
];

export function Sidebar({
  currentPath,
  collapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const { t } = useI18n();

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-sidebar flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-xl",
        collapsed && "w-sidebar",
      )}
    >
      <div className="flex h-topbar items-center justify-between border-b border-sidebar-border/80 px-5">
        <Link
          href="/dashboard"
          className="group flex min-h-[44px] items-center gap-3 overflow-hidden"
          aria-label="Praedixa"
        >
          <PraedixaLogo
            size={26}
            className="shrink-0 text-primary transition-transform duration-fast group-hover:scale-110"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text">
              Praedixa
            </span>
          </div>
        </Link>
        {onToggleCollapse && (
          <button
            type="button"
            aria-label={t("appShell.closeMenu")}
            onClick={onToggleCollapse}
            className="rounded-lg p-1 text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text lg:hidden"
          >
            <X className="h-4 w-4" weight="bold" />
          </button>
        )}
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-5"
        aria-label="Navigation principale"
      >
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm transition-[background-color,color,transform] duration-fast",
                    active
                      ? "bg-sidebar-active text-sidebar-text"
                      : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0 transition-colors duration-fast",
                      active ? "text-primary" : "text-sidebar-muted",
                    )}
                    aria-hidden="true"
                    weight="regular"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {t(item.labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
