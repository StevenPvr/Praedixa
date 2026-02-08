"use client";

import { Skeleton, SkeletonTable } from "@praedixa/ui";

export function SkeletonOrgList() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      role="status"
      aria-label="Chargement de la liste des organisations"
    >
      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />

      {/* Filter row */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={`filter-${i}`} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <SkeletonTable rows={8} columns={7} />
    </div>
  );
}
