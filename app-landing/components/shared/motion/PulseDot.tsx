"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "../../../lib/utils";

interface PulseDotProps {
  className?: string;
  duration?: number;
  maxScale?: number;
}

function PulseDotInner({
  className,
  duration = 2.2,
  maxScale = 1.35,
}: PulseDotProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.span
      aria-hidden="true"
      className={cn("inline-flex h-2 w-2 rounded-full bg-brass-400", className)}
      animate={
        reducedMotion
          ? undefined
          : {
              scale: [1, maxScale, 1],
              opacity: [0.55, 1, 0.55],
            }
      }
      transition={{
        duration,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        type: "tween",
      }}
    />
  );
}

export const PulseDot = memo(PulseDotInner);
