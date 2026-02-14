"use client";

import { cn } from "@praedixa/ui";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn("animate-shimmer-pearl rounded-sm", className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border bg-card p-5 shadow-raised",
        className,
      )}
      aria-busy="true"
      role="status"
    >
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  const barHeights = [45, 62, 38, 75, 55, 68, 42, 80, 50, 65, 35, 70];
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-6 shadow-raised",
        className,
      )}
      aria-busy="true"
      role="status"
    >
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex h-44 items-end gap-2">
        {barHeights.map((h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonMetricRow({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
