"use client";

import { useRef } from "react";
import { useScroll, useTransform, MotionValue } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

interface ParallaxOptions {
  /** Speed of parallax effect (-1 to 1), default 0.2 */
  speed?: number;
  /** Direction of parallax movement, default 'y' */
  direction?: "y" | "x";
}

interface ParallaxReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  value: MotionValue<number>;
}

/**
 * Hook for creating parallax scroll effects.
 * Returns a ref and a MotionValue to apply to style.
 * Disabled when prefers-reduced-motion is enabled.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  options: ParallaxOptions = {},
): ParallaxReturn<T> {
  const { speed = 0.2 } = options;

  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Calculate parallax offset based on speed
  // speed > 0: element moves slower (appears to move up as page scrolls)
  // speed < 0: element moves faster (appears to move down)
  const range = prefersReducedMotion ? 0 : speed * 100;

  const value = useTransform(scrollYProgress, [0, 1], [range, -range]);

  return { ref, value };
}
