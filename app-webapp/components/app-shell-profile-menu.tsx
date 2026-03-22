"use client";

import * as React from "react";
import { SquaresFour, Gear, ChatCircle, SignOut } from "@phosphor-icons/react";
import { cn } from "@praedixa/ui";

const PROFILE_MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-body-sm transition-[background-color,color,transform] duration-fast active:translate-y-px";

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

type AppShellProfileMenuProps = {
  currentUser: {
    email?: string | null;
    role?: string | null;
  } | null;
  isOpen: boolean;
  isSigningOut: boolean;
  t: (key: string) => string;
  onNavigate: (href: string) => void;
  onSignOut: () => void;
};

export function AppShellProfileMenu({
  currentUser,
  isOpen,
  isSigningOut,
  t,
  onNavigate,
  onSignOut,
}: AppShellProfileMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
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
          icon={
            <SquaresFour
              className="h-4 w-4 text-ink-secondary"
              weight="regular"
            />
          }
          onClick={() => onNavigate("/dashboard")}
        >
          {t("appShell.profileMenu.dashboard")}
        </ProfileMenuItem>
        <ProfileMenuItem
          icon={
            <Gear className="h-4 w-4 text-ink-secondary" weight="regular" />
          }
          onClick={() => onNavigate("/parametres")}
        >
          {t("appShell.profileMenu.settings")}
        </ProfileMenuItem>
        <ProfileMenuItem
          icon={
            <ChatCircle
              className="h-4 w-4 text-ink-secondary"
              weight="regular"
            />
          }
          onClick={() => onNavigate("/messages")}
        >
          {t("appShell.profileMenu.support")}
        </ProfileMenuItem>
      </div>

      <div className="border-t border-border p-1.5">
        <ProfileMenuItem
          icon={<SignOut className="h-4 w-4" weight="regular" />}
          danger
          disabled={isSigningOut}
          onClick={onSignOut}
        >
          {isSigningOut
            ? t("appShell.profileMenu.loggingOut")
            : t("appShell.profileMenu.logout")}
        </ProfileMenuItem>
      </div>
    </div>
  );
}
