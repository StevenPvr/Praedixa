"use client";

import { useEffect, useRef, useState } from "react";
import { DURATION } from "@/lib/animations/config";

/**
 * Animates a number from 0 to `target` over `duration` ms.
 * Returns `target` immediately when prefers-reduced-motion is enabled.
 */
export function useAnimatedNumber(
  target: number,
  duration: number = DURATION.number * 1000,
): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setCurrent(target);
      return;
    }

    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setCurrent(Math.round(target * progress));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return current;
}
