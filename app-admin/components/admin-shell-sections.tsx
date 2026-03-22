"use client";

import type * as React from "react";

import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";

type AdminShellBackdropProps = Readonly<{
  visible: boolean;
  onClose: () => void;
}>;

export function AdminShellBackdrop({
  visible,
  onClose,
}: AdminShellBackdropProps) {
  if (visible === false) {
    return null;
  }

  return (
    <button
      aria-label="Fermer le menu"
      className="fixed inset-0 z-30 bg-ink/50 backdrop-blur-lg lg:hidden"
      onClick={onClose}
    />
  );
}

type AdminShellSidebarProps = Readonly<{
  isDesktop: boolean;
  mobileOpen: boolean;
  pathname: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userEmail: string;
  permissions: readonly string[];
}>;

export function AdminShellSidebar({
  isDesktop,
  mobileOpen,
  pathname,
  collapsed,
  onToggleCollapse,
  userEmail,
  permissions,
}: AdminShellSidebarProps) {
  let shellVisibilityClassName = "hidden";

  if (isDesktop) {
    shellVisibilityClassName = "block";
  } else if (mobileOpen) {
    shellVisibilityClassName = "fixed inset-y-0 left-0 z-40";
  }

  return (
    <div className={shellVisibilityClassName}>
      <AdminSidebar
        currentPath={pathname}
        collapsed={isDesktop ? collapsed : false}
        onToggleCollapse={onToggleCollapse}
        userEmail={userEmail}
        permissions={permissions}
      />
    </div>
  );
}

type AdminShellMainProps = Readonly<{
  isDesktop: boolean;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  title: string | undefined;
  userEmail: string | undefined;
  userRole: string | undefined;
  permissions: readonly string[];
  onOpenCommandPalette: () => void;
  onLogout: () => Promise<void>;
  isSigningOut: boolean;
  isLoading: boolean;
  canRenderCurrentPath: boolean;
  hasExplicitPolicy: boolean;
  permissionHint: string;
  children: React.ReactNode;
}>;

export function AdminShellMain({
  isDesktop,
  collapsed,
  mobileOpen,
  onToggleMobile,
  title,
  userEmail,
  userRole,
  permissions,
  onOpenCommandPalette,
  onLogout,
  isSigningOut,
  isLoading,
  canRenderCurrentPath,
  hasExplicitPolicy,
  permissionHint,
  children,
}: AdminShellMainProps) {
  let mainMarginLeft = "0";

  if (isDesktop) {
    mainMarginLeft = collapsed
      ? "var(--sidebar-collapsed-width)"
      : "var(--sidebar-width)";
  }
  const accessMessage = hasExplicitPolicy
    ? `Permission requise: ${permissionHint || "admin:console:access"}`
    : "Aucune policy explicite n'autorise ce chemin admin.";

  let content: React.ReactNode;

  if (isLoading) {
    content = (
      <div className="rounded-2xl border border-border-subtle bg-card p-6 text-sm text-ink-tertiary shadow-soft">
        Verification des permissions en cours...
      </div>
    );
  } else if (canRenderCurrentPath) {
    content = children;
  } else {
    content = (
      <div className="rounded-2xl border border-border-subtle bg-card p-6 shadow-soft">
        <h2 className="font-serif text-lg font-semibold text-ink">
          Acces restreint
        </h2>
        <p className="mt-2 text-sm text-ink-tertiary">{accessMessage}</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-w-0 flex-1 flex-col transition-[margin] duration-normal ease-snappy"
      style={{
        marginLeft: mainMarginLeft,
      }}
    >
      <AdminTopbar
        mobileOpen={mobileOpen}
        onToggleMobile={onToggleMobile}
        title={title}
        userEmail={userEmail}
        userRole={userRole}
        permissions={permissions}
        onOpenCommandPalette={onOpenCommandPalette}
        onLogout={onLogout}
        isSigningOut={isSigningOut}
      />

      <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6">
        <div className="mx-auto w-full">{content}</div>
      </main>
    </div>
  );
}
