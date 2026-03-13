"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  X,
  Search,
  Bell,
  LayoutGrid,
  Building2,
  Settings,
  LogOut,
  Mail,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { ADMIN_GLOBAL_NAV_ITEMS, canAccessPath } from "@/lib/auth/route-access";

interface AdminTopbarProps {
  mobileOpen: boolean;
  onToggleMobile: () => void;
  title?: string;
  userEmail?: string;
  userRole?: string;
  permissions?: readonly string[] | null;
  onOpenCommandPalette?: () => void;
  onLogout?: () => Promise<void>;
  isSigningOut?: boolean;
}

const PROFILE_MENU_ICON_BY_ROUTE: Record<string, LucideIcon> = {
  "/": LayoutGrid,
  "/clients": Building2,
  "/demandes-contact": Mail,
  "/journal": BookOpen,
  "/parametres": Settings,
};

const PROFILE_MENU_PATHS = new Set(["/", "/clients", "/parametres"]);

export function AdminTopbar({
  mobileOpen,
  onToggleMobile,
  title,
  userEmail,
  userRole,
  permissions,
  onOpenCommandPalette,
  onLogout,
  isSigningOut = false,
}: AdminTopbarProps) {
  const router = useRouter();
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const profileMenuRef = React.useRef<HTMLDivElement>(null);
  const profileMenuButtonRef = React.useRef<HTMLButtonElement>(null);
  const profileMenuItems = React.useMemo(
    () =>
      ADMIN_GLOBAL_NAV_ITEMS.filter(
        (item) =>
          PROFILE_MENU_PATHS.has(item.href) &&
          (permissions == null || canAccessPath(item.href, permissions)),
      ),
    [permissions],
  );

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

  const userInitial = userEmail?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-border/60 bg-[var(--topbar-bg)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobile}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors duration-fast",
            "hover:bg-surface-sunken hover:text-ink lg:hidden",
          )}
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? (
            <X className="h-4.5 w-4.5" />
          ) : (
            <Menu className="h-4.5 w-4.5" />
          )}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
            Admin
          </span>
          {title && (
            <>
              <span className="text-ink-placeholder" aria-hidden="true">
                /
              </span>
              <span className="text-sm font-semibold text-ink">{title}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenCommandPalette}
          className={cn(
            "hidden items-center gap-2 rounded-lg border border-border bg-surface-sunken px-3 py-1.5 text-xs text-ink-tertiary transition-all duration-fast sm:flex",
            "hover:border-border-hover hover:bg-surface hover:text-ink",
          )}
        >
          <Search className="h-3.5 w-3.5" />
          Rechercher
          <kbd className="rounded-[var(--radius-xs)] border border-border bg-surface px-1.5 py-px font-mono text-[10px] font-semibold text-ink-secondary">
            ⌘K
          </kbd>
        </button>

        <button
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-lg text-ink-tertiary transition-colors duration-fast",
            "hover:bg-surface-sunken hover:text-ink",
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <ThemeToggle />

        <div className="mx-0.5 h-5 w-px bg-border" />

        <div className="relative" ref={profileMenuRef}>
          <button
            ref={profileMenuButtonRef}
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-raised transition-colors duration-fast",
              "hover:bg-primary-600",
            )}
            aria-label="Menu profil"
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
              aria-label="Menu profil"
              className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-border/60 bg-card shadow-floating"
            >
              <div className="border-b border-border px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-ink">
                  {userEmail ?? "Compte non renseigne"}
                </p>
                <p className="text-xs text-ink-secondary">
                  {userRole ?? "admin"}
                </p>
              </div>

              <div className="p-1.5">
                {profileMenuItems.map((item) => {
                  const Icon =
                    PROFILE_MENU_ICON_BY_ROUTE[item.href] ?? LayoutGrid;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        router.push(item.href);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors duration-fast hover:bg-surface-interactive"
                    >
                      <Icon className="h-4 w-4 text-ink-secondary" />
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-border p-1.5">
                <button
                  type="button"
                  role="menuitem"
                  disabled={isSigningOut}
                  onClick={() => {
                    void onLogout?.();
                    setProfileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger-text transition-colors duration-fast hover:bg-danger-light/35 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  {isSigningOut ? "Deconnexion..." : "Se deconnecter"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
