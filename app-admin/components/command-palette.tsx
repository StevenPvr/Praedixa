"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Home,
  Building2,
  Bell,
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
import {
  ADMIN_GLOBAL_NAV_ITEMS,
  canAccessPath,
  CLIENT_WORKSPACE_TABS,
  resolveWorkspaceBasePath,
} from "@/lib/auth/route-access";

interface CommandItem {
  id: string;
  label: string;
  section: "global" | "workspace";
  href: string;
  icon: LucideIcon;
  keywords: string[];
  shortcut?: string;
}

const GLOBAL_COMMAND_ICONS: Record<string, LucideIcon> = {
  home: Home,
  clients: Building2,
  contact: Mail,
  journal: BookOpen,
  settings: Settings,
};

const GLOBAL_COMMAND_ITEMS: CommandItem[] = ADMIN_GLOBAL_NAV_ITEMS.map(
  (item) => ({
    id: item.id,
    label: item.label === "Accueil" ? "Accueil admin" : item.label,
    section: "global",
    href: item.href,
    icon: GLOBAL_COMMAND_ICONS[item.icon] ?? Home,
    keywords: [...item.keywords],
    shortcut: item.shortcut,
  }),
);

const WORKSPACE_ICONS: Record<string, LucideIcon> = {
  actions: Zap,
  alerts: Bell,
  "client-overview": LayoutDashboard,
  dashboard: LayoutDashboard,
  data: Database,
  forecasts: TrendingUp,
  messages: MessageSquare,
  onboarding: ClipboardCheck,
  reports: BarChart3,
  settings: Settings,
  team: Users,
};

export { resolveWorkspaceBasePath } from "@/lib/auth/route-access";

export function buildWorkspaceCommandItems(pathname: string): CommandItem[] {
  const basePath = resolveWorkspaceBasePath(pathname);
  if (!basePath) {
    return [];
  }

  return CLIENT_WORKSPACE_TABS.map((tab) => ({
    id: `workspace-${tab.href}`,
    label: `Workspace • ${tab.label}`,
    section: "workspace" as const,
    href: `${basePath}/${tab.href}`,
    icon: WORKSPACE_ICONS[tab.icon] ?? LayoutDashboard,
    keywords: [...tab.keywords],
  }));
}

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
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const commandItems = React.useMemo(
    () => [...GLOBAL_COMMAND_ITEMS, ...buildWorkspaceCommandItems(pathname)],
    [pathname],
  );
  const availableItems = React.useMemo(
    () =>
      permissions == null
        ? commandItems
        : commandItems.filter((item) => canAccessPath(item.href, permissions)),
    [commandItems, permissions],
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
    setSelectedIndex((prev) =>
      Math.min(prev, Math.max(0, filtered.length - 1)),
    );
  }, [filtered.length]);

  React.useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
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
                      {item.section === "global"
                        ? "Back-office"
                        : "Workspace client"}
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
