// Stat card component for dashboard KPIs
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const statCardVariants = cva(
  "rounded-card border p-5 transition-shadow duration-200 hover:shadow-card-hover",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-card shadow-card",
        accent: "border-amber-200 bg-amber-50 shadow-card",
        success: "border-success-100 bg-success-50 shadow-card",
        danger: "border-danger-100 bg-danger-50 shadow-card",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type TrendDirection = "up" | "down" | "flat";

export interface StatCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  /** The KPI value (e.g. "1,234" or "87%") */
  value: string;
  /** Short label for the metric */
  label: string;
  /** Trend percentage (e.g. "+12.5%") */
  trend?: string;
  /** Trend direction for color coding */
  trendDirection?: TrendDirection;
  /** Optional icon to display */
  icon?: React.ReactNode;
}

const trendColors: Record<TrendDirection, string> = {
  up: "text-success-600",
  down: "text-danger-600",
  flat: "text-gray-500",
};

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === "flat") {
    return (
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M2 7h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      className={cn("h-3.5 w-3.5", direction === "down" && "rotate-180")}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 2.5v9M7 2.5L3.5 6M7 2.5L10.5 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant,
      value,
      label,
      trend,
      trendDirection = "flat",
      icon,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(statCardVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-serif text-3xl font-semibold tracking-tight text-charcoal">
            {value}
          </p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-sm font-medium",
                trendColors[trendDirection],
              )}
            >
              <TrendArrow direction={trendDirection} />
              {trend}
            </span>
          )}
        </div>
      </div>
    );
  },
);

StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };
