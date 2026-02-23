"use client";

import { useRef, useCallback, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    ref.current?.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    ref.current?.style.setProperty("--my", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={ref}
      className={cn("spotlight-card", className)}
      onMouseMove={handleMouseMove}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-[oklch(1_0_0/0.1)] shadow-[inset_0_1px_2px_oklch(1_0_0/0.06)]"
      />
      {children}
    </div>
  );
}
