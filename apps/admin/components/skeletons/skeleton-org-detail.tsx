"use client";

import { Skeleton } from "@praedixa/ui";

export function SkeletonOrgDetail() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      role="status"
      aria-label="Chargement des details de l'organisation"
    >
      {/* Header: name + status badge */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Detail card — 6 fields in 2-col grid */}
      <div className="rounded-card border border-gray-200 bg-card p-6 shadow-card">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`field-${i}`} className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      {/* Hierarchy tree — 3 levels */}
      <div className="rounded-card border border-gray-200 bg-card p-6 shadow-card">
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="space-y-3">
          {/* Level 1 — org */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-40" />
          </div>
          {/* Level 2 — sites */}
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={`site-${s}`} className="ml-6 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-32" />
              </div>
              {/* Level 3 — departments */}
              {Array.from({ length: 3 }).map((_, d) => (
                <div
                  key={`dept-${s}-${d}`}
                  className="ml-6 flex items-center gap-3"
                >
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
