"use client";

import { Menu, X } from "lucide-react";
import { cn } from "@praedixa/ui";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminTopbarProps {
  mobileOpen: boolean;
  onToggleMobile: () => void;
  title?: string;
}

export function AdminTopbar({
  mobileOpen,
  onToggleMobile,
  title,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-primary/30 bg-[var(--topbar-bg)] px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobile}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-tertiary transition-colors hover:bg-primary/18 hover:text-ink lg:hidden"
          aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>

        {/* Breadcrumb / page title */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">
            Admin
          </span>
          {title && (
            <>
              <span className="text-ink-placeholder" aria-hidden="true">
                /
              </span>
              <span className={cn("text-sm font-medium text-charcoal")}>
                {title}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side — placeholder for future search, notifications, etc. */}
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary-700">
          A
        </div>
      </div>
    </header>
  );
}
