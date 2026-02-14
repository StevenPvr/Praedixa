"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 (or previous value) to `target` using requestAnimationFrame.
 * Returns the current animated value.
 */
export function useCountUp(
  target: number,
  opts: { duration?: number; decimals?: number; enabled?: boolean } = {},
): number {
  const { duration = 500, decimals = 0, enabled = true } = opts;
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const factor = Math.pow(10, decimals);

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * eased;
      setValue(Math.round(current * factor) / factor);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
      }
    }

    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration, decimals, enabled]);

  return value;
}
