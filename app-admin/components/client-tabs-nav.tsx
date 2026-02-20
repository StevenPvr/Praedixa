"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@praedixa/ui";

interface Tab {
  label: string;
  href: string;
}

const TABS: Tab[] = [
  { label: "Vue client", href: "vue-client" },
  { label: "Donnees", href: "donnees" },
  { label: "Previsions", href: "previsions" },
  { label: "Alertes", href: "alertes" },
  { label: "Config", href: "config" },
  { label: "Equipe", href: "equipe" },
  { label: "Messages", href: "messages" },
];

interface ClientTabsNavProps {
  basePath: string;
}

export function ClientTabsNav({ basePath }: ClientTabsNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-1 border-b border-border-subtle px-6"
      aria-label="Onglets client"
    >
      {TABS.map((tab) => {
        const fullHref = `${basePath}/${tab.href}`;
        const isActive = pathname === fullHref;

        return (
          <Link
            key={tab.href}
            href={fullHref}
            className={cn(
              "relative px-3 py-2.5 text-sm transition-colors",
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
