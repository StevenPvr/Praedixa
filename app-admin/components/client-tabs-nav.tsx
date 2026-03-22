"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@praedixa/ui";
import { useCurrentUserState } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { CLIENT_WORKSPACE_TABS } from "@/lib/auth/admin-route-policies";

type ClientTabsNavProps = Readonly<{
  basePath: string;
}>;

export function ClientTabsNav({ basePath }: ClientTabsNavProps) {
  const pathname = usePathname();
  const { user: currentUser, loading } = useCurrentUserState();
  const visibleTabs = CLIENT_WORKSPACE_TABS.filter((tab) =>
    hasAnyPermission(currentUser?.permissions, tab.requiredPermissions),
  );
  const hasVisibleTabs = loading === false && visibleTabs.length > 0;

  if (hasVisibleTabs === false) {
    return null;
  }

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border-subtle px-4 sm:px-6"
      aria-label="Onglets client"
    >
      {visibleTabs.map((tab) => {
        const fullHref = `${basePath}/${tab.href}`;
        const isActive =
          pathname === fullHref || pathname.startsWith(`${fullHref}/`);

        return (
          <Link
            key={tab.href}
            href={fullHref}
            className={cn(
              "relative whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "font-medium text-primary"
                : "text-ink-tertiary hover:text-ink-secondary",
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
