"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ToastProvider } from "@/components/toast-provider";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "@praedixa/ui";
import { useApiGet } from "@/hooks/use-api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { data: unreadData } = useApiGet<{ unreadCount: number }>(
    "/api/v1/conversations/unread-count",
  );

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

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Mobile overlay backdrop */}
        {mobileOpen && !isDesktop && (
          <div
            className="fixed inset-0 z-30 bg-charcoal/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar — hidden on mobile unless mobileOpen, always visible on desktop */}
        <div
          className={
            isDesktop
              ? "block"
              : mobileOpen
                ? "fixed inset-y-0 left-0 z-40"
                : "hidden"
          }
        >
          <Sidebar
            currentPath={pathname}
            userRole="admin"
            collapsed={isDesktop ? collapsed : false}
            onToggleCollapse={
              isDesktop
                ? () => setCollapsed((prev) => !prev)
                : () => setMobileOpen(false)
            }
            unreadCount={unreadData?.unreadCount ?? 0}
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
          {/* Top bar */}
          <header className="sticky top-0 z-20 flex h-topbar items-center justify-between shadow-topbar bg-card px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  isDesktop
                    ? setCollapsed((prev) => !prev)
                    : setMobileOpen((prev) => !prev)
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 lg:hidden"
                aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <span className="text-sm font-medium text-gray-500">
                Organisation
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                U
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 bg-gradient-ambient p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
