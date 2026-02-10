"use client";

interface FeatureImportanceBarProps {
  features: { label: string; value: number }[];
  loading: boolean;
}

function SkeletonBar() {
  return (
    <div className="flex items-center gap-3" data-testid="skeleton-bar">
      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      <div className="h-5 flex-1 animate-pulse rounded-full bg-gray-100" />
      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

export function FeatureImportanceBar({
  features,
  loading,
}: FeatureImportanceBarProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBar key={i} />
        ))}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <p className="text-sm text-gray-400" data-testid="empty-features">
        Aucun facteur identifie
      </p>
    );
  }

  const maxValue = Math.max(...features.map((f) => f.value));
  const displayed = features.slice(0, 6);

  return (
    <div className="space-y-3">
      {displayed.map((feature) => (
        <div key={feature.label} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-sm text-gray-700">
            {feature.label}
          </span>
          <div className="flex-1">
            <div
              className="h-5 rounded-full bg-amber-400 transition-all"
              style={{
                width: `${maxValue > 0 ? (feature.value / maxValue) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-sm font-medium text-charcoal">
            {Math.round(feature.value)}%
          </span>
        </div>
      ))}
    </div>
  );
}
