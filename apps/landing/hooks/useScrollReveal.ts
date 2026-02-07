"use client";

import { useRef, useState, useEffect } from "react";
import {
  useInView,
  useScroll,
  useTransform,
  MotionValue,
  UseInViewOptions,
} from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

type MarginType = UseInViewOptions["margin"];

interface ScrollRevealOptions {
  /** Threshold for triggering reveal (0-1), default 0.2 */
  threshold?: number;
  /** Only trigger once, default true */
  once?: boolean;
  /** Root margin for intersection observer, default "-10% 0px -10% 0px" */
  rootMargin?: MarginType;
}

interface ScrollRevealReturn<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  isRevealed: boolean;
  progress: MotionValue<number>;
}

/**
 * Hook for scroll-triggered reveal animations.
 * Returns a ref to attach, revealed state, and scroll progress.
 * Respects prefers-reduced-motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
): ScrollRevealReturn<T> {
  const {
    threshold = 0.2,
    once = true,
    rootMargin = "-10% 0px -10% 0px",
  } = options;

  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  const [isRevealed, setIsRevealed] = useState(prefersReducedMotion);

  const isInView = useInView(ref, {
    amount: threshold,
    once,
    margin: rootMargin,
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  // Map scroll progress to 0-1 range within viewport
  const progress = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsRevealed(true);
      return;
    }

    if (isInView) {
      setIsRevealed(true);
    }
  }, [isInView, prefersReducedMotion]);

  return { ref, isRevealed, progress };
}
