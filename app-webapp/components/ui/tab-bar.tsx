"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { SPRING } from "@/lib/animations/config";

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
          "inline-flex flex-wrap gap-1 rounded-xl border border-border bg-surface-sunken p-1",
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
                "relative inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-body-sm font-medium",
                "transition-colors duration-fast",
                isActive
                  ? "text-ink"
                  : "text-ink-tertiary hover:text-ink-secondary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={handleKeyDown}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-lg bg-card shadow-raised"
                  transition={SPRING.premium}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "relative z-10 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-border/60 text-ink-placeholder",
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
