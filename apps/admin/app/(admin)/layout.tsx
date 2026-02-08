"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@praedixa/ui";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/organisations": "Organisations",
  "/facturation": "Facturation",
  "/onboarding": "Onboarding",
  "/audit": "Journal d'audit",
  "/rgpd": "RGPD",
};

function getPageTitle(pathname: string): string | undefined {
  // Exact match first
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Match on prefix (e.g., /organisations/123 → "Organisations")
  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(`${prefix}/`)) return title;
  }
  return undefined;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Close mobile sidebar on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile overlay when switching to desktop
  React.useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const title = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay backdrop */}
      {mobileOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-charcoal/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={
          isDesktop
            ? "block"
            : mobileOpen
              ? "fixed inset-y-0 left-0 z-40"
              : "hidden"
        }
      >
        <AdminSidebar
          currentPath={pathname}
          collapsed={isDesktop ? collapsed : false}
          onToggleCollapse={
            isDesktop
              ? () => setCollapsed((prev) => !prev)
              : () => setMobileOpen(false)
          }
          userEmail="admin@praedixa.com"
        />
      </div>

      {/* Main content area */}
      <div
        className="flex min-w-0 flex-1 flex-col transition-[margin] duration-200"
        style={{
          marginLeft: isDesktop
            ? collapsed
              ? "var(--sidebar-collapsed-width)"
              : "var(--sidebar-width)"
            : "0",
        }}
      >
        <AdminTopbar
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
          title={title}
        />

        <main className="flex-1 bg-page p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
