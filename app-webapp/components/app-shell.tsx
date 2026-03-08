"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  List,
  Bell,
  CaretRight,
  SquaresFour,
  Gear,
  ChatCircle,
  SignOut,
} from "@phosphor-icons/react";
import { Sidebar } from "@/components/sidebar";
import { clearAuthSession, useCurrentUser } from "@/lib/auth/client";
import { toSidebarRole } from "@/lib/auth/roles";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import {
  SiteScopeProvider,
  type SiteScopeContextValue,
} from "@/lib/site-scope";
import { cn } from "@praedixa/ui";

interface BreadcrumbItem {
  label: string;
}

const HEADER_ICON_BUTTON_CLASS = cn(
  "relative flex h-9 w-9 items-center justify-center rounded-lg",
  "text-ink-tertiary transition-[background-color,color,transform] duration-fast",
  "hover:bg-surface-sunken hover:text-ink",
  "active:translate-y-px",
);

const PROFILE_MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm transition-[background-color,color,transform] duration-fast active:translate-y-px";

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const map: Record<string, BreadcrumbItem[]> = {
    "/dashboard": [{ label: "Accueil" }],
    "/previsions": [{ label: "Previsions" }],
    "/actions": [{ label: "Actions" }],
    "/messages": [{ label: "Support" }],
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

function useLockedSiteScope(
  currentUser: ReturnType<typeof useCurrentUser>,
): SiteScopeContextValue {
  const isManagerRole =
    currentUser?.role === "manager" || currentUser?.role === "hr_manager";
  const selectedSiteId = isManagerRole ? (currentUser?.siteId ?? null) : null;

  const appendSiteParam = React.useCallback(
    (url: string) => {
      const [path, query = ""] = url.split("?");
      const params = new URLSearchParams(query);
      if (isManagerRole && selectedSiteId) {
        params.set("site_id", selectedSiteId);
      }
      const search = params.toString();
      return search ? `${path}?${search}` : path;
    },
    [isManagerRole, selectedSiteId],
  );

  return React.useMemo(
    () => ({
      selectedSiteId,
      isSiteLocked: isManagerRole,
      canSelectAllSites: false,
      sites: [],
      setSelectedSiteId: () => undefined,
      appendSiteParam,
    }),
    [appendSiteParam, isManagerRole, selectedSiteId],
  );
}

function useDismissibleProfileMenu(
  isOpen: boolean,
  onClose: () => void,
  menuRef: React.RefObject<HTMLDivElement | null>,
  buttonRef: React.RefObject<HTMLButtonElement | null>,
): void {
  React.useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onClose();
      buttonRef.current?.focus();
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [buttonRef, isOpen, menuRef, onClose]);
}

