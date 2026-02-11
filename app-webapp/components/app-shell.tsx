"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
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

function getSectionLabel(pathname: string): string {
  if (pathname.startsWith("/dashboard")) return "War room";
  if (pathname.startsWith("/donnees")) return "Donnees";
  if (pathname.startsWith("/previsions")) return "Anticipation";
  if (pathname.startsWith("/actions")) return "Traitement";
  if (pathname.startsWith("/messages")) return "Support";
  if (pathname.startsWith("/rapports")) return "Rapports";
  if (pathname.startsWith("/parametres")) return "Reglages";
  return "Praedixa";
}

function formatHeaderDate(locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const { locale, setLocale, t } = useI18n();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const sectionLabel = getSectionLabel(pathname);
  const currentDate = formatHeaderDate(locale);
  const userInitial = currentUser?.email?.charAt(0).toUpperCase() ?? "U";

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
      <div className="flex min-h-screen premium-shell-bg">
        {mobileOpen && !isDesktop && (
          <div
            className="fixed inset-0 z-30 bg-ink/45 backdrop-blur-sm lg:hidden"
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
          className="flex min-w-0 flex-1 flex-col transition-[margin] duration-normal ease-out"
          style={{
            marginLeft: isDesktop
              ? collapsed
                ? "var(--sidebar-collapsed-width)"
                : "var(--sidebar-width)"
              : "0",
          }}
        >
          <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-black/5 bg-page/85 px-6 backdrop-blur-md sm:px-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  isDesktop
                    ? setCollapsed((prev) => !prev)
                    : setMobileOpen((prev) => !prev)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
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

              <div className="space-y-0.5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-tertiary">
                  {t("appShell.organization")}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">
                    {sectionLabel}
                  </span>
                  <span className="hidden text-xs text-ink-tertiary sm:inline">
                    {currentDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 md:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-500" />
                {t("appShell.statusLive")}
              </span>
              <span className="hidden items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 lg:inline-flex">
                <Sparkles className="h-3.5 w-3.5" />
                {t("appShell.statusReview")}
              </span>

              <label htmlFor="app-language" className="sr-only">
                {t("appShell.languageLabel")}
              </label>
              <div className="relative">
                <select
                  id="app-language"
                  value={locale}
                  onChange={(event) =>
                    setLocale(event.target.value === "en" ? "en" : "fr")
                  }
                  className="cursor-pointer appearance-none rounded-xl border border-black/10 bg-white/[0.85] py-1.5 pl-3 pr-8 text-xs font-medium text-ink outline-none transition-all hover:border-black/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-ink-tertiary">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <div className="h-8 w-px bg-black/10" />

              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-dark text-sm font-semibold text-white shadow-sm ring-2 ring-white/80 transition-all hover:ring-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                aria-label="Profil"
              >
                {userInitial}
              </button>
            </div>
          </header>

          <main id="main-content" tabIndex={-1} className="flex-1 p-6 sm:p-8">
            <div className="mx-auto max-w-[1440px] animate-fade-in">
              {children}
            </div>
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
