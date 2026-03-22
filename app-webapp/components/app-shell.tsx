"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { clearAuthSession, useCurrentUser } from "@/lib/auth/client";
import { toSidebarRole } from "@/lib/auth/roles";
import { I18nProvider, useI18n } from "@/lib/i18n/provider";
import { SiteScopeProvider } from "@/lib/site-scope";
import { cn } from "@praedixa/ui";
import {
  getBreadcrumbs,
  useDismissibleProfileMenu,
  useHeaderDate,
  useLockedSiteScope,
} from "./app-shell-model";
import { AppShellTopbar } from "./app-shell-topbar";

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useCurrentUser();
  const { locale, preferencesSyncError, preferencesSyncState, setLocale, t } =
    useI18n();

  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = React.useRef<HTMLButtonElement>(null);

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentDate = useHeaderDate(locale);
  const userInitial = currentUser?.email?.charAt(0).toUpperCase() ?? "U";
  const siteScopeValue = useLockedSiteScope(currentUser);
  const languageControlDisabled =
    preferencesSyncState === "loading" ||
    preferencesSyncState === "saving" ||
    preferencesSyncState === "unavailable";
  const languageControlHint =
    preferencesSyncState === "loading"
      ? "Chargement des preferences de langue..."
      : preferencesSyncState === "saving"
        ? "Enregistrement de la preference de langue..."
        : preferencesSyncState === "unavailable"
          ? (preferencesSyncError ??
            "Preferences indisponibles. Ouvrez les parametres pour plus de details.")
          : preferencesSyncState === "error"
            ? (preferencesSyncError ?? "Echec du dernier enregistrement.")
            : null;

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
      router.replace("/login");
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
          <AppShellTopbar
            breadcrumbs={breadcrumbs}
            currentDate={currentDate}
            locale={locale}
            userInitial={userInitial}
            mobileOpen={mobileOpen}
            profileMenuOpen={profileMenuOpen}
            isSigningOut={isSigningOut}
            currentUser={currentUser}
            languageControlDisabled={languageControlDisabled}
            languageControlHint={languageControlHint}
            t={t}
            onToggleMobileMenu={() => setMobileOpen((prev) => !prev)}
            onLocaleChange={setLocale}
            onToggleProfileMenu={() => setProfileMenuOpen((prev) => !prev)}
            onNavigateFromProfile={handleProfileNavigate}
            onSignOut={() => {
              handleSignOut().catch(() => undefined);
            }}
            profileMenuRef={profileMenuRef}
            profileMenuButtonRef={profileMenuButtonRef}
          />

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
