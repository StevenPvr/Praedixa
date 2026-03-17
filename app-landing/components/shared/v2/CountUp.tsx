"use client";

import { useEffect, useRef } from "react";
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  motion,
  animate,
} from "framer-motion";
import { cn } from "../../../lib/utils";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export function CountUp({
  end,
  duration = 0.9,
  prefix,
  suffix,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const reducedMotion = useReducedMotion();

  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (latest) => Math.round(latest));

  useEffect(() => {
    if (!isInView) return;
    if (reducedMotion) {
      motionVal.set(end);
      return;
    }

    const controls = animate(motionVal, end, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [isInView, reducedMotion, end, duration, motionVal]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
