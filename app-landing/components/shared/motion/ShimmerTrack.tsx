"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../../lib/utils";

interface ShimmerTrackProps {
  className?: string;
  indicatorClassName?: string;
  duration?: number;
}

function ShimmerTrackInner({
  className,
  indicatorClassName,
  duration = 2.3,
}: ShimmerTrackProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-1.5 overflow-hidden rounded-full bg-white/10",
        className,
      )}
    >
      <motion.span
        className={cn(
          "absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent",
          indicatorClassName,
        )}
        {...(reducedMotion ? {} : { animate: { x: ["-120%", "220%"] } })}
        transition={{
          duration,
          repeat: 3,
          ease: "easeInOut",
          type: "tween",
        }}
      />
    </div>
  );
}

export const ShimmerTrack = memo(ShimmerTrackInner);
