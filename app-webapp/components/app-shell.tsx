"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useMediaQuery } from "@praedixa/ui";
import { SidebarWithUnread } from "@/components/sidebar-with-unread";
import { ToastProvider } from "@/components/toast-provider";
import { useCurrentUser } from "@/lib/auth/client";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";

function toSidebarRole(
  role: string | undefined,
): "admin" | "manager" | "viewer" {
  if (role === "org_admin" || role === "super_admin" || role === "admin") {
    return "admin";
  }
  if (role === "manager") {
    return "manager";
  }
  return "viewer";
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const { locale, setLocale, t } = useI18n();
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

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {mobileOpen && !isDesktop && (
          <div
            className="fixed inset-0 z-30 bg-charcoal/50 backdrop-blur-sm lg:hidden"
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
          <SidebarWithUnread
            currentPath={pathname}
            userRole={toSidebarRole(currentUser?.role)}
            collapsed={isDesktop ? collapsed : false}
            onToggleCollapse={
              isDesktop
                ? () => setCollapsed((prev) => !prev)
                : () => setMobileOpen(false)
            }
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
          <header className="sticky top-0 z-20 flex h-topbar items-center justify-between shadow-topbar bg-card px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  isDesktop
                    ? setCollapsed((prev) => !prev)
                    : setMobileOpen((prev) => !prev)
                }
                className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 lg:hidden"
                aria-label={
                  mobileOpen ? t("appShell.closeMenu") : t("appShell.openMenu")
                }
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <span className="text-sm font-medium text-gray-500">
                {t("appShell.organization")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="app-language" className="sr-only">
                {t("appShell.languageLabel")}
              </label>
              <select
                id="app-language"
                value={locale}
                onChange={(event) =>
                  setLocale(event.target.value === "en" ? "en" : "fr")
                }
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600"
              >
                <option value="fr">FR</option>
                <option value="en">EN</option>
              </select>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
                U
              </div>
            </div>
          </header>

          <main className="flex-1 bg-gradient-ambient p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShellContent>{children}</AppShellContent>
    </I18nProvider>
  );
}
