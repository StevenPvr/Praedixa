"use client";

import * as React from "react";

import type { SiteScopeContextValue } from "@/lib/site-scope";

export interface BreadcrumbItem {
  label: string;
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const map: Record<string, BreadcrumbItem[]> = {
    "/dashboard": [{ label: "Accueil" }],
    "/previsions": [{ label: "Previsions" }],
    "/actions": [{ label: "Actions" }],
    "/messages": [{ label: "Support" }],
    "/parametres": [{ label: "Reglages" }],
  };

  for (const [key, crumbs] of Object.entries(map)) {
    if (pathname.startsWith(key)) {
      return crumbs;
    }
  }

  return [{ label: "Praedixa" }];
}

export function formatHeaderDate(locale: "fr" | "en"): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date());
}

function getDelayUntilNextDay(now: Date): number {
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 0, 0);
  return Math.max(nextDay.getTime() - now.getTime(), 1_000);
}

export function useHeaderDate(locale: "fr" | "en"): string | null {
  const [currentDate, setCurrentDate] = React.useState<string | null>(null);

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refreshDate = () => {
      const now = new Date();
      setCurrentDate(formatHeaderDate(locale));
      timeoutId = setTimeout(refreshDate, getDelayUntilNextDay(now));
    };

    refreshDate();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [locale]);

  return currentDate;
}

export function useLockedSiteScope(
  currentUser: {
    role?: string | null;
    siteId?: string | null;
  } | null,
): SiteScopeContextValue {
  const isManagerRole =
    currentUser?.role === "manager" || currentUser?.role === "hr_manager";
  const selectedSiteId = isManagerRole ? (currentUser?.siteId ?? null) : null;

  const appendSiteParam = React.useCallback(
    (url: string) => {
      const [path = url, query = ""] = url.split("?");
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

export function useDismissibleProfileMenu(
  isOpen: boolean,
  onClose: () => void,
  menuRef: React.RefObject<HTMLDivElement | null>,
  buttonRef: React.RefObject<HTMLButtonElement | null>,
): void {
  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

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
      if (event.key !== "Escape") {
        return;
      }
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
