"use client";

import * as React from "react";
import Link from "next/link";
import { List, Bell, CaretRight } from "@phosphor-icons/react";
import { cn } from "@praedixa/ui";

import type { BreadcrumbItem } from "./app-shell-model";
import { AppShellProfileMenu } from "./app-shell-profile-menu";

const HEADER_ICON_BUTTON_CLASS = cn(
  "relative flex h-9 w-9 items-center justify-center rounded-lg",
  "text-ink-tertiary transition-[background-color,color,transform] duration-fast",
  "hover:bg-surface-sunken hover:text-ink",
  "active:translate-y-px",
);

type AppShellTopbarProps = {
  breadcrumbs: BreadcrumbItem[];
  currentDate: string | null;
  locale: "fr" | "en";
  userInitial: string;
  mobileOpen: boolean;
  profileMenuOpen: boolean;
  isSigningOut: boolean;
  currentUser: {
    email?: string | null;
    role?: string | null;
  } | null;
  languageControlDisabled: boolean;
  languageControlHint: string | null;
  t: (key: string) => string;
  onToggleMobileMenu: () => void;
  onLocaleChange: (locale: "fr" | "en") => void;
  onToggleProfileMenu: () => void;
  onNavigateFromProfile: (href: string) => void;
  onSignOut: () => void;
  profileMenuRef: React.RefObject<HTMLDivElement | null>;
  profileMenuButtonRef: React.RefObject<HTMLButtonElement | null>;
};

export function AppShellTopbar({
  breadcrumbs,
  currentDate,
  locale,
  userInitial,
  mobileOpen,
  profileMenuOpen,
  isSigningOut,
  currentUser,
  languageControlDisabled,
  languageControlHint,
  t,
  onToggleMobileMenu,
  onLocaleChange,
  onToggleProfileMenu,
  onNavigateFromProfile,
  onSignOut,
  profileMenuRef,
  profileMenuButtonRef,
}: AppShellTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-border/60 px-page-x surface-glass-refraction">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
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
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 && (
                <CaretRight
                  className="h-3 w-3 text-ink-placeholder"
                  aria-hidden="true"
                  weight="bold"
                />
              )}
              <span
                className={cn(
                  "max-w-[22ch] truncate text-sm font-semibold tracking-[-0.01em] sm:max-w-none",
                  index === breadcrumbs.length - 1
                    ? "text-ink"
                    : "text-ink-secondary",
                )}
              >
                {crumb.label}
              </span>
            </React.Fragment>
          ))}
          {currentDate ? (
            <span className="ml-2 hidden rounded-full border border-border/70 bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-ink-tertiary md:inline-flex">
              {currentDate}
            </span>
          ) : null}
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
              onLocaleChange(event.target.value === "en" ? "en" : "fr")
            }
            disabled={languageControlDisabled}
            aria-describedby={
              languageControlHint ? "app-language-sync-status" : undefined
            }
            title={languageControlHint ?? undefined}
            className={cn(
              "cursor-pointer appearance-none rounded-lg border border-border",
              "h-9 bg-surface pl-2.5 pr-7",
              "text-xs font-semibold text-ink outline-none",
              "transition-[background-color,border-color,color,transform] duration-fast",
              "hover:border-border-hover hover:bg-surface-sunken",
              "active:translate-y-px",
              "focus:border-primary/40 focus:ring-2 focus:ring-primary/20",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            <option value="fr">FR</option>
            <option value="en">EN</option>
          </select>
        </div>
        {languageControlHint ? (
          <span id="app-language-sync-status" className="sr-only">
            {languageControlHint}
          </span>
        ) : null}

        <div className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

        <div className="relative" ref={profileMenuRef}>
          <button
            ref={profileMenuButtonRef}
            type="button"
            onClick={onToggleProfileMenu}
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

          <AppShellProfileMenu
            currentUser={currentUser}
            isOpen={profileMenuOpen}
            isSigningOut={isSigningOut}
            t={t}
            onNavigate={onNavigateFromProfile}
            onSignOut={onSignOut}
          />
        </div>
      </div>
    </header>
  );
}
