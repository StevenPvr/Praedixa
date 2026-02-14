"use client";

import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { staggerContainer, staggerItem } from "@/lib/animations/config";

interface FeatureImportanceBarProps {
  features: { label: string; value: number }[];
  loading: boolean;
}

function CountUpValue({ value }: { value: number }) {
  const animated = useCountUp(value, { duration: 600, decimals: 0 });
  return <span>{Math.round(animated)}</span>;
}

function SkeletonBar() {
  return (
    <div className="space-y-2" data-testid="skeleton-bar">
      <div className="h-4 w-32 animate-pulse rounded bg-border" />
      <div className="h-2.5 w-full animate-pulse rounded-full bg-border" />
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
        className="rounded-2xl border border-dashed border-border bg-surface-alt px-4 py-8 text-center"
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
    <motion.div
      className="space-y-4"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {displayed.map((feature, idx) => {
        const ratio = maxValue > 0 ? feature.value / maxValue : 0;

        return (
          <motion.div
            key={feature.label}
            variants={staggerItem}
            className="rounded-xl border border-border bg-surface px-3 py-2.5"
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
                <CountUpValue value={feature.value} />%
              </span>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--brand) 0%, var(--brand-300) 50%, var(--accent) 100%)",
                  width: `${Math.max(ratio * 100, 3)}%`,
                }}
                animate={{ width: `${Math.max(ratio * 100, 3)}%` }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 25,
                  delay: 0.2 + idx * 0.08,
                }}
              />
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
