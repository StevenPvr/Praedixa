import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../utils/cn";

/* ── Status types ── */
type MetricStatus = "good" | "warning" | "danger" | "neutral";
type TrendDirection = "up" | "down" | "flat";

/* ── Card variants ── */
const statCardVariants = cva(
  [
    "relative overflow-hidden rounded-[var(--radius-lg,14px)] border p-5",
    "transition-all duration-[var(--duration-fast,200ms)] ease-[var(--ease-snappy)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border-[var(--border)] bg-[var(--card-bg)] shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-card-hover,var(--shadow-floating))] hover:-translate-y-0.5",
        accent:
          "border-[var(--accent-100)] bg-gradient-to-br from-[var(--accent-50)] to-[var(--accent-100)] shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5",
        success:
          "border-[var(--success-light)] bg-[var(--success-light)] shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5",
        warning:
          "border-[var(--warning-light)] bg-[var(--warning-light)] shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5",
        danger:
          "border-[var(--danger-light)] bg-[var(--danger-light)] shadow-[var(--shadow-raised)] hover:shadow-[var(--shadow-floating)] hover:-translate-y-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/* ── Status-based left border ── */
const statusBorder: Record<MetricStatus, string> = {
  good: "border-l-[3px] border-l-[var(--success)]",
  warning: "border-l-[3px] border-l-[var(--warning)]",
  danger: "border-l-[3px] border-l-[var(--danger)]",
  neutral: "",
};

/* ── Status dot indicator ── */
const statusDotStyle: Record<MetricStatus, string> = {
  good: "bg-[var(--success)] shadow-[0_0_0_3px_var(--success-light)]",
  warning: "bg-[var(--warning)] shadow-[0_0_0_3px_var(--warning-light)]",
  danger: "bg-[var(--danger)] shadow-[0_0_0_3px_var(--danger-light)]",
  neutral: "bg-[var(--border)]",
};

/* ── Subtle background glow per status ── */
const statusGlowHover: Record<MetricStatus, string> = {
  good: "hover:shadow-[0_0_0_1px_var(--border),0_0_28px_-6px_var(--glow-success)]",
  warning:
    "hover:shadow-[0_0_0_1px_var(--border),0_0_28px_-6px_var(--glow-warning)]",
  danger:
    "hover:shadow-[0_0_0_1px_var(--border),0_0_28px_-6px_var(--glow-danger)]",
  neutral: "hover:shadow-[var(--shadow-card-hover,var(--shadow-floating))]",
};

/* ── Icon background ── */
type StatCardVariant = NonNullable<StatCardProps["variant"]>;

const iconBgByVariant: Record<StatCardVariant, string> = {
  default: "bg-[var(--brand-50)] text-[var(--brand)]",
  accent: "bg-[var(--accent-100)] text-[var(--accent-strong)]",
  success: "bg-[var(--success-light)] text-[var(--success)]",
  warning: "bg-[var(--warning-light)] text-[var(--warning)]",
  danger: "bg-[var(--danger-light)] text-[var(--danger)]",
};

const iconBgByStatus: Record<MetricStatus, string> = {
  good: "bg-[var(--success-light)] text-[var(--success)]",
  warning: "bg-[var(--warning-light)] text-[var(--warning)]",
  danger: "bg-[var(--danger-light)] text-[var(--danger)]",
  neutral: "bg-[var(--brand-50)] text-[var(--brand)]",
};

/* ── Trend colors ── */
const trendColors: Record<TrendDirection, string> = {
  up: "text-[var(--success-text)]",
  down: "text-[var(--danger-text)]",
  flat: "text-[var(--ink-tertiary)]",
};

/* ── Trend arrow SVG ── */
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

/* ── Props ── */
export interface StatCardProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  value: string;
  label: string;
  /** Optional unit displayed after value */
  unit?: string;
  trend?: string;
  trendDirection?: TrendDirection;
  /** Numeric trend for TrendIndicator-style display */
  trendValue?: number;
  /** If true, "down" is good (e.g. fewer alerts) */
  trendInverted?: boolean;
  icon?: React.ReactNode;
  /** Status-based left border and glow (overrides variant for visual cues) */
  status?: MetricStatus;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      variant,
      value,
      label,
      unit,
      trend,
      trendDirection = "flat",
      trendValue,
      trendInverted = false,
      icon,
      status,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant = variant ?? "default";

    /* Determine trend direction from numeric value if provided */
    let resolvedTrendDirection = trendDirection;
    if (trendValue !== undefined) {
      resolvedTrendDirection =
        trendValue > 0 ? "up" : trendValue < 0 ? "down" : "flat";
    }

    /* Invert trend color meaning if trendInverted */
    let trendColorDirection = resolvedTrendDirection;
    if (trendInverted) {
      trendColorDirection =
        resolvedTrendDirection === "up"
          ? "down"
          : resolvedTrendDirection === "down"
            ? "up"
            : "flat";
    }

    const trendDisplay =
      trendValue !== undefined
        ? `${trendValue > 0 ? "+" : ""}${trendValue.toFixed(1)}%`
        : trend;

    return (
      <div
        ref={ref}
        className={cn(
          statCardVariants({ variant }),
          status && statusBorder[status],
          status && statusGlowHover[status],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            {/* Label row with optional status dot */}
            <div className="flex items-center gap-2">
              {status && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    statusDotStyle[status],
                  )}
                  aria-hidden="true"
                />
              )}
              <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-[var(--ink-tertiary)]">
                {label}
              </p>
            </div>

            {/* Value + trend */}
            <div className="flex items-baseline gap-2">
              <p className="font-serif text-[1.5rem] font-semibold tabular-nums leading-tight tracking-tight text-[var(--ink)]">
                {value}
                {unit && (
                  <span className="ml-0.5 font-sans text-[0.8125rem] font-medium text-[var(--ink-secondary)]">
                    {unit}
                  </span>
                )}
              </p>
              {trendDisplay && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 text-[13px] font-medium",
                    trendColors[trendColorDirection],
                  )}
                >
                  <TrendArrow direction={resolvedTrendDirection} />
                  {trendDisplay}
                </span>
              )}
            </div>
          </div>

          {icon && (
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-[var(--radius-md,10px)]",
                status
                  ? iconBgByStatus[status]
                  : iconBgByVariant[resolvedVariant],
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  },
);

StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };
export type { MetricStatus, TrendDirection };
