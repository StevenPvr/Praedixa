"use client";

import { cn } from "@praedixa/ui";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  label?: string;
  className?: string;
  inverted?: boolean;
  /** Show as a pill badge */
  pill?: boolean;
}

export function TrendIndicator({
  value,
  label,
  className,
  inverted = false,
  pill = false,
}: TrendIndicatorProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNeutral = value === 0;

  const formatted = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        isNeutral && "text-ink-tertiary",
        !isNeutral && isPositive && "text-success-text",
        !isNeutral && !isPositive && "text-danger-text",
        pill && [
          "rounded-full px-2 py-0.5",
          isNeutral && "bg-surface-sunken",
          !isNeutral && isPositive && "bg-success-light",
          !isNeutral && !isPositive && "bg-danger-light",
        ],
        className,
      )}
    >
      {isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {formatted}
      {label && <span className="text-ink-tertiary">{label}</span>}
    </span>
  );
}
