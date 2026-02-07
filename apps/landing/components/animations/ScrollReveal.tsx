"use client";

import { ReactNode, ElementType, createElement } from "react";
import { motion, Variants } from "framer-motion";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { easingCurves, durations } from "../../lib/animations/config";

type RevealVariant =
  | "fadeUp"
  | "fadeIn"
  | "scaleIn"
  | "slideLeft"
  | "slideRight";

interface ScrollRevealProps {
  children: ReactNode;
  /** Animation variant to use */
  variant?: RevealVariant;
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** Animation duration (seconds) */
  duration?: number;
  /** Additional CSS classes */
  className?: string;
  /** HTML element to render as */
  as?: ElementType;
  /** Threshold for triggering reveal (0-1) */
  threshold?: number;
  /** Only animate once */
  once?: boolean;
}

const distance = 60;

const variants: Record<RevealVariant, Variants> = {
  fadeUp: {
    hidden: { opacity: 0, y: distance },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  },
  slideLeft: {
    hidden: { opacity: 0, x: distance },
    visible: { opacity: 1, x: 0 },
  },
  slideRight: {
    hidden: { opacity: 0, x: -distance },
    visible: { opacity: 1, x: 0 },
  },
};

/**
 * Scroll-triggered reveal animation component.
 * Animates children when they enter the viewport.
 * Respects prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  variant = "fadeUp",
  delay = 0,
  duration = durations.slow,
  className = "",
  as = "div",
  threshold = 0.2,
  once = true,
}: ScrollRevealProps) {
  const { ref, isRevealed } = useScrollReveal<HTMLDivElement>({
    threshold,
    once,
  });
  const prefersReducedMotion = useReducedMotion();

  const MotionComponent = motion[
    as as keyof typeof motion
  ] as typeof motion.div;

  // If reduced motion, render without animation
  if (prefersReducedMotion) {
    return createElement(as, { className }, children);
  }

  return (
    <MotionComponent
      ref={ref}
      className={className}
      initial="hidden"
      /* v8 ignore next -- framer-motion prop stripped by mock */
      animate={isRevealed ? "visible" : "hidden"}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: easingCurves.smoothOut,
      }}
    >
      {children}
    </MotionComponent>
  );
}
