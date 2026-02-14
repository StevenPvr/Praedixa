"use client";

import * as React from "react";
import Link from "next/link";
import {
  Home,
  Building2,
  BookOpen,
  Settings,
  LogOut,
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
}

interface AdminSidebarProps {
  currentPath: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userEmail?: string;
  onLogout?: () => void;
}

/* ────────────────────────────────────────────── */
/*  Navigation config                             */
/* ────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/", icon: Home },
  { label: "Clients", href: "/clients", icon: Building2 },
  { label: "Journal", href: "/journal", icon: BookOpen },
  { label: "Parametres", href: "/parametres", icon: Settings },
];

/* ────────────────────────────────────────────── */
/*  Component                                     */
/* ────────────────────────────────────────────── */

export function AdminSidebar({
  currentPath,
  collapsed = false,
  onToggleCollapse,
  userEmail,
  onLogout,
}: AdminSidebarProps) {
  const isActive = (href: string) =>
    href === "/"
      ? currentPath === "/"
      : currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <aside
      data-sidebar
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-sidebar shadow-sidebar transition-[width] duration-200",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      {/* Logo + Admin badge */}
      <div className="flex h-topbar items-center border-b border-sidebar-border px-5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <PraedixaLogo
            size={32}
            color="oklch(0.85 0.01 250)"
            className="shrink-0"
          />
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="truncate font-serif text-lg font-semibold text-sidebar-text">
                Praedixa
              </span>
              <span className="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal">
                Admin
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Navigation admin"
      >
        <ul className="space-y-1" role="list">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "border-l-[3px] border-amber-500 bg-sidebar-active pl-[9px] font-medium text-amber-400"
                      : "text-sidebar-text-muted hover:bg-sidebar-hover hover:text-sidebar-text",
                    collapsed && "justify-center px-0",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active
                        ? "text-amber-400"
                        : "text-sidebar-text-muted group-hover:text-sidebar-text",
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + logout */}
      {userEmail && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <div
            className={cn(
              "flex items-center gap-3",
              collapsed && "justify-center",
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-charcoal">
              {userEmail.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-text">
                  {userEmail}
                </p>
                <p className="text-[10px] text-sidebar-text-muted">
                  Super Admin
                </p>
              </div>
            )}
            {!collapsed && onLogout && (
              <button
                onClick={onLogout}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
                aria-label="Se deconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-t border-sidebar-border text-sidebar-text-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-text"
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
