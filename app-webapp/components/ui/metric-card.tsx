// Premium metric indicator card with animated values and status border
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { TrendIndicator } from "@/components/ui/trend-indicator";
import { useCountUp } from "@/hooks/use-count-up";
import { cardReveal } from "@/lib/animations/config";

export type MetricStatus = "good" | "warning" | "danger" | "neutral";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
  trend?: number;
  animate?: boolean;
  trendInverted?: boolean;
  icon?: React.ReactNode;
}

const statusDot: Record<MetricStatus, string> = {
  good: "bg-success shadow-[0_0_0_3px_var(--success-light)]",
  warning: "bg-warning shadow-[0_0_0_3px_var(--warning-light)]",
  danger:
    "bg-danger shadow-[0_0_0_3px_var(--danger-light)] animate-glow-breath",
  neutral: "bg-border",
};

const statusIconBg: Record<MetricStatus, string> = {
  good: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  neutral: "bg-primary-light text-primary",
};

function AnimatedValue({
  value,
  unit,
}: {
  value: string | number;
  unit?: string;
}) {
  const isNumeric = typeof value === "number" && !isNaN(value);
  const animated = useCountUp(isNumeric ? value : 0, {
    duration: 700,
    decimals: typeof value === "number" && value % 1 !== 0 ? 1 : 0,
    enabled: isNumeric,
  });

  return (
    <span className="font-sans text-metric-sm font-bold tabular-nums text-ink">
      {isNumeric ? animated : value}
      {unit && (
        <span className="ml-0.5 font-sans text-body-sm font-medium text-ink-secondary">
          {unit}
        </span>
      )}
    </span>
  );
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      label,
      value,
      unit,
      status = "neutral",
      trend,
      animate = false,
      trendInverted = false,
      icon,
      className,
    },
    ref,
  ) => {
    return (
      <motion.div
        ref={ref}
        variants={cardReveal}
        initial="hidden"
        animate="visible"
        className={cn(
          "relative overflow-hidden rounded-lg border border-border",
          "bg-card px-7 py-6 shadow-raised transition-shadow duration-fast hover:shadow-card-hover",
          className,
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  statusDot[status],
                )}
                aria-hidden="true"
              />
              <span className="text-overline text-ink-tertiary">{label}</span>
            </div>
            <div className="flex items-baseline gap-2.5">
              {animate ? (
                <AnimatedValue value={value} unit={unit} />
              ) : (
                <span className="font-sans text-metric-sm font-bold tabular-nums text-ink">
                  {value}
                  {unit && (
                    <span className="ml-0.5 font-sans text-body-sm font-medium text-ink-secondary">
                      {unit}
                    </span>
                  )}
                </span>
              )}
              {trend !== undefined && (
                <TrendIndicator value={trend} inverted={trendInverted} />
              )}
            </div>
          </div>

          {icon && (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                statusIconBg[status],
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </motion.div>
    );
  },
);

MetricCard.displayName = "MetricCard";

export { MetricCard, statusDot as statusDotColor };
