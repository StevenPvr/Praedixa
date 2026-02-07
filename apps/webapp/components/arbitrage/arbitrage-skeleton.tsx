import { Skeleton } from "@praedixa/ui";

/**
 * Full-page skeleton for the arbitrage detail page.
 * Mirrors the layout of ArbitrageContext + OptionsComparison.
 */
export function ArbitrageSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Chargement des options d'arbitrage"
    >
      {/* ── Context card skeleton (matches ArbitrageContext) ── */}
      <div className="rounded-card border border-gray-200 bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>

      {/* ── 4 option cards in 2x2 grid (matches OptionsComparison) ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <OptionCardSkeleton key={`opt-skel-${i}`} />
        ))}
      </div>
    </div>
  );
}

/**
 * Single option card skeleton — matches the OptionCard layout:
 * header (icon + label + badge) -> cost -> metrics -> risk details -> pros/cons -> button
 */
function OptionCardSkeleton() {
  return (
    <div
      className="flex flex-col rounded-card border border-gray-200 bg-card p-5 shadow-card"
      role="status"
      aria-label="Chargement"
    >
      {/* Header: icon + label + recommended badge */}
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>

      {/* Cost KPI */}
      <div className="mt-4">
        <Skeleton className="h-7 w-24" />
      </div>

      {/* Metrics row */}
      <div className="mt-4 flex gap-4">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>

      {/* Risk details */}
      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>

      {/* Pros / Cons columns */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      </div>

      {/* Action button */}
      <div className="mt-auto pt-5">
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  );
}
