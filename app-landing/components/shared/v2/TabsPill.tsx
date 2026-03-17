"use client";

import { useCallback, useRef } from "react";
import { cn } from "../../../lib/utils";

interface TabsPillProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
  className?: string;
}

export function TabsPill({
  tabs,
  activeIndex,
  onChange,
  className,
}: TabsPillProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback(
    (index: number) => {
      onChange(index);
    },
    [onChange],
  );

  return (
    <div
      ref={containerRef}
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 overflow-x-auto rounded-full bg-surface-100 p-1",
        "scrollbar-none",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleSelect(index)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out-expo",
              isActive
                ? "bg-ink-950 text-white shadow-1"
                : "text-ink-700 hover:bg-surface-75",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
