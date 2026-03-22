"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@praedixa/ui";
import {
  type CommandItem,
  useCommandPaletteItems,
} from "./command-palette-model";

export {
  buildWorkspaceCommandItems,
  resolveWorkspaceBasePath,
} from "./command-palette-model";
export { useCommandPalette } from "./command-palette-model";

type CommandPaletteProps = Readonly<{
  open: boolean;
  onClose: () => void;
  permissions?: readonly string[] | null;
}>;

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
  const filtered = useCommandPaletteItems({
    pathname,
    query,
    permissions,
  });

  React.useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      const timer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  React.useEffect(() => {
    if (open) {
      setSelectedIndex((prev) =>
        Math.min(prev, Math.max(0, filtered.length - 1)),
      );
    }
  }, [filtered.length, open]);

  React.useEffect(() => {
    if (open) {
      const active = listRef.current?.querySelector<HTMLElement>(
        '[data-active="true"]',
      );
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [open, selectedIndex]);

  const runCommand = React.useCallback(
    (item: CommandItem) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router],
  );

  const hasResults = filtered.length > 0;
  const commandItems = filtered.map((item, index) => {
    const Icon = item.icon;
    const selected = index === selectedIndex;
    const sectionLabel =
      item.section === "global" ? "Back-office" : "Workspace client";
    const shortcutBadge = item.shortcut ? (
      <span className="rounded border border-border bg-surface px-1.5 py-px text-[10px] font-semibold text-ink-secondary">
        {item.shortcut}
      </span>
    ) : null;

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
          <p className="text-xs text-ink-tertiary">{sectionLabel}</p>
        </div>
        {shortcutBadge}
      </button>
    );
  });
  const resultsContent = hasResults ? (
    commandItems
  ) : (
    <div className="px-3 py-6 text-center text-sm text-ink-tertiary">
      Aucun resultat
    </div>
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

  if (open) {
    return (
      <>
        <button
          aria-label="Fermer la palette de commandes"
          className="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[12px]"
          onClick={onClose}
        />
        <dialog
          open
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
            {resultsContent}
          </div>
        </dialog>
      </>
    );
  }

  return null;
}
