"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Database,
  TrendingUp,
  Zap,
  MessageSquare,
  FileBarChart,
  Settings,
  ArrowRight,
  Clock,
  Command,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@praedixa/ui";
import { useCurrentUser } from "@/lib/auth/client";
import { canAccessSettings } from "@/lib/auth/roles";
import { useI18n } from "@/lib/i18n/provider";
import { EASING, DURATION } from "@/lib/animations/config";

/* ── Types ── */

interface CommandItem {
  id: string;
  labelKey: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  section: string;
  keywords?: string[];
  shortcut?: string;
  adminOnly?: boolean;
}

/* ── Navigation items ── */

const NAV_ITEMS: Omit<CommandItem, "label" | "description" | "section">[] = [
  {
    id: "dashboard",
    labelKey: "sidebar.items.dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    keywords: ["war", "room", "accueil", "pilotage"],
    shortcut: "G D",
  },
  {
    id: "donnees-sites",
    labelKey: "sidebar.items.donneesSites",
    icon: Database,
    href: "/donnees",
    keywords: ["data", "referentiel", "qualite"],
    shortcut: "G O",
  },
  {
    id: "donnees-datasets",
    labelKey: "sidebar.items.donneesDatasets",
    icon: Database,
    href: "/donnees/datasets",
    keywords: ["dataset", "imports", "fichiers"],
    shortcut: "G I",
  },
  {
    id: "donnees-canonique",
    labelKey: "sidebar.items.donneesCanonique",
    icon: Database,
    href: "/donnees/canonique",
    keywords: ["canonique", "consolide", "qualite"],
    shortcut: "G C",
  },
  {
    id: "previsions-vue",
    labelKey: "sidebar.items.previsionsVue",
    icon: TrendingUp,
    href: "/previsions",
    keywords: ["forecast", "anticipation", "prevision"],
    shortcut: "G P",
  },
  {
    id: "previsions-alertes",
    labelKey: "sidebar.items.previsionsAlertes",
    icon: TrendingUp,
    href: "/previsions/alertes",
    keywords: ["alertes", "risque", "sous effectif"],
    shortcut: "G L",
  },
  {
    id: "actions-traitement",
    labelKey: "sidebar.items.actionsTraitement",
    icon: Zap,
    href: "/actions",
    keywords: ["traitement", "decision", "alerte"],
    shortcut: "G A",
  },
  {
    id: "actions-historique",
    labelKey: "sidebar.items.actionsHistorique",
    icon: Zap,
    href: "/actions/historique",
    keywords: ["historique", "decisions", "archive"],
    shortcut: "G H",
  },
  {
    id: "messages",
    labelKey: "sidebar.items.messages",
    icon: MessageSquare,
    href: "/messages",
    keywords: ["support", "conversation", "chat"],
    shortcut: "G M",
  },
  {
    id: "rapports",
    labelKey: "sidebar.items.rapports",
    icon: FileBarChart,
    href: "/rapports",
    keywords: ["report", "export", "executive"],
    shortcut: "G R",
  },
  {
    id: "parametres",
    labelKey: "sidebar.items.parametres",
    icon: Settings,
    href: "/parametres",
    keywords: ["settings", "configuration", "seuil"],
    shortcut: "G S",
    adminOnly: true,
  },
];

/* ── Hook ── */

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

