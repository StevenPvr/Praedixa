"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  LayoutDashboard,
  Settings,
  MessageSquare,
  LogOut,
} from "lucide-react";
import type { Site } from "@praedixa/shared-types";
import { useMediaQuery } from "@praedixa/ui";
import { SidebarWithUnread } from "@/components/sidebar-with-unread";
import { ToastProvider } from "@/components/toast-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/command-palette";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { clearAuthSession, useCurrentUser } from "@/lib/auth/client";
import { canAccessSettings, toSidebarRole } from "@/lib/auth/roles";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { useUxPreferences } from "@/hooks/use-ux-preferences";
import { useApiGet } from "@/hooks/use-api";
import {
  SiteScopeProvider,
  type SiteScopeContextValue,
} from "@/lib/site-scope";
import { cn } from "@praedixa/ui";

const SITE_SCOPE_STORAGE_KEY = "praedixa_site_scope";

interface BreadcrumbItem {
  label: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const map: Record<string, BreadcrumbItem[]> = {
    "/dashboard": [{ label: "Tableau de bord" }],
    "/donnees": [{ label: "Donnees operationnelles" }],
    "/previsions": [{ label: "Anticipation" }],
    "/actions": [{ label: "Traitement" }],
    "/messages": [{ label: "Support" }],
    "/rapports": [{ label: "Rapports" }],
    "/onboarding": [{ label: "Onboarding" }],
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

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { locale, setLocale, t } = useI18n();
  const {
    preferences,
    loaded,
    setSidebarCollapsed,
    setSidebarWidth,
    setThemeMode,
  } = useUxPreferences();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const searchTriggerRef = React.useRef<HTMLButtonElement>(null);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { setTheme } = useTheme();

  const { data: sites } = useApiGet<Site[]>("/api/v1/sites");
  const safeSites = React.useMemo(
    () => (Array.isArray(sites) ? sites : []),
    [sites],
  );

  const [selectedGlobalSiteId, setSelectedGlobalSiteId] = React.useState<
    string | null
  >(null);

  const collapsed = isDesktop ? preferences.nav.sidebarCollapsed : false;
  const sidebarWidth = collapsed
    ? 72
    : Math.max(236, Math.min(360, preferences.nav.sidebarWidth));

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentDate = formatHeaderDate(locale);
  const userInitial = currentUser?.email?.charAt(0).toUpperCase() ?? "U";
  const canManageSettings = canAccessSettings(currentUser?.role);
  const isManagerRole =
    currentUser?.role === "manager" || currentUser?.role === "hr_manager";
  const isAdminRole = canAccessSettings(currentUser?.role);

  const siteOptions = React.useMemo(
    () =>
      safeSites.map((site) => ({
        id: site.id,
        label: site.code ? `${site.name} (${site.code})` : site.name,
      })),
    [safeSites],
  );

  const selectedSiteId = isManagerRole
    ? (currentUser?.siteId ?? null)
    : selectedGlobalSiteId;

  React.useEffect(() => {
    if (!isAdminRole || isManagerRole) return;
    if (typeof window === "undefined") return;
    if (typeof window.localStorage?.getItem !== "function") return;

    const saved = window.localStorage.getItem(SITE_SCOPE_STORAGE_KEY);
    if (!saved || saved === "__ALL__") {
      setSelectedGlobalSiteId(null);
      return;
    }
    const exists = siteOptions.some((site) => site.id === saved);
    setSelectedGlobalSiteId(exists ? saved : null);
  }, [isAdminRole, isManagerRole, siteOptions]);

  React.useEffect(() => {
    if (isManagerRole) {
      setSelectedGlobalSiteId(currentUser?.siteId ?? null);
      return;
    }
    if (!isAdminRole) {
      setSelectedGlobalSiteId(null);
      return;
    }
    if (typeof window === "undefined") return;
    if (typeof window.localStorage?.setItem !== "function") return;
    window.localStorage.setItem(
      SITE_SCOPE_STORAGE_KEY,
      selectedGlobalSiteId ?? "__ALL__",
    );
  }, [currentUser?.siteId, isAdminRole, isManagerRole, selectedGlobalSiteId]);

  const appendSiteParam = React.useCallback(
    (url: string) => {
      const [path, query = ""] = url.split("?");
      const params = new URLSearchParams(query);
      const existingSite = params.get("site_id");
      if (selectedSiteId) {
        if (isManagerRole || !existingSite) {
          params.set("site_id", selectedSiteId);
        }
      } else if (!existingSite) {
        params.delete("site_id");
      }
      const qs = params.toString();
      return qs ? `${path}?${qs}` : path;
    },
    [isManagerRole, selectedSiteId],
  );

  const selectedSiteLabel = React.useMemo(() => {
    if (selectedSiteId == null) return t("sidebar.siteFallback");
    const matched = siteOptions.find((site) => site.id === selectedSiteId);
    return matched?.label ?? selectedSiteId;
  }, [selectedSiteId, siteOptions, t]);

  const siteScopeValue = React.useMemo<SiteScopeContextValue>(
    () => ({
      selectedSiteId,
      isSiteLocked: isManagerRole,
      canSelectAllSites: isAdminRole && !isManagerRole,
      sites: safeSites.map((site) => ({
        id: site.id,
        label: site.name,
        code: site.code ?? null,
      })),
      setSelectedSiteId: (siteId: string | null) => {
        if (!isAdminRole || isManagerRole) return;
        setSelectedGlobalSiteId(siteId);
      },
      appendSiteParam: (url: string) => appendSiteParam(url),
    }),
    [appendSiteParam, isAdminRole, isManagerRole, safeSites, selectedSiteId],
  );

  React.useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isDesktop) setMobileOpen(false);
  }, [isDesktop]);

  React.useEffect(() => {
    document.documentElement.dataset.density = preferences.density;
    return () => {
      delete document.documentElement.dataset.density;
    };
  }, [preferences.density]);

  React.useEffect(() => {
    if (!loaded) return;
    const nextMode = preferences.theme.mode ?? "light";
    setTheme(nextMode === "system" ? "light" : nextMode);
  }, [loaded, preferences.theme.mode, setTheme]);

  React.useEffect(() => {
    if (!profileMenuOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        event.target instanceof Node &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setProfileMenuOpen(false);
      profileMenuButtonRef.current?.focus();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileMenuOpen]);

  const handleProfileNavigate = React.useCallback(
    (href: string) => {
      setProfileMenuOpen(false);
      router.push(href);
    },
    [router],
  );

  const handleSignOut = React.useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await clearAuthSession();
      router.replace("/login");
    } finally {
      setProfileMenuOpen(false);
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  const startResizing = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isDesktop || collapsed) return;
      event.preventDefault();
      setResizing(true);
      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setSidebarWidth(startWidth + delta);
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [isDesktop, collapsed, sidebarWidth, setSidebarWidth],
  );

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

      <SiteScopeProvider value={siteScopeValue}>
        <div
          className={cn(
            "flex min-h-screen bg-page font-sans tracking-tight",
            preferences.density === "compact"
              ? "density-compact"
              : "density-comfortable",
          )}
        >
          {mobileOpen && !isDesktop && (
            <div
              className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-lg lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
              data-testid="mobile-sidebar-overlay"
            />
          )}

          <div
            className={cn(
              isDesktop
                ? "block"
                : mobileOpen
                  ? "fixed inset-y-0 left-0 z-40"
                  : "hidden",
              "relative",
            )}
            style={{
              ...(isDesktop
                ? ({
                    "--sidebar-width": `${sidebarWidth}px`,
                  } as React.CSSProperties)
                : {}),
            }}
          >
            <SidebarWithUnread
              currentPath={pathname}
              userRole={toSidebarRole(currentUser?.role)}
              collapsed={isDesktop ? collapsed : false}
              onToggleCollapse={
                isDesktop
                  ? () => setSidebarCollapsed(!collapsed)
                  : () => setMobileOpen(false)
              }
              siteOptions={siteOptions}
              selectedSiteId={selectedSiteId}
              selectedSiteLabel={selectedSiteLabel}
              siteFallbackLabel={t("sidebar.siteFallback")}
              onSiteChange={
                isAdminRole && !isManagerRole
                  ? (siteId) => setSelectedGlobalSiteId(siteId)
                  : undefined
              }
            />

            {isDesktop && !collapsed && (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionner la barre latérale"
                className={cn(
                  "absolute right-0 top-0 z-40 hidden h-full w-1.5 -translate-x-1/2 cursor-col-resize lg:block",
                  "bg-transparent transition-colors duration-fast hover:bg-primary/18",
                  resizing && "bg-primary/28",
                )}
                onMouseDown={startResizing}
              />
            )}
          </div>

          <div
            className="flex min-w-0 flex-1 flex-col transition-[margin] duration-normal ease-snappy"
            style={{
              marginLeft: isDesktop ? `${sidebarWidth}px` : "0",
            }}
          >
            <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-border bg-white px-page-x">
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    isDesktop
                      ? setSidebarCollapsed(!collapsed)
                      : setMobileOpen((prev) => !prev)
                  }
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    "text-ink-tertiary transition-colors duration-fast",
                    "hover:bg-surface-sunken hover:text-ink",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                    "lg:hidden",
                  )}
                  aria-label={
                    mobileOpen
                      ? t("appShell.closeMenu")
                      : t("appShell.openMenu")
                  }
                >
                  {mobileOpen ? (
                    <X className="h-4.5 w-4.5" />
                  ) : (
                    <Menu className="h-4.5 w-4.5" />
                  )}
                </button>

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
                            : "text-ink-secondary",
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

              <div className="flex items-center gap-2">
                <button
                  ref={searchTriggerRef}
                  onClick={() => setCmdOpen(true)}
                  className={cn(
                    "hidden items-center gap-2 rounded-lg px-3 py-1.5",
                    "border border-border bg-surface-sunken",
                    "text-caption text-ink-tertiary",
                    "transition-all duration-fast",
                    "hover:border-border-hover hover:bg-surface hover:text-ink",
                    "sm:flex",
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>{t("commandPalette.placeholder").split(",")[0]}…</span>
                  <kbd className="rounded-[var(--radius-xs)] border border-border bg-surface px-1.5 py-px font-mono text-[10px] font-semibold text-ink-secondary">
                    ⌘K
                  </kbd>
                </button>

                <button
                  className={cn(
                    "relative flex h-9 w-9 items-center justify-center rounded-lg",
                    "text-ink-tertiary transition-colors duration-fast",
                    "hover:bg-surface-sunken hover:text-ink",
                  )}
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>

                <ThemeToggle
                  onModeChange={setThemeMode}
                  className="text-ink-tertiary hover:bg-surface-sunken hover:text-ink dark:hover:bg-surface-sunken"
                />

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
                      "hover:border-border-hover hover:bg-surface-sunken",
                      "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
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

                <div className="relative" ref={profileMenuRef}>
                  <button
                    ref={profileMenuButtonRef}
                    type="button"
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full",
                      "bg-primary",
                      "text-xs font-bold text-white",
                      "shadow-raised transition-colors duration-fast",
                      "hover:bg-primary-600",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    )}
                    aria-label={t("appShell.profileMenu.open")}
                    aria-expanded={profileMenuOpen}
                    aria-haspopup="menu"
                    aria-controls="profile-menu"
                  >
                    {userInitial}
                  </button>

                  {profileMenuOpen && (
                    <div
                      id="profile-menu"
                      role="menu"
                      aria-label={t("appShell.profileMenu.title")}
                      className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-raised)]"
                    >
                      <div className="border-b border-border px-3 py-2.5">
                        <p className="truncate text-title-sm text-ink">
                          {currentUser?.email ??
                            t("appShell.profileMenu.noEmail")}
                        </p>
                        <p className="text-caption text-ink-secondary">
                          {currentUser?.role ??
                            t("appShell.profileMenu.roleFallback")}
                        </p>
                      </div>

                      <div className="p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleProfileNavigate("/dashboard")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm text-ink transition-colors duration-fast hover:bg-surface-interactive"
                        >
                          <LayoutDashboard className="h-4 w-4 text-ink-secondary" />
                          {t("appShell.profileMenu.dashboard")}
                        </button>
                        {canManageSettings && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleProfileNavigate("/parametres")}
                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm text-ink transition-colors duration-fast hover:bg-surface-interactive"
                          >
                            <Settings className="h-4 w-4 text-ink-secondary" />
                            {t("appShell.profileMenu.settings")}
                          </button>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => handleProfileNavigate("/messages")}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm text-ink transition-colors duration-fast hover:bg-surface-interactive"
                        >
                          <MessageSquare className="h-4 w-4 text-ink-secondary" />
                          {t("appShell.profileMenu.support")}
                        </button>
                      </div>

                      <div className="border-t border-border p-1.5">
                        <button
                          type="button"
                          role="menuitem"
                          disabled={isSigningOut}
                          onClick={() => {
                            void handleSignOut();
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm text-danger-text transition-colors duration-fast hover:bg-danger-light/35 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <LogOut className="h-4 w-4" />
                          {isSigningOut
                            ? t("appShell.profileMenu.loggingOut")
                            : t("appShell.profileMenu.logout")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <main
              id="main-content"
              tabIndex={-1}
              className="flex-1 px-page-x py-page-y"
            >
              <div className="mx-auto max-w-page">{children}</div>
            </main>
          </div>
        </div>
      </SiteScopeProvider>
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
