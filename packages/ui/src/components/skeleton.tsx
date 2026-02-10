// Skeleton loading placeholders for dashboard components
import * as React from "react";
import { cn } from "../utils/cn";

/* ────────────────────────────────────────────── */
/*  Base skeleton bar                             */
/* ────────────────────────────────────────────── */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width override (Tailwind class or inline) */
  width?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("animate-shimmer rounded-md", width, className)}
      aria-hidden="true"
      {...props}
    />
  ),
);
Skeleton.displayName = "Skeleton";

/* ────────────────────────────────────────────── */
/*  SkeletonCard — matches StatCard layout        */
/* ────────────────────────────────────────────── */

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-gray-200 bg-card p-5 shadow-card",
        className,
      )}
      aria-busy="true"
      role="status"
      aria-label="Chargement"
      {...props}
    >
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3.5 w-32" />
      </div>
    </div>
  ),
);
SkeletonCard.displayName = "SkeletonCard";

/* ────────────────────────────────────────────── */
/*  SkeletonTable — matches DataTable layout      */
/* ────────────────────────────────────────────── */

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of visible rows (default 5) */
  rows?: number;
  /** Number of columns (default 4) */
  columns?: number;
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-card border border-gray-200 bg-card",
        className,
      )}
      aria-busy="true"
      role="status"
      aria-label="Chargement du tableau"
      {...props}
    >
      {/* Header row */}
      <div className="flex gap-4 border-b border-gray-200 bg-amber-50/30 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`head-${i}`} className="h-3 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 border-b border-gray-100 px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                "h-4 flex-1",
                // Vary widths for visual interest
                colIndex === 0 && "max-w-[140px]",
                colIndex === columns - 1 && "max-w-[80px]",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  ),
);
SkeletonTable.displayName = "SkeletonTable";

/* ────────────────────────────────────────────── */
/*  SkeletonChart — matches chart container       */
/* ────────────────────────────────────────────── */

export interface SkeletonChartProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonChart = React.forwardRef<HTMLDivElement, SkeletonChartProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-card border border-gray-200 bg-card p-5 shadow-card",
        className,
      )}
      aria-busy="true"
      role="status"
      aria-label="Chargement du graphique"
      {...props}
    >
      {/* Chart title placeholder */}
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      {/* Chart area — aspect ratio: 16:9 desktop, 4:3 mobile */}
      <div className="mt-4 aspect-[4/3] w-full sm:aspect-[16/9]">
        <div className="flex h-full animate-shimmer flex-col justify-end gap-1 rounded-lg bg-gray-50 p-4">
          {/* Fake bar chart lines */}
          <div className="flex items-end gap-2">
            <div className="h-[30%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[55%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[40%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[70%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[45%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[60%] flex-1 rounded-sm bg-gray-200" />
            <div className="h-[35%] flex-1 rounded-sm bg-gray-200" />
          </div>
          {/* Fake x-axis */}
          <Skeleton className="mt-2 h-2 w-full" />
        </div>
      </div>
    </div>
  ),
);
SkeletonChart.displayName = "SkeletonChart";

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonChart };
