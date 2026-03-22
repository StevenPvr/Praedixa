"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMediaQuery } from "@praedixa/ui";
import {
  CommandPalette,
  useCommandPalette,
} from "@/components/command-palette";
import { RouteProgressBar } from "@/components/route-progress-bar";
import { clearAuthSession, useCurrentUserState } from "@/lib/auth/client";
import {
  canAccessPath,
  getAdminPageTitle,
  getRequiredPermissionsForPath,
  hasExplicitAdminPagePolicy,
} from "@/lib/auth/admin-route-policies";
import {
  AdminShellBackdrop,
  AdminShellMain,
  AdminShellSidebar,
} from "@/components/admin-shell-sections";

type AdminShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentUserState = useCurrentUserState();
  const currentUser = currentUserState.user;

  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobileOverlayVisible = mobileOpen && isDesktop === false;
  const handleToggleSidebar = isDesktop
    ? () => setCollapsed((previous) => previous === false)
    : () => setMobileOpen(false);

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

  const title = getAdminPageTitle(pathname);
  const currentPermissions = currentUserState.loading
    ? []
    : (currentUser?.permissions ?? []);
  const hasExplicitPolicy = hasExplicitAdminPagePolicy(pathname);
  const canRenderCurrentPath =
    currentUserState.loading ||
    (hasExplicitPolicy && canAccessPath(pathname, currentPermissions));
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

      <AdminShellBackdrop
        visible={isMobileOverlayVisible}
        onClose={() => setMobileOpen(false)}
      />

      <AdminShellSidebar
        isDesktop={isDesktop}
        mobileOpen={mobileOpen}
        pathname={pathname}
        collapsed={collapsed}
        onToggleCollapse={handleToggleSidebar}
        userEmail={currentUser?.email ?? ""}
        permissions={currentPermissions}
      />

      <AdminShellMain
        isDesktop={isDesktop}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen((previous) => previous === false)}
        title={title}
        userEmail={currentUser?.email}
        userRole={currentUser?.role}
        permissions={currentPermissions}
        onOpenCommandPalette={() => setCommandOpen(true)}
        onLogout={handleLogout}
        isSigningOut={isSigningOut}
        isLoading={currentUserState.loading}
        canRenderCurrentPath={canRenderCurrentPath}
        hasExplicitPolicy={hasExplicitPolicy}
        permissionHint={permissionHint}
      >
        {children}
      </AdminShellMain>
    </div>
  );
}
