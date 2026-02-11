"use client";

import { TrendingUp } from "lucide-react";

interface FeatureImportanceBarProps {
  features: { label: string; value: number }[];
  loading: boolean;
}

function SkeletonBar() {
  return (
    <div className="space-y-2" data-testid="skeleton-bar">
      <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
      <div className="h-2.5 w-full animate-pulse rounded-full bg-gray-100" />
    </div>
  );
}

export function FeatureImportanceBar({
  features,
  loading,
}: FeatureImportanceBarProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBar key={i} />
        ))}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <div
        className="rounded-2xl border border-dashed border-black/[0.12] bg-black/[0.02] px-4 py-8 text-center"
        data-testid="empty-features"
      >
        <p className="text-sm text-ink-secondary">
          Aucun facteur explicatif exploitable pour le moment.
        </p>
      </div>
    );
  }

  const maxValue = Math.max(...features.map((f) => f.value));
  const displayed = features.slice(0, 6);

  return (
    <div className="space-y-4">
      {displayed.map((feature, idx) => {
        const ratio = maxValue > 0 ? feature.value / maxValue : 0;

        return (
          <div
            key={feature.label}
            className="rounded-xl border border-black/[0.06] bg-white/[0.7] px-3 py-2.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/[0.1] text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-ink">
                  {feature.label}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-secondary">
                <TrendingUp className="h-3.5 w-3.5" />
                {Math.round(feature.value)}%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
                style={{ width: `${Math.max(ratio * 100, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
