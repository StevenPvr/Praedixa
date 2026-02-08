// Compact metric indicator card (simpler than StatCard)
import * as React from "react";
import { cn } from "../utils/cn";

export type MetricStatus = "good" | "warning" | "danger" | "neutral";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
}

const statusDotColor: Record<MetricStatus, string> = {
  good: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-gray-400",
};

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, unit, status = "neutral", className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            statusDotColor[status],
          )}
          aria-label={`Statut: ${status}`}
        />
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">{label}</span>
          <span className="text-base font-bold text-charcoal">
            {value}
            {unit && (
              <span className="ml-0.5 text-sm font-normal text-gray-400">
                {unit}
              </span>
            )}
          </span>
        </div>
      </div>
    );
  },
);

MetricCard.displayName = "MetricCard";

export { MetricCard, statusDotColor };
