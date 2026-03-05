"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@praedixa/ui";
import { useCurrentUser } from "@/lib/auth/client";
import { hasAnyPermission } from "@/lib/auth/permissions";

interface Tab {
  label: string;
  href: string;
  requiredPermissions: string[];
}

const TABS: Tab[] = [
  {
    label: "Dashboard",
    href: "dashboard",
    requiredPermissions: ["admin:org:read", "admin:monitoring:read"],
  },
  { label: "Donnees", href: "donnees", requiredPermissions: ["admin:org:read"] },
  {
    label: "Previsions",
    href: "previsions",
    requiredPermissions: ["admin:org:read"],
  },
  { label: "Actions", href: "actions", requiredPermissions: ["admin:org:read"] },
  { label: "Alertes", href: "alertes", requiredPermissions: ["admin:org:read"] },
  {
    label: "Rapports",
    href: "rapports",
    requiredPermissions: ["admin:org:read"],
  },
  {
    label: "Onboarding",
    href: "onboarding",
    requiredPermissions: ["admin:onboarding:read", "admin:onboarding:write"],
  },
  {
    label: "Config",
    href: "config",
    requiredPermissions: ["admin:org:write", "admin:billing:read"],
  },
  {
    label: "Equipe",
    href: "equipe",
    requiredPermissions: ["admin:users:read", "admin:users:write"],
  },
  {
    label: "Messages",
    href: "messages",
    requiredPermissions: ["admin:messages:read", "admin:messages:write"],
  },
];

interface ClientTabsNavProps {
  basePath: string;
}

export function ClientTabsNav({ basePath }: ClientTabsNavProps) {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const visibleTabs = TABS.filter((tab) =>
    hasAnyPermission(currentUser?.permissions, tab.requiredPermissions),
  );
  const tabs = visibleTabs.length > 0 ? visibleTabs : [TABS[0]];

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border-subtle px-4 sm:px-6"
      aria-label="Onglets client"
    >
      {tabs.map((tab) => {
        const fullHref = `${basePath}/${tab.href}`;
        const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);

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
