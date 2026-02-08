"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  ClipboardCheck,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { PraedixaLogo } from "./praedixa-logo";

/* ────────────────────────────────────────────── */
/*  Types                                         */
/* ────────────────────────────────────────────── */

interface NavSubItem {
  label: string;
  href: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  children?: NavSubItem[];
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
}

/* ────────────────────────────────────────────── */
/*  Navigation config                             */
/* ────────────────────────────────────────────── */

const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Donnees",
    href: "/donnees",
    icon: Database,
    children: [
      { label: "Mes sites", href: "/donnees" },
      { label: "Fichiers importes", href: "/donnees/datasets" },
      { label: "Donnees consolidees", href: "/donnees/canonique" },
    ],
  },
  {
    label: "Anticipation",
    href: "/previsions",
    icon: TrendingUp,
    children: [
      { label: "Vue par site", href: "/previsions" },
      { label: "Toutes les alertes", href: "/previsions/alertes" },
    ],
  },
  {
    label: "Traitement",
    href: "/arbitrage",
    icon: Zap,
    children: [
      { label: "Alertes a traiter", href: "/arbitrage" },
      { label: "Decisions passees", href: "/arbitrage/historique" },
    ],
  },
  {
    label: "Suivi",
    href: "/decisions",
    icon: ClipboardCheck,
    children: [
      { label: "Journal des actions", href: "/decisions" },
      { label: "Qualite des decisions", href: "/decisions/stats" },
    ],
  },
  { label: "Rapports", href: "/rapports", icon: FileBarChart },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: "Reglages", href: "/parametres", icon: Settings, adminOnly: true },
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
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    () => {
      // Auto-expand section containing the current path
      const initial = new Set<string>();
      for (const item of NAV_ITEMS) {
        if (
          item.children?.some((child) => currentPath.startsWith(child.href))
        ) {
          initial.add(item.href);
        }
      }
      return initial;
    },
  );

  const toggleSection = (href: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  };

  const isActive = (href: string) => currentPath === href;
  const isActiveParent = (item: NavItem) =>
    item.children?.some((child) => currentPath.startsWith(child.href)) ??
    currentPath.startsWith(item.href);

  const filterByRole = (items: NavItem[]) =>
    items.filter((item) => !item.adminOnly || userRole === "admin");

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col border-r border-gray-200 bg-sidebar transition-[width] duration-200",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      {/* Logo */}
      <div className="flex h-topbar items-center border-b border-gray-200 px-5">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <PraedixaLogo size={32} className="shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="truncate font-serif text-lg font-semibold text-charcoal">
                Praedixa
              </span>
              <p className="truncate text-xs text-gray-400">
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
              isActive={isActive}
              isActiveParent={isActiveParent(item)}
              isExpanded={expandedSections.has(item.href)}
              onToggle={() => toggleSection(item.href)}
              currentPath={currentPath}
            />
          ))}
        </ul>
      </nav>

      {/* Separator + bottom items */}
      <div className="border-t border-gray-200 px-3 py-4">
        <ul className="space-y-1" role="list">
          {filterByRole(BOTTOM_ITEMS).map((item) => (
            <NavItemRow
              key={item.href}
              item={item}
              collapsed={collapsed}
              isActive={isActive}
              isActiveParent={isActiveParent(item)}
              isExpanded={false}
              /* v8 ignore next -- noop: bottom items have no children to toggle */
              onToggle={() => {}}
              currentPath={currentPath}
            />
          ))}
        </ul>
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="flex h-12 items-center justify-center border-t border-gray-200 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
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
  isActive: (href: string) => boolean;
  isActiveParent: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
}

function NavItemRow({
  item,
  collapsed,
  isActive: checkActive,
  isActiveParent,
  isExpanded,
  onToggle,
  currentPath,
}: NavItemRowProps) {
  const Icon = item.icon;
  const active = checkActive(item.href);
  const hasChildren = !!item.children?.length;
  const showChildren = hasChildren && isExpanded && !collapsed;

  return (
    <li>
      <a
        href={item.href}
        onClick={
          hasChildren
            ? (e) => {
                e.preventDefault();
                onToggle();
              }
            : undefined
        }
        className={cn(
          "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
          active || (isActiveParent && !hasChildren)
            ? "border-l-[3px] border-amber-500 bg-amber-50 pl-[9px] font-medium text-charcoal"
            : "text-gray-600 hover:bg-gray-50 hover:text-charcoal",
          collapsed && "justify-center px-0",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active || isActiveParent
              ? "text-amber-600"
              : "text-gray-400 group-hover:text-gray-600",
          )}
          aria-hidden="true"
        />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {hasChildren && (
              <ChevronDown
                className={cn(
                  "ml-auto h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                  isExpanded && "rotate-180",
                )}
                aria-hidden="true"
              />
            )}
          </>
        )}
      </a>

      {/* Sub-items */}
      {showChildren && (
        <ul
          className="ml-5 mt-1 space-y-0.5 border-l border-gray-200 pl-4"
          role="list"
        >
          {item.children!.map((child) => {
            const childActive = currentPath.startsWith(child.href);
            return (
              <li key={child.href}>
                <a
                  href={child.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition-colors",
                    childActive
                      ? "font-medium text-amber-700"
                      : "text-gray-500 hover:text-charcoal",
                  )}
                  aria-current={childActive ? "page" : undefined}
                >
                  {child.label}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
