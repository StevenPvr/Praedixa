"use client";

import type { Dictionary } from "@/lib/i18n/types";
import type { DemoViewId } from "@/lib/demo/types";

interface DemoSidebarProps {
  activeView: DemoViewId;
  onSelect: (view: DemoViewId) => void;
  labels: Dictionary["demo"]["nav"];
}

const NAV_ORDER: DemoViewId[] = [
  "dashboard",
  "forecasts",
  "actions",
  "datasets",
  "settings",
];

export function DemoSidebar({
  activeView,
  onSelect,
  labels,
}: DemoSidebarProps) {
  const navLabelMap: Record<DemoViewId, string> = {
    dashboard: labels.dashboard,
    forecasts: labels.forecasts,
    actions: labels.actions,
    datasets: labels.datasets,
    settings: labels.settings,
  };

  return (
    <aside className="w-full border-b border-white/10 bg-white/[0.03] px-3 py-3 lg:w-64 lg:border-b-0 lg:border-r lg:px-4 lg:py-5">
      <nav
        aria-label="Demo navigation"
        className="flex gap-2 overflow-x-auto lg:flex-col"
      >
        {NAV_ORDER.map((item) => {
          const isActive = item === activeView;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onSelect(item)}
              className={`inline-flex min-w-max items-center rounded-md border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-blue-300/60 bg-blue-400/20 text-white"
                  : "border-white/10 bg-white/[0.04] text-white/75 hover:border-blue-200/35 hover:text-white"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {navLabelMap[item]}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
