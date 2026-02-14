"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, X, Search, Bell, ChevronRight } from "lucide-react";
import { useMediaQuery } from "@praedixa/ui";
import { SidebarWithUnread } from "@/components/sidebar-with-unread";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/command-palette";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { useCurrentUser } from "@/lib/auth/client";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { cn } from "@praedixa/ui";

/* ── Helpers ── */

function toSidebarRole(
  role: string | undefined,
): "admin" | "manager" | "viewer" {
  if (role === "org_admin" || role === "super_admin" || role === "admin")
    return "admin";
  if (role === "manager") return "manager";
  return "viewer";
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const map: Record<string, BreadcrumbItem[]> = {
    "/dashboard": [{ label: "Centre de pilotage" }],
    "/donnees": [{ label: "Referentiel operationnel" }],
    "/previsions": [{ label: "Anticipation" }],
    "/actions": [{ label: "Centre de traitement" }],
    "/messages": [{ label: "Support" }],
    "/rapports": [{ label: "Rapports" }],
    "/parametres": [{ label: "Reglages" }],
  };

  for (const [key, crumbs] of Object.entries(map)) {
    if (pathname.startsWith(key)) return crumbs;
  }
  return [{ label: "Praedixa" }];
}

function formatHeaderDate(locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}

/* ── Content ── */

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const { locale, setLocale, t } = useI18n();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const searchTriggerRef = React.useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentDate = formatHeaderDate(locale);
  const userInitial = currentUser?.email?.charAt(0).toUpperCase() ?? "U";

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <ToastProvider>
      <RouteProgressBar />
      <CommandPalette
        open={cmdOpen}
        onClose={() => {
          searchTriggerRef.current?.focus();
          setCmdOpen(false);
        }}
      />

      <div className="flex min-h-screen bg-page font-sans tracking-tight">
        {/* Mobile overlay */}
        {mobileOpen && !isDesktop && (
          <div
            className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-lg lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            data-testid="mobile-sidebar-overlay"
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

        {/* Main area */}
        <div
          className="flex min-w-0 flex-1 flex-col transition-[margin] duration-normal ease-snappy"
          style={{
            marginLeft: isDesktop
              ? collapsed
                ? "var(--sidebar-collapsed-width)"
                : "var(--sidebar-width)"
              : "0",
          }}
        >
          {/* Header */}
          <header
            className={cn(
              "sticky top-0 z-20 flex h-topbar items-center justify-between px-page-x transition-all duration-fast",
              scrolled
                ? "glass-header shadow-[var(--shadow-raised)]"
                : "bg-transparent border-b border-transparent",
            )}
          >
            {/* Left: mobile menu + breadcrumbs */}
            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  isDesktop
                    ? setCollapsed((prev) => !prev)
                    : setMobileOpen((prev) => !prev)
                }
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-ink-tertiary transition-colors duration-fast",
                  "hover:bg-surface-interactive hover:text-ink",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "lg:hidden",
                )}
                aria-label={
                  mobileOpen ? t("appShell.closeMenu") : t("appShell.openMenu")
                }
              >
                {mobileOpen ? (
                  <X className="h-4.5 w-4.5" />
                ) : (
                  <Menu className="h-4.5 w-4.5" />
                )}
              </button>

              {/* Breadcrumbs */}
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5"
              >
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <ChevronRight
                        className="h-3 w-3 text-ink-placeholder"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={cn(
                        "text-sm font-semibold tracking-[-0.01em]",
                        i === breadcrumbs.length - 1
                          ? "text-ink"
                          : "text-ink-tertiary",
                      )}
                    >
                      {crumb.label}
                    </span>
                  </React.Fragment>
                ))}
                <span className="ml-2 hidden text-caption text-ink-tertiary sm:inline">
                  {currentDate}
                </span>
              </nav>
            </div>

            {/* Right: search + actions */}
            <div className="flex items-center gap-2">
              {/* Search trigger */}
              <button
                ref={searchTriggerRef}
                onClick={() => setCmdOpen(true)}
                className={cn(
                  "hidden items-center gap-2 rounded-lg px-3 py-1.5",
                  "border border-border bg-surface-interactive/50",
                  "text-caption text-ink-placeholder",
                  "transition-all duration-fast",
                  "hover:border-border-hover hover:bg-surface-interactive hover:text-ink-tertiary",
                  "sm:flex",
                )}
              >
                <Search className="h-3.5 w-3.5" />
                <span>{t("commandPalette.placeholder").split(",")[0]}…</span>
                <kbd className="rounded-[var(--radius-xs)] border border-border bg-card px-1.5 py-px font-mono text-[10px] font-semibold">
                  ⌘K
                </kbd>
              </button>

              {/* Notifications */}
              <button
                className={cn(
                  "relative flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-ink-tertiary transition-colors duration-fast",
                  "hover:bg-surface-interactive hover:text-ink",
                )}
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>

              <ThemeToggle />

              {/* Language */}
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
                  className={cn(
                    "cursor-pointer appearance-none rounded-lg border border-border",
                    "bg-surface py-1.5 pl-2.5 pr-7",
                    "text-xs font-semibold text-ink outline-none",
                    "transition-all duration-fast",
                    "hover:border-border-hover hover:bg-surface-interactive",
                    "focus:border-primary focus:ring-2 focus:ring-primary/20",
                  )}
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-ink-tertiary">
                  <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>

              <div className="mx-0.5 h-5 w-px bg-border" />

              {/* User avatar */}
              <button
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  "bg-gradient-to-br from-primary to-primary-dark",
                  "text-xs font-bold text-white",
                  "shadow-sm transition-all duration-fast",
                  "hover:shadow-[var(--shadow-premium-glow)] hover:brightness-110",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                )}
                aria-label="Profil"
              >
                {userInitial}
              </button>
            </div>
          </header>

          {/* Main content */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 px-page-x py-page-y"
          >
            <div className="mx-auto max-w-page">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

/* ── Export ── */

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShellContent>{children}</AppShellContent>
    </I18nProvider>
  );
}
