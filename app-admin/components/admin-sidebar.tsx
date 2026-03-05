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

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  group: "pilotage" | "operations" | "gouvernance";
}

interface AdminSidebarProps {
  currentPath: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "home",
    label: "Accueil",
    href: "/",
    icon: Home,
    group: "pilotage",
  },
  {
    id: "clients",
    label: "Clients",
    href: "/clients",
    icon: Building2,
    group: "operations",
  },
  {
    id: "contact",
    label: "Demandes contact",
    href: "/demandes-contact",
    icon: Mail,
    group: "operations",
  },
  {
    id: "journal",
    label: "Journal",
    href: "/journal",
    icon: BookOpen,
    group: "gouvernance",
  },
  {
    id: "settings",
    label: "Parametres",
    href: "/parametres",
    icon: Settings,
    group: "gouvernance",
  },
];

const GROUP_LABELS: Record<NavItem["group"], string> = {
  pilotage: "Pilotage",
  operations: "Operations",
  gouvernance: "Gouvernance",
};

const GROUP_ORDER: Array<NavItem["group"]> = [
  "pilotage",
  "operations",
  "gouvernance",
];

export function AdminSidebar({
  currentPath,
  collapsed = false,
  onToggleCollapse,
  userEmail,
  onLogout,
}: AdminSidebarProps) {
  const isActive = React.useCallback(
    (href: string) =>
      href === "/"
        ? currentPath === "/"
        : currentPath === href || currentPath.startsWith(`${href}/`),
    [currentPath],
  );

  return (
    <aside
      data-sidebar
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-normal ease-snappy",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      <div
        className={cn(
          "flex h-topbar items-center border-b border-sidebar-border",
          collapsed ? "justify-center" : "px-5",
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
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text">
                Praedixa
              </span>
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-text">
                Admin
              </span>
            </div>
          )}
        </Link>
      </div>

      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        aria-label="Navigation admin"
      >
        {GROUP_ORDER.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          if (items.length === 0) return null;

          return (
            <section key={group} className="space-y-1.5">
              {!collapsed && (
                <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-text-muted">
                  {GROUP_LABELS[group]}
                </p>
              )}
              <ul className="space-y-0.5" role="list">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

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
                            collapsed ? "justify-center" : "gap-2.5",
                            active
                              ? "bg-sidebar-active text-sidebar-text"
                              : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                          {!collapsed && (
                            <span className="min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                          )}
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-sidebar-border p-3">
        {!collapsed && (
          <div className="mb-3 rounded-lg border border-sidebar-border bg-sidebar-hover px-3 py-2">
            {userEmail ? (
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
                {onLogout ? (
                  <button
                    onClick={onLogout}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
                    aria-label="Se deconnecter"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className={cn(
              "flex min-h-[40px] items-center justify-center rounded-lg text-sidebar-text-muted",
              "transition-colors duration-fast hover:bg-sidebar-hover hover:text-sidebar-text",
              collapsed ? "mx-auto h-9 w-9" : "h-9 w-full gap-2",
            )}
            aria-label={collapsed ? "Agrandir le menu" : "Reduire le menu"}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Reduire</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
}
