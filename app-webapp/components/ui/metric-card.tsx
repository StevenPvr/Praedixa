// Compact metric indicator card (simpler than StatCard)
import * as React from "react";
import { cn } from "@praedixa/ui";
import { Card } from "@/components/ui/card";

export type MetricStatus = "good" | "warning" | "danger" | "neutral";

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  status?: MetricStatus;
}

const statusDotColor: Record<MetricStatus, string> = {
  good: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-gray-300",
};

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, unit, status = "neutral", className, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(
          "inline-flex items-center gap-3 px-4 py-3 border border-gray-100",
          className,
        )}
        variant="flat"
        noPadding
        {...props}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full shadow-sm ring-2 ring-white",
            statusDotColor[status],
          )}
          aria-label={`Statut: ${status}`}
        />
        <div className="flex flex-col">
          <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wide">
            {label}
          </span>
          <span className="text-base font-bold text-ink font-heading">
            {value}
            {unit && (
              <span className="ml-0.5 text-sm font-normal text-ink-secondary">
                {unit}
              </span>
            )}
          </span>
        </div>
      </Card>
    );
  },
);

MetricCard.displayName = "MetricCard";

export { MetricCard, statusDotColor };