function ProfileMenuItem({
  icon,
  danger = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        PROFILE_MENU_ITEM_CLASS,
        danger
          ? "text-danger-text hover:bg-danger-light/35 disabled:cursor-not-allowed disabled:opacity-60"
          : "text-ink hover:bg-surface-interactive",
      )}
      {...props}
    >
      {icon}
      {props.children}
    </button>
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { locale, setLocale, t } = useI18n();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentDate = formatHeaderDate(locale);
  const userInitial = currentUser?.email?.charAt(0).toUpperCase() ?? "U";
  const siteScopeValue = useLockedSiteScope(currentUser);

  React.useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);
  useDismissibleProfileMenu(
    profileMenuOpen,
    () => setProfileMenuOpen(false),
    profileMenuRef,
    profileMenuButtonRef,
  );

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
      router.replace('/login');
    } finally {
      setProfileMenuOpen(false);
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  return (
    <SiteScopeProvider value={siteScopeValue}>
      <div className="flex min-h-[100dvh] bg-page font-sans tracking-tight">
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-lg lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
            data-testid="mobile-sidebar-overlay"
          />
        )}

        <div
          className={cn(
            mobileOpen ? "fixed inset-y-0 left-0 z-40" : "hidden",
            "relative lg:block",
          )}
        >
          <Sidebar
            currentPath={pathname}
            userRole={toSidebarRole(currentUser?.role)}
            collapsed={false}
            onToggleCollapse={() => setMobileOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col lg:ml-[268px]">
          <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-border/60 px-page-x surface-glass-refraction">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen((prev) => !prev)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  "text-ink-tertiary transition-[background-color,color,transform] duration-fast",
                  "hover:bg-surface-sunken hover:text-ink",
                  "active:translate-y-px",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  "lg:hidden",
                )}
                aria-label={
                  mobileOpen ? t("appShell.closeMenu") : t("appShell.openMenu")
                }
              >
                <List className="h-4.5 w-4.5" weight="bold" />
              </button>

              <nav
                aria-label="Breadcrumb"
                className="flex min-w-0 items-center gap-1.5"
              >
                {breadcrumbs.map((crumb, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <CaretRight
                        className="h-3 w-3 text-ink-placeholder"
                        aria-hidden="true"
                        weight="bold"
                      />
                    )}
                    <span
                      className={cn(
                        "max-w-[22ch] truncate text-sm font-semibold tracking-[-0.01em] sm:max-w-none",
                        i === breadcrumbs.length - 1
                          ? "text-ink"
                          : "text-ink-secondary",
                      )}
                    >
                      {crumb.label}
                    </span>
                  </React.Fragment>
                ))}
                <span className="ml-2 hidden rounded-full border border-border/70 bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-tertiary md:inline-flex">
                  {currentDate}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/actions?severity=critical"
                className={HEADER_ICON_BUTTON_CLASS}
                aria-label="Notifications critiques"
              >
                <Bell className="h-4 w-4" weight="regular" />
              </Link>

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
                    "h-9 bg-surface pl-2.5 pr-7",
                    "text-xs font-semibold text-ink outline-none",
                    "transition-[background-color,border-color,color,transform] duration-fast",
                    "hover:border-border-hover hover:bg-surface-sunken",
                    "active:translate-y-px",
                    "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
                  )}
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </div>

              <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

              <div className="relative" ref={profileMenuRef}>
                <button
                  ref={profileMenuButtonRef}
                  type="button"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full",
                    "bg-primary",
                    "text-xs font-bold text-white",
                    "shadow-raised transition-[background-color,transform] duration-fast",
                    "hover:bg-primary-600 active:translate-y-px",
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
                    className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border/70 bg-card shadow-floating"
                  >
                    <div className="border-b border-border px-3 py-2.5">
                      <p className="truncate text-title-sm text-ink">
                        {currentUser?.email ?? t("appShell.profileMenu.noEmail")}
                      </p>
                      <p className="text-caption text-ink-secondary">
                        {currentUser?.role ?? t("appShell.profileMenu.roleFallback")}
                      </p>
                    </div>

                    <div className="p-1.5">
                      <ProfileMenuItem
                        icon={<SquaresFour className="h-4 w-4 text-ink-secondary" weight="regular" />}
                        onClick={() => handleProfileNavigate('/dashboard')}
                      >
                        {t("appShell.profileMenu.dashboard")}
                      </ProfileMenuItem>
                      <ProfileMenuItem
                        icon={<Gear className="h-4 w-4 text-ink-secondary" weight="regular" />}
                        onClick={() => handleProfileNavigate('/parametres')}
                      >
                        {t("appShell.profileMenu.settings")}
                      </ProfileMenuItem>
                      <ProfileMenuItem
                        icon={<ChatCircle className="h-4 w-4 text-ink-secondary" weight="regular" />}
                        onClick={() => handleProfileNavigate('/messages')}
                      >
                        {t("appShell.profileMenu.support")}
                      </ProfileMenuItem>
                    </div>

                    <div className="border-t border-border p-1.5">
                      <ProfileMenuItem
                        icon={<SignOut className="h-4 w-4" weight="regular" />}
                        danger
                        disabled={isSigningOut}
                        onClick={() => {
                          void handleSignOut();
                        }}
                      >
                        {isSigningOut
                          ? t("appShell.profileMenu.loggingOut")
                          : t("appShell.profileMenu.logout")}
                      </ProfileMenuItem>
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
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppShellContent>{children}</AppShellContent>
    </I18nProvider>
  );
}
