"use client";

import { Lightbulb } from "lucide-react";
import { cn } from "@praedixa/ui";

interface ChartInsightProps {
  insight: string;
  trend?: "positive" | "negative" | "neutral";
  className?: string;
}

export function ChartInsight({
  insight,
  trend = "neutral",
  className,
}: ChartInsightProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-sm transition-colors",
        trend === "positive" &&
          "bg-emerald-50/50 border-emerald-100 text-emerald-900",
        trend === "negative" && "bg-red-50/50 border-red-100 text-red-900",
        trend === "neutral" && "bg-surface-alt border-border text-ink",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
          trend === "positive" &&
            "bg-emerald-100 text-emerald-600 ring-emerald-200",
          trend === "negative" && "bg-red-100 text-red-600 ring-red-200",
          trend === "neutral" && "bg-border text-ink-secondary ring-border",
        )}
      >
        <Lightbulb className="h-3 w-3" />
      </div>
      <div className="flex-1">
        <p className="font-medium leading-tight">Analyse</p>
        <p className="mt-1 text-xs opacity-90 leading-relaxed">{insight}</p>
      </div>
    </div>
  );
}
