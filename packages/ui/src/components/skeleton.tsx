import * as React from "react";
import { cn } from "../utils/cn.js";

/* ── Base skeleton bar — pearl iridescent shimmer ── */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  /** Use pearl (iridescent) shimmer instead of standard */
  pearl?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, width, pearl = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-sm,6px)]",
        pearl ? "animate-shimmer-pearl" : "animate-shimmer",
        width,
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  ),
);
Skeleton.displayName = "Skeleton";

/* ── SkeletonCard — matches StatCard layout ── */

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Use pearl shimmer for premium feel */
  pearl?: boolean;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ className, pearl = false, ...props }, ref) => {
    const shimmerClass = pearl ? "animate-shimmer-pearl" : "animate-shimmer";
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-[var(--radius-lg,14px)] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-raised)]",
          className,
        )}
        aria-busy="true"
        role="status"
        aria-label="Chargement"
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-1.5 w-1.5 rounded-full", shimmerClass)} />
            <div
              className={cn(
                "h-3 w-20 rounded-[var(--radius-xs,4px)]",
                shimmerClass,
              )}
            />
          </div>
          <div
            className={cn(
              "h-10 w-10 rounded-[var(--radius-md,10px)]",
              shimmerClass,
            )}
          />
        </div>
        <div className="mt-3 flex items-baseline gap-2.5">
          <div
            className={cn(
              "h-7 w-16 rounded-[var(--radius-sm,6px)]",
              shimmerClass,
            )}
          />
          <div
            className={cn(
              "h-4 w-12 rounded-[var(--radius-xs,4px)]",
              shimmerClass,
            )}
          />
        </div>
      </div>
    );
  },
);
SkeletonCard.displayName = "SkeletonCard";

/* ── SkeletonMetricRow — grid of 4 metric cards ── */

export interface SkeletonMetricRowProps extends React.HTMLAttributes<HTMLDivElement> {
  count?: number;
}

const SkeletonMetricRow = React.forwardRef<
  HTMLDivElement,
  SkeletonMetricRowProps
>(({ className, count = 4, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-4", className)}
    aria-busy="true"
    role="status"
    aria-label="Chargement des indicateurs"
    {...props}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} pearl />
    ))}
  </div>
));
SkeletonMetricRow.displayName = "SkeletonMetricRow";

/* ── SkeletonTable — matches DataTable layout ── */

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
}

const SkeletonTable = React.forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ className, rows = 5, columns = 4, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg,14px)] border border-[var(--border)] bg-[var(--card-bg)]",
        className,
      )}
      aria-busy="true"
      role="status"
      aria-label="Chargement du tableau"
      {...props}
    >
      {/* Header row */}
      <div className="flex gap-4 border-b border-[var(--border)] bg-[var(--surface-sunken)] px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`head-${i}`} className="h-3 flex-1" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="flex gap-4 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className={cn(
                "h-4 flex-1",
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

/* ── SkeletonChart — matches chart container ── */

export interface SkeletonChartProps extends React.HTMLAttributes<HTMLDivElement> {}

const SkeletonChart = React.forwardRef<HTMLDivElement, SkeletonChartProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-lg,14px)] border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--shadow-raised)]",
        className,
      )}
      aria-busy="true"
      role="status"
      aria-label="Chargement du graphique"
      {...props}
    >
      <div className="space-y-2">
        <Skeleton pearl className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>
      <div className="mt-4 aspect-[4/3] w-full sm:aspect-[16/9]">
        <div className="flex h-full flex-col justify-end gap-1 rounded-[var(--radius-md,10px)] bg-[var(--surface-sunken)] p-4">
          <div className="flex items-end gap-2">
            <div className="h-[30%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[55%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[40%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[70%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[45%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[60%] flex-1 animate-shimmer-pearl rounded-xs" />
            <div className="h-[35%] flex-1 animate-shimmer-pearl rounded-xs" />
          </div>
          <Skeleton className="mt-2 h-2 w-full" />
        </div>
      </div>
    </div>
  ),
);
SkeletonChart.displayName = "SkeletonChart";

export {
  Skeleton,
  SkeletonCard,
  SkeletonMetricRow,
  SkeletonTable,
  SkeletonChart,
};
