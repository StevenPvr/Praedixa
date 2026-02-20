"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@praedixa/ui";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { useCurrentUser } from "@/lib/auth/client";

const PAGE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/clients": "Clients",
  "/demandes-contact": "Demandes contact",
  "/journal": "Journal",
  "/parametres": "Parametres",
};

function getPageTitle(pathname: string): string | undefined {
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname];
  }

  for (const [prefix, title] of Object.entries(PAGE_TITLES)) {
    if (prefix !== "/" && pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  return undefined;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const title = getPageTitle(pathname);

  return (
    <div className="flex min-h-screen">
      {mobileOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-charcoal/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

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
          userEmail={currentUser?.email ?? ""}
        />
      </div>

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
