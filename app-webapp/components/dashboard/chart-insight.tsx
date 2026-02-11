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
        "flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
        trend === "positive" &&
          "bg-emerald-50/50 border-emerald-100 text-emerald-900",
        trend === "negative" &&
          "bg-amber-50/50 border-amber-100 text-amber-900",
        trend === "neutral" && "bg-gray-50/50 border-gray-100 text-gray-700",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset",
          trend === "positive" &&
            "bg-emerald-100 text-emerald-600 ring-emerald-200",
          trend === "negative" && "bg-amber-100 text-amber-600 ring-amber-200",
          trend === "neutral" && "bg-gray-100 text-gray-500 ring-gray-200",
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
