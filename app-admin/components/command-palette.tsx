"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Building2,
  Mail,
  BookOpen,
  Settings,
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  BarChart3,
  ClipboardCheck,
  Users,
  MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@praedixa/ui";
import { canAccessPath } from "@/lib/auth/route-access";

interface CommandItem {
  id: string;
  label: string;
  section: "global" | "workspace";
  href: string;
  icon: LucideIcon;
  keywords: string[];
  shortcut?: string;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: "home",
    label: "Accueil admin",
    section: "global",
    href: "/",
    icon: Home,
    keywords: ["home", "accueil", "pilotage"],
    shortcut: "G H",
  },
  {
    id: "clients",
    label: "Clients",
    section: "global",
    href: "/clients",
    icon: Building2,
    keywords: ["organisations", "clients", "workspace"],
    shortcut: "G C",
  },
  {
    id: "contact",
    label: "Demandes contact",
    section: "global",
    href: "/demandes-contact",
    icon: Mail,
    keywords: ["contact", "leads", "messages"],
  },
  {
    id: "journal",
    label: "Journal",
    section: "global",
    href: "/journal",
    icon: BookOpen,
    keywords: ["audit", "rgpd", "journal"],
  },
  {
    id: "settings",
    label: "Parametres",
    section: "global",
    href: "/parametres",
    icon: Settings,
    keywords: ["config", "parametres", "onboarding"],
    shortcut: "G S",
  },
  {
    id: "workspace-dashboard",
    label: "Workspace • Tableau de bord",
    section: "workspace",
    href: "/clients",
    icon: LayoutDashboard,
    keywords: ["dashboard", "workspace", "miroir"],
  },
  {
    id: "workspace-donnees",
    label: "Workspace • Donnees",
    section: "workspace",
    href: "/clients",
    icon: Database,
    keywords: ["donnees", "canonical", "gold"],
  },
  {
    id: "workspace-previsions",
    label: "Workspace • Previsions",
    section: "workspace",
    href: "/clients",
    icon: TrendingUp,
    keywords: ["forecast", "previsions", "modeles"],
  },
  {
    id: "workspace-actions",
    label: "Workspace • Actions",
    section: "workspace",
    href: "/clients",
    icon: Zap,
    keywords: ["actions", "decisions", "traitement"],
  },
  {
    id: "workspace-rapports",
    label: "Workspace • Rapports",
    section: "workspace",
    href: "/clients",
    icon: BarChart3,
    keywords: ["rapports", "proof", "exports"],
  },
  {
    id: "workspace-onboarding",
    label: "Workspace • Onboarding",
    section: "workspace",
    href: "/clients",
    icon: ClipboardCheck,
    keywords: ["onboarding", "step", "readiness"],
  },
  {
    id: "workspace-equipe",
    label: "Workspace • Equipe",
    section: "workspace",
    href: "/clients",
    icon: Users,
    keywords: ["users", "roles", "equipe"],
  },
  {
    id: "workspace-messages",
    label: "Workspace • Messages",
    section: "workspace",
    href: "/clients",
    icon: MessageSquare,
    keywords: ["chat", "support", "messages"],
  },
];

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  permissions?: readonly string[] | null;
}

export function CommandPalette({
  open,
  onClose,
  permissions,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const availableItems = React.useMemo(
    () =>
      permissions == null
        ? COMMAND_ITEMS
        : COMMAND_ITEMS.filter((item) => canAccessPath(item.href, permissions)),
    [permissions],
  );

  const filtered = React.useMemo(() => {
    if (!query.trim()) return availableItems;
    const normalized = query.trim().toLowerCase();
    return availableItems.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.keywords.some((keyword) => keyword.includes(normalized)),
    );
  }, [availableItems, query]);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  React.useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [open, selectedIndex]);

  const runCommand = React.useCallback(
    (item: CommandItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const current = filtered[selectedIndex];
        if (current) runCommand(current);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [filtered, onClose, runCommand, selectedIndex],
  );

  if (!open) return null;

  return (
    <>
      <button
        aria-label="Fermer la palette de commandes"
        className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[12px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className={cn(
          "fixed left-1/2 top-[12%] z-[60] w-full max-w-[640px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-card shadow-modal",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4.5 w-4.5 text-ink-tertiary" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page admin ou workspace..."
            className="h-9 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-placeholder"
          />
          <kbd className="rounded border border-border bg-surface px-1.5 py-px text-[10px] font-semibold text-ink-secondary">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-ink-tertiary">
              Aucun resultat
            </div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              const selected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  data-active={selected}
                  className={cn(
                    "mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-fast",
                    selected
                      ? "bg-primary/10 text-ink"
                      : "text-ink-secondary hover:bg-surface-sunken hover:text-ink",
                  )}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => runCommand(item)}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-ink-tertiary">
                      {item.section === "global" ? "Back-office" : "Workspace client"}
                    </p>
                  </div>
                  {item.shortcut ? (
                    <span className="rounded border border-border bg-surface px-1.5 py-px text-[10px] font-semibold text-ink-secondary">
                      {item.shortcut}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
