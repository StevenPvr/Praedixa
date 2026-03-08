"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMediaQuery } from "@praedixa/ui";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { CommandPalette, useCommandPalette } from "@/components/command-palette";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { clearAuthSession, useCurrentUserState } from "@/lib/auth/client";
import {
  canAccessPath,
  getRequiredPermissionsForPath,
} from "@/lib/auth/route-access";

const ROOT_PAGE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/clients": "Clients",
  "/demandes-contact": "Demandes contact",
  "/journal": "Journal",
  "/parametres": "Parametres",
};

const WORKSPACE_PAGE_TITLES: Record<string, string> = {
  "dashboard": "Workspace client - Tableau de bord",
  "vue-client": "Workspace client - Vue client",
  "donnees": "Workspace client - Donnees",
  "previsions": "Workspace client - Previsions",
  "actions": "Workspace client - Actions",
  "alertes": "Workspace client - Alertes",
  "rapports": "Workspace client - Rapports",
  "onboarding": "Workspace client - Onboarding",
  "equipe": "Workspace client - Equipe",
  "config": "Workspace client - Configuration",
  "messages": "Workspace client - Messages",
};

function getPageTitle(pathname: string): string | undefined {
  if (ROOT_PAGE_TITLES[pathname]) {
    return ROOT_PAGE_TITLES[pathname];
  }

  if (pathname.startsWith("/clients/")) {
    const [, , , section] = pathname.split("/");
    if (section && WORKSPACE_PAGE_TITLES[section]) {
      return WORKSPACE_PAGE_TITLES[section];
    }
    return "Workspace client";
  }

  for (const [prefix, title] of Object.entries(ROOT_PAGE_TITLES)) {
    if (prefix !== "/" && pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  return undefined;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUserState = useCurrentUserState();
  const currentUser = currentUserState.user;

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (isDesktop) {
      setMobileOpen(false);
    }
  }, [isDesktop]);

  const handleLogout = React.useCallback(async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await clearAuthSession();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, router]);

  const title = getPageTitle(pathname);
  const currentPermissions = currentUserState.loading
    ? []
    : (currentUser?.permissions ?? []);
  const canRenderCurrentPath =
    currentUserState.loading || canAccessPath(pathname, currentPermissions);
  const requiredPermissions = getRequiredPermissionsForPath(pathname);
  const permissionHint = requiredPermissions.join(" ou ");

  return (
    <div className="flex min-h-screen bg-page">
      <RouteProgressBar />

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        permissions={currentPermissions}
      />

      {mobileOpen && !isDesktop && (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-lg lg:hidden"
          onClick={() => setMobileOpen(false)}
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
          permissions={currentPermissions}
        />
      </div>

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
        <AdminTopbar
          mobileOpen={mobileOpen}
          onToggleMobile={() => setMobileOpen((prev) => !prev)}
          title={title}
          userEmail={currentUser?.email ?? undefined}
          userRole={currentUser?.role ?? undefined}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onLogout={handleLogout}
          isSigningOut={isSigningOut}
        />

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6">
          <div className="mx-auto w-full">
            {currentUserState.loading ? (
              <div className="rounded-2xl border border-border-subtle bg-card p-6 text-sm text-ink-tertiary shadow-soft">
                Verification des permissions en cours...
              </div>
            ) : canRenderCurrentPath ? (
              children
            ) : (
              <div className="rounded-2xl border border-border-subtle bg-card p-6 shadow-soft">
                <h2 className="font-serif text-lg font-semibold text-ink">
                  Acces restreint
                </h2>
                <p className="mt-2 text-sm text-ink-tertiary">
                  Permission requise: {permissionHint || "admin:console:access"}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
