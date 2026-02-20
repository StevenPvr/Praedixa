"use client";

import { Skeleton, SkeletonCard, SkeletonChart } from "@praedixa/ui";

export function SkeletonAdminDashboard() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      role="status"
      aria-label="Chargement du tableau de bord"
    >
      {/* KPI row — 4 stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={`kpi-${i}`} />
        ))}
      </div>

      {/* Chart + error rate side by side */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkeletonChart />
        </div>
        {/* Error rate card */}
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <Skeleton className="mb-4 h-5 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`err-${i}`} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-2.5 w-16" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent activity table */}
      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={`activity-${i}`}
              className="flex items-center gap-4 border-b border-border-subtle py-3 last:border-0"
            >
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3.5 flex-1 max-w-[200px]" />
              <Skeleton className="h-3.5 flex-1 max-w-[140px]" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