/* ── Component ── */

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { t } = useI18n();
  const currentUser = useCurrentUser();
  const canManageSettings = canAccessSettings(currentUser?.role);
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const allItems = React.useMemo<CommandItem[]>(() => {
    const navSection = t("commandPalette.sections.navigation");
    return NAV_ITEMS.filter((item) => !item.adminOnly || canManageSettings).map(
      (item) => ({
        ...item,
        label: t(item.labelKey),
        description: item.href,
        section: navSection,
      }),
    );
  }, [canManageSettings, t]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((kw) => kw.includes(q)),
    );
  }, [allItems, query]);

  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || !dialogRef.current) return;
    const dialog = dialogRef.current;

    const getFocusables = (): HTMLElement[] =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'input, button, [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el: HTMLElement) => !el.hasAttribute("aria-hidden"));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    setSelectedIndex((prev) =>
      Math.min(prev, Math.max(0, filtered.length - 1)),
    );
  }, [filtered.length]);

  React.useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      '[data-active="true"]',
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const executeItem = React.useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.href) {
        router.push(item.href);
      } else if (item.action) {
        item.action();
      }
    },
    [onClose, router],
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filtered[selectedIndex]) executeItem(filtered[selectedIndex]);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filtered, selectedIndex, executeItem, onClose],
  );

  const highlightMatch = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-primary">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[20px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("commandPalette.label")}
            initial={{ opacity: 0, scale: 0.92, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.92, filter: "blur(4px)" }}
            transition={{ duration: DURATION.normal, ease: EASING.premium }}
            className={cn(
              "fixed left-1/2 top-[16%] z-50 w-full max-w-[560px] -translate-x-1/2",
              "overflow-hidden rounded-xl surface-glass shadow-modal",
            )}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <Search
                className="h-5 w-5 shrink-0 text-ink-tertiary"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("commandPalette.placeholder")}
                aria-label={t("commandPalette.label")}
                className="flex-1 bg-transparent text-body text-ink placeholder-ink-placeholder outline-none transition-shadow duration-fast focus:shadow-[0_0_0_3px_var(--glow-brand)]"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden rounded-[var(--radius-xs)] border border-border bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold text-ink-tertiary sm:inline">
                ESC
              </kbd>
            </div>

            {/* Quick actions when empty */}
            {!query.trim() && (
              <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-2.5">
                <Clock className="h-3 w-3 text-ink-placeholder" />
                <span className="text-caption text-ink-placeholder">
                  Actions recentes
                </span>
              </div>
            )}

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[340px] overflow-y-auto overscroll-contain px-2 py-2"
              role="listbox"
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Search className="h-8 w-8 text-ink-placeholder/50" />
                  <p className="text-body-sm text-ink-secondary">
                    {t("commandPalette.noResults")}
                  </p>
                </div>
              ) : (
                <>
                  <p className="mb-1 px-3 text-overline text-ink-placeholder">
                    {filtered[0]?.section}
                  </p>

                  {filtered.map((item, idx) => {
                    const Icon = item.icon;
                    const isActive = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        role="option"
                        aria-selected={isActive}
                        data-active={isActive}
                        onClick={() => executeItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-instant",
                          isActive
                            ? "bg-[var(--glass-bg)] backdrop-blur-md text-ink"
                            : "text-ink-secondary hover:bg-[var(--glass-bg)] hover:backdrop-blur-sm",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-instant",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "bg-surface-sunken text-ink-tertiary",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-body-sm font-medium">
                          {highlightMatch(item.label)}
                        </span>
                        {item.shortcut && (
                          <span className="hidden gap-0.5 sm:flex">
                            {item.shortcut.split(" ").map((key, ki) => (
                              <kbd
                                key={ki}
                                className="rounded-[var(--radius-xs)] border border-border bg-surface-sunken px-1.5 py-px text-[10px] font-medium text-ink-placeholder"
                              >
                                {key}
                              </kbd>
                            ))}
                          </span>
                        )}
                        {isActive && !item.shortcut && (
                          <ArrowRight className="h-3.5 w-3.5 text-ink-placeholder" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-4 border-t border-border px-5 py-2.5 text-caption text-ink-placeholder">
              <span className="flex items-center gap-1">
                <kbd className="rounded-[var(--radius-xs)] border border-border bg-surface-sunken px-1 py-px font-mono text-[10px]">
                  ↑↓
                </kbd>
                {t("commandPalette.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded-[var(--radius-xs)] border border-border bg-surface-sunken px-1 py-px font-mono text-[10px]">
                  ↵
                </kbd>
                {t("commandPalette.select")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded-[var(--radius-xs)] border border-border bg-surface-sunken px-1 py-px font-mono text-[10px]">
                  esc
                </kbd>
                {t("commandPalette.close")}
              </span>
              <span className="ml-auto flex items-center gap-1 text-[10px]">
                <Command className="h-3 w-3" />
                Praedixa
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
