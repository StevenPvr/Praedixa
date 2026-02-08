// Pill-style tab bar for section navigation
import * as React from "react";
import { cn } from "../utils/cn";

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
    return (
      <div
        ref={ref}
        className={cn("flex gap-2", className)}
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
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              )}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-500",
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
