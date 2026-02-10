// Stat card component for dashboard KPIs
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

const statCardVariants = cva(
  "rounded-2xl border p-5 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-card shadow-soft",
        accent:
          "border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-100/50 shadow-soft",
        success: "border-success-100 bg-success-50 shadow-soft",
        warning: "border-amber-200 bg-amber-50 shadow-soft",
        danger: "border-danger-100 bg-danger-50 shadow-soft",
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

const iconBgByVariant: Record<string, string> = {
  default: "bg-amber-50/50 text-gray-400",
  accent: "bg-amber-100/60 text-amber-600",
  success: "bg-success-50 text-success-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-danger-50 text-danger-600",
};

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
    const resolvedVariant = variant ?? "default";

    return (
      <div
        ref={ref}
        className={cn(statCardVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          {icon && (
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                iconBgByVariant[resolvedVariant],
              )}
            >
              {icon}
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="font-serif text-3xl font-semibold tabular-nums tracking-tight text-charcoal">
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
