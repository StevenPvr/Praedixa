"use client";

import { Skeleton, SkeletonTable } from "@praedixa/ui";

const FILTER_SKELETON_KEYS = ["filter-a", "filter-b", "filter-c"] as const;

export function SkeletonOrgList() {
  return (
    <output
      className="space-y-4"
      aria-busy="true"
      aria-label="Chargement de la liste des organisations"
      role="status"
    >
      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-sm rounded-lg" />

      {/* Filter row */}
      <div className="flex gap-2">
        {FILTER_SKELETON_KEYS.map((key) => (
          <Skeleton key={key} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      {/* Table */}
      <SkeletonTable rows={8} columns={7} />
    </output>
  );
}
