"use client";

import { Menu, X } from "lucide-react";
import { cn } from "@praedixa/ui";

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
    <header className="sticky top-0 z-20 flex h-topbar items-center justify-between border-b border-gray-200 bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          onClick={onToggleMobile}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600 lg:hidden"
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
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
            Admin
          </span>
          {title && (
            <>
              <span className="text-gray-300" aria-hidden="true">
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
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-sm font-medium text-amber-700">
          A
        </div>
      </div>
    </header>
  );
}
