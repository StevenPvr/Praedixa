"use client";

import { motion } from "framer-motion";
import { cn } from "@praedixa/ui";
import { DURATION, EASING } from "@/lib/animations/config";

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  /** Display value inside the ring */
  showValue?: boolean;
  /** Color variant */
  color?: "brand" | "success" | "warning" | "danger" | "accent";
}

const colorMap = {
  brand: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  accent: "text-accent",
};

export function ProgressRing({
  value,
  max = 100,
  size = 64,
  strokeWidth = 5,
  className,
  label,
  showValue = false,
  color = "brand",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const offset = circumference * (1 - percentage);
  const displayValue = Math.round(percentage * 100);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border opacity-30"
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: DURATION.cinematic,
            ease: EASING.premium,
          }}
          className={colorMap[color]}
        />
      </svg>

      {showValue && (
        <span className="absolute text-title-sm tabular-nums text-ink">
          {displayValue}
          <span className="text-caption text-ink-tertiary">%</span>
        </span>
      )}
    </div>
  );
}
