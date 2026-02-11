import * as React from "react";
import { cn } from "@praedixa/ui";

export interface Tab {
  id: string;
  label: string;
  count?: number;
}

export interface TabBarProps extends React.HTMLAttributes<HTMLDivElement> {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabBar = React.forwardRef<HTMLDivElement, TabBarProps>(
  ({ tabs, activeTab, onTabChange, className, ...props }, ref) => {
    const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const currentIndex = activeIndex >= 0 ? activeIndex : 0;

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (tabs.length < 2) return;
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
      onTabChange(tabs[nextIndex].id);
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex flex-wrap gap-2 rounded-2xl border border-black/[0.06] bg-white/[0.70] p-1.5",
          className,
        )}
        role="tablist"
        {...props}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-amber-300 text-charcoal shadow-sm"
                  : "text-ink-secondary hover:bg-black/[0.05] hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={handleKeyDown}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive
                      ? "bg-black/[0.10] text-charcoal"
                      : "bg-black/[0.08] text-ink-secondary",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  },
);

TabBar.displayName = "TabBar";

export { TabBar };
